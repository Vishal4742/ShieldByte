/**
 * ShieldByte — Web Scraper Service
 * Crawls Indian cybercrime portals and news websites for live fraud news.
 * Uses cheerio for HTML parsing — no headless browser needed.
 */

import * as cheerio from 'cheerio';
import type { RawArticle } from './news-ingestion.js';

// ─── Scraper Config ─────────────────────────────────────────

interface ScraperConfig {
	name: string;
	url: string;
	/** CSS selector for article link containers */
	articleSelector: string;
	/** CSS selector for the link within each article container */
	linkSelector: string;
	/** CSS selector for the title (optional, fallback to link text) */
	titleSelector?: string;
	/** CSS selector for description/snippet */
	descriptionSelector?: string;
	/** Base URL for relative links */
	baseUrl: string;
	/** Keyword filter — only include articles matching these */
	keywords: string[];
}

/** Configured scraper targets for Indian cybercrime & fraud news */
const SCRAPER_CONFIGS: ScraperConfig[] = [
	{
		name: 'CERT-In Advisories',
		url: 'https://www.cert-in.org.in/',
		articleSelector: '.advisory-list li, .content-area a, table tr',
		linkSelector: 'a',
		baseUrl: 'https://www.cert-in.org.in',
		keywords: ['fraud', 'phishing', 'scam', 'cyber', 'malware', 'vulnerability', 'advisory']
	},
	{
		name: 'Times of India - Cybercrime',
		url: 'https://timesofindia.indiatimes.com/topic/cyber-fraud',
		articleSelector: '.uwU81 .fHv_i, .col_l_6 .iN5CR',
		linkSelector: 'a',
		titleSelector: '.fHv_i a, .iN5CR a',
		descriptionSelector: '.WlhLR, .oxXSK',
		baseUrl: 'https://timesofindia.indiatimes.com',
		keywords: ['fraud', 'scam', 'cyber', 'UPI', 'phishing', 'KYC', 'online', 'digital']
	},
	{
		name: 'NDTV - Cybercrime',
		url: 'https://www.ndtv.com/topic/cyber-fraud',
		articleSelector: '.news_Ede, .listng_pge .news_li',
		linkSelector: 'a',
		titleSelector: '.newsHdng a, .nws_ttl a',
		descriptionSelector: '.newsCont, .nws_txt',
		baseUrl: 'https://www.ndtv.com',
		keywords: ['fraud', 'scam', 'cyber', 'UPI', 'phishing', 'arrest', 'online']
	},
	{
		name: 'The Hindu - Cybercrime',
		url: 'https://www.thehindu.com/topic/Cyber_crime/',
		articleSelector: '.story-card, .element',
		linkSelector: 'a',
		titleSelector: '.title a, h3 a',
		descriptionSelector: '.intro, .story-card-text',
		baseUrl: 'https://www.thehindu.com',
		keywords: ['fraud', 'scam', 'cyber', 'arrest', 'UPI', 'phishing', 'cheating']
	},
	{
		name: 'Indian Express - Cybercrime',
		url: 'https://indianexpress.com/about/cyber-crime/',
		articleSelector: '.articles .title, .article-list .article',
		linkSelector: 'a',
		titleSelector: '.title a, h2 a',
		descriptionSelector: '.synopsis, .preview',
		baseUrl: 'https://indianexpress.com',
		keywords: ['fraud', 'scam', 'cyber', 'UPI', 'phishing', 'KYC', 'arrest', 'online']
	},
	{
		name: 'Moneycontrol - Fraud News',
		url: 'https://www.moneycontrol.com/news/tags/cyber-fraud.html',
		articleSelector: '.list_listing li, .clearfix li',
		linkSelector: 'a',
		titleSelector: 'h2 a, .title a',
		descriptionSelector: 'p',
		baseUrl: 'https://www.moneycontrol.com',
		keywords: ['fraud', 'scam', 'UPI', 'bank', 'phishing', 'cyber', 'digital']
	}
];

// ─── Scraper Logic ──────────────────────────────────────────

const FRAUD_KEYWORDS_REGEX = /fraud|scam|phishing|cyber.?crime|UPI|KYC|lottery|fake.?job|investment.?fraud|cheating|arrest|hack|malware|swindle|duped|lured|deceive/i;

