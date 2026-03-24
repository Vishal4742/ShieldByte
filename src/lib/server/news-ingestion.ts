/**
 * ShieldByte — News Ingestion Service
 * Fetches fraud-related articles from NewsAPI, RSS feeds, and web crawling,
 * deduplicates against existing DB entries, and stores new ones.
 */

import Parser from 'rss-parser';
import { supabase } from './supabase.js';
import {
	NEWS_KEYWORDS,
	RSS_FEEDS,
	NEWSAPI_BASE,
	MAX_ARTICLES_PER_FETCH
} from './constants.js';
import { NEWSAPI_KEY } from '$env/static/private';
import { crawlFraudNews } from './web-scraper.js';
import { analyzeFraudSignals } from './fraud-signals.js';
import type { FraudCategory } from './constants.js';

/** Shape of an article before DB insertion */
export interface RawArticle {
	source: string;
	title: string;
	body: string | null;
	url: string;
	published_at: string | null;
	source_type?: 'newsapi' | 'rss' | 'scraped';
	category_hint?: FraudCategory | null;
	relevance_score?: number;
	matched_keywords?: string[];
}

function sanitizeText(value: string | null | undefined): string {
	return (value ?? '').trim().replace(/\s+/g, ' ');
}

function enrichArticle(
	article: RawArticle,
	sourceType: RawArticle['source_type']
): RawArticle | null {
	const title = sanitizeText(article.title);
	const body = sanitizeText(article.body);
	const analysis = analyzeFraudSignals(title, body);

	if (!title || !article.url || !analysis.isFraudLike) {
		return null;
	}

	return {
		...article,
		title,
		body: body || null,
		url: article.url.trim(),
		source_type: sourceType,
		category_hint: analysis.categoryHint,
		relevance_score: analysis.relevanceScore,
		matched_keywords: analysis.matchedKeywords
	};
}

function deduplicateFetchedArticles(articles: RawArticle[]): RawArticle[] {
	const seenUrls = new Set<string>();
	const seenTitleSourceKeys = new Set<string>();
	const deduplicated: RawArticle[] = [];

	for (const article of articles) {
		const normalizedUrl = article.url.trim().toLowerCase();
		const normalizedTitle = sanitizeText(article.title).toLowerCase();
		const titleSourceKey = `${article.source.toLowerCase()}::${normalizedTitle}`;

		if (seenUrls.has(normalizedUrl) || seenTitleSourceKeys.has(titleSourceKey)) {
			continue;
		}

		seenUrls.add(normalizedUrl);
		seenTitleSourceKeys.add(titleSourceKey);
		deduplicated.push(article);
	}

	return deduplicated;
}

// ─── NewsAPI ────────────────────────────────────────────────

/**
 * Fetch fraud-related articles from NewsAPI.
 * Combines all keywords into a single OR-joined query.
 */
export async function fetchNewsAPI(): Promise<RawArticle[]> {
	if (!NEWSAPI_KEY) {
		console.warn('[ingest] NEWSAPI_KEY not set — skipping NewsAPI fetch.');
		return [];
	}

	const query = NEWS_KEYWORDS.map((kw) => `"${kw}"`).join(' OR ');

	const url = new URL(NEWSAPI_BASE);
	url.searchParams.set('q', query);
	url.searchParams.set('language', 'en');
	url.searchParams.set('sortBy', 'publishedAt');
	url.searchParams.set('pageSize', String(MAX_ARTICLES_PER_FETCH));
	url.searchParams.set('apiKey', NEWSAPI_KEY);

	try {
		const response = await fetch(url.toString());
		if (!response.ok) {
			const errText = await response.text();
			console.error(`[ingest] NewsAPI error (${response.status}): ${errText}`);
			return [];
		}

		const data = await response.json();
		const articles: RawArticle[] = (data.articles ?? []).map(
			(a: {
				source?: { name?: string };
				title?: string;
				description?: string;
				content?: string;
				url?: string;
				publishedAt?: string;
			}) => ({
				source: a.source?.name ?? 'NewsAPI',
				title: a.title ?? 'Untitled',
				body: a.description || a.content || null,
				url: a.url ?? '',
				published_at: a.publishedAt ?? null
			})
		);

		return articles
			.map((article: RawArticle) => enrichArticle(article, 'newsapi'))
			.filter((article): article is RawArticle => article !== null);
	} catch (err) {
		console.error('[ingest] NewsAPI fetch failed:', err);
		return [];
	}
}

// ─── RSS Feeds ──────────────────────────────────────────────

const rssParser = new Parser({
	timeout: 10000
});

/**
 * Fetch articles from all configured RSS feeds.
 */