/**
 * Fetch and parse a single page for article links.
 */
async function scrapeSite(config: ScraperConfig): Promise<RawArticle[]> {
	try {
		const response = await fetch(config.url, {
			headers: {
				'User-Agent':
					'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
				Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
				'Accept-Language': 'en-US,en;q=0.5'
			},
			signal: AbortSignal.timeout(15000) // 15s timeout
		});

		if (!response.ok) {
			console.warn(`[scraper] ${config.name}: HTTP ${response.status}`);
			return [];
		}

		const html = await response.text();
		const $ = cheerio.load(html);
		const articles: RawArticle[] = [];
		const seenUrls = new Set<string>();

		// Try the configured selectors
		$(config.articleSelector).each((_, element) => {
			try {
				const $el = $(element);

				// Get the link
				const $link = config.linkSelector ? $el.find(config.linkSelector).first() : $el;
				let href = $link.attr('href') || '';

				if (!href || href === '#' || href.startsWith('javascript:')) return;

				// Resolve relative URLs
				if (href.startsWith('/')) {
					href = config.baseUrl + href;
				}

				// Deduplicate within this scrape
				if (seenUrls.has(href)) return;
				seenUrls.add(href);

				// Get title
				const title =
					(config.titleSelector ? $el.find(config.titleSelector).first().text() : '') ||
					$link.text() ||
					'';

				const cleanTitle = title.trim().replace(/\s+/g, ' ');
				if (!cleanTitle || cleanTitle.length < 10) return;

				// Get description
				const description = config.descriptionSelector
					? $el.find(config.descriptionSelector).first().text().trim()
					: '';

				// Keyword filter — title or description must match fraud-related terms
				const combinedText = `${cleanTitle} ${description}`;
				if (!FRAUD_KEYWORDS_REGEX.test(combinedText)) return;

				articles.push({
					source: config.name,
					title: cleanTitle,
					body: description || null,
					url: href,
					published_at: null // We don't extract dates from scraping
				});
			} catch {
				// Skip individual article parsing errors
			}
		});

		// Fallback: If structured selectors didn't find much, try generic link scanning
		if (articles.length < 2) {
			$('a').each((_, element) => {
				const $a = $(element);
				const href = $a.attr('href') || '';
				const text = $a.text().trim().replace(/\s+/g, ' ');

				if (
					!href ||
					href === '#' ||
					href.startsWith('javascript:') ||
					text.length < 15 ||
					seenUrls.has(href)
				)
					return;

				const fullUrl = href.startsWith('/') ? config.baseUrl + href : href;

				// Only include if both URL and text suggest fraud content
				if (FRAUD_KEYWORDS_REGEX.test(text) && fullUrl.startsWith('http')) {
					seenUrls.add(href);
					articles.push({
						source: config.name,
						title: text,
						body: null,
						url: fullUrl,
						published_at: null
					});
				}
			});
		}

		console.log(`[scraper] ${config.name}: found ${articles.length} fraud articles`);
		return articles;
	} catch (err) {
		console.warn(`[scraper] ${config.name} failed:`, err);
		return [];
	}
}

// ─── Public API ─────────────────────────────────────────────

/**
 * Crawl all configured Indian cybercrime and news sources.
 * Returns deduplicated fraud-related articles.
 */
export async function crawlFraudNews(): Promise<RawArticle[]> {
	console.log(`[scraper] Crawling ${SCRAPER_CONFIGS.length} sources...`);

	// Scrape all sites in parallel (they're independent)
	const results = await Promise.allSettled(SCRAPER_CONFIGS.map((config) => scrapeSite(config)));

	const allArticles: RawArticle[] = [];
	const seenUrls = new Set<string>();

	for (const result of results) {
		if (result.status === 'fulfilled') {
			for (const article of result.value) {
				if (!seenUrls.has(article.url)) {
					seenUrls.add(article.url);
					allArticles.push(article);
				}
			}
		}
	}

	console.log(`[scraper] Total: ${allArticles.length} unique fraud articles from web crawling`);
	return allArticles;
}