export async function fetchRSSFeeds(): Promise<RawArticle[]> {
	const allArticles: RawArticle[] = [];

	for (const feed of RSS_FEEDS) {
		try {
			const parsedFeed = await rssParser.parseURL(feed.url);
			const articles: RawArticle[] = (parsedFeed.items ?? []).map((item) => ({
				source: parsedFeed.title ?? feed.label,
				title: item.title ?? 'Untitled',
				body: item.contentSnippet || item.content || null,
				url: item.link ?? '',
				published_at: item.isoDate ?? null
			}));

			allArticles.push(
				...articles
					.map((article: RawArticle) => enrichArticle(article, 'rss'))
					.filter((article): article is RawArticle => article !== null)
			);
		} catch (err) {
			console.warn(`[ingest] RSS feed failed (${feed.label}):`, err);
		}
	}

	return allArticles;
}

// ─── Deduplication & Storage ────────────────────────────────

/**
 * Filter out articles whose URLs already exist in the DB.
 */
export async function deduplicateArticles(articles: RawArticle[]): Promise<RawArticle[]> {
	if (articles.length === 0) return [];

	const fetchedArticles = deduplicateFetchedArticles(articles);
	if (fetchedArticles.length === 0) return [];

	const urls = fetchedArticles.map((a) => a.url);

	const { data: existing, error } = await supabase
		.from('fraud_articles')
		.select('url')
		.in('url', urls);

	if (error) {
		console.error('[ingest] Dedup query failed:', error.message);
		return fetchedArticles;
	}

	const existingUrls = new Set((existing ?? []).map((row: { url: string }) => row.url));
	return fetchedArticles.filter((a) => !existingUrls.has(a.url));
}

/**
 * Insert articles into the fraud_articles table.
 * Uses upsert with URL as conflict key to be safe.
 */
export async function storeArticles(
	articles: RawArticle[]
): Promise<{ inserted: number; errors: number }> {
	if (articles.length === 0) return { inserted: 0, errors: 0 };

	const rows = articles.map((a) => ({
		source: a.source,
		title: a.title,
		body: a.body,
		url: a.url,
		published_at: a.published_at,
		category_hint: a.category_hint ?? null,
		relevance_score: a.relevance_score ?? null,
		matched_keywords: a.matched_keywords ?? [],
		ingestion_source_type: a.source_type ?? 'rss',
		status: 'raw'
	}));

	const { data, error } = await supabase
		.from('fraud_articles')
		.upsert(rows, { onConflict: 'url', ignoreDuplicates: true })
		.select('id');

	if (error) {
		console.error('[ingest] Insert failed:', error.message);
		return { inserted: 0, errors: articles.length };
	}

	return { inserted: data?.length ?? 0, errors: 0 };
}

// ─── Main Ingestion Pipeline ────────────────────────────────

/**
 * Run the full ingestion pipeline:
 * 1. Fetch from NewsAPI + RSS + Web Crawling (all in parallel)
 * 2. Deduplicate against DB
 * 3. Store new articles
 */
export async function runIngestionPipeline(): Promise<{
	totalFetched: number;
	duplicates: number;
	inserted: number;
	errors: number;
	targetMet: boolean;
	runLogged: boolean;
	sources: { newsapi: number; rss: number; scraped: number };
}> {
	console.log('[ingest] Starting ingestion pipeline...');

	// 1. Fetch from ALL sources in parallel
	const [newsArticles, rssArticles, scrapedArticles] = await Promise.all([
		fetchNewsAPI(),
		fetchRSSFeeds(),
		crawlFraudNews()
	]);

	const allArticles = deduplicateFetchedArticles([...newsArticles, ...rssArticles, ...scrapedArticles]);
	console.log(
		`[ingest] Fetched ${allArticles.length} articles ` +
		`(${newsArticles.length} NewsAPI, ${rssArticles.length} RSS, ${scrapedArticles.length} scraped)`
	);

	// 2. Deduplicate
	const newArticles = await deduplicateArticles(allArticles);
	const duplicates = allArticles.length - newArticles.length;
	console.log(`[ingest] ${newArticles.length} new articles (${duplicates} duplicates filtered)`);

	// 3. Store
	const result = await storeArticles(newArticles);
	console.log(`[ingest] Stored ${result.inserted} articles (${result.errors} errors)`);
	const targetMet = result.inserted >= 5;

	if (!targetMet) {
		console.warn(
			`[ingest] Daily target not met: inserted ${result.inserted} new articles, target is 5.`
		);
	}

	const { error: runLogError } = await supabase.from('ingestion_runs').insert({
		source_newsapi: newsArticles.length,
		source_rss: rssArticles.length,
		source_scraped: scrapedArticles.length,
		total_fetched: allArticles.length,
		duplicates,
		inserted: result.inserted,
		errors: result.errors,
		target_met: targetMet
	});

	if (runLogError) {
		console.error('[ingest] Failed to log ingestion run:', runLogError.message);
	}

	return {
		totalFetched: allArticles.length,
		duplicates,
		inserted: result.inserted,
		errors: result.errors,
		targetMet,
		runLogged: !runLogError,
		sources: {
			newsapi: newsArticles.length,
			rss: rssArticles.length,
			scraped: scrapedArticles.length
		}
	};
}
