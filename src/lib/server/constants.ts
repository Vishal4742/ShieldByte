/**
 * ShieldByte — Phase 1 Constants
 * Fraud categories, search keywords, and RSS feed URLs.
 */

/** The 6 fraud categories defined in the SRS */
export const FRAUD_CATEGORIES = [
	'UPI_fraud',
	'KYC_fraud',
	'lottery_fraud',
	'job_scam',
	'investment_fraud',
	'customer_support_scam'
] as const;

export type FraudCategory = (typeof FRAUD_CATEGORIES)[number];

/** Keywords used to query NewsAPI for fraud-related articles */
export const NEWS_KEYWORDS = [
	'UPI fraud India',
	'KYC scam India',
	'lottery fraud India',
	'phishing India',
	'fake job offer scam',
	'investment fraud India',
	'customer support scam India',
	'cyber fraud India',
	'online scam India',
	'digital payment fraud'
];

export interface RssFeedSource {
	label: string;
	url: string;
}

/** RSS feed URLs for government, news, and community scam-report sources */
export const RSS_FEEDS: RssFeedSource[] = [
	{
		label: 'PIB Cyber/Tech',
		url: 'https://pib.gov.in/RssMain.aspx?ModId=6&Lang=1&Regid=3'
	},
	{
		label: 'CERT-In Advisories',
		url: 'https://www.cert-in.org.in/Rss.jsp'
	},
	{
		label: 'Times of India Tech',
		url: 'https://timesofindia.indiatimes.com/rssfeeds/5880659.cms'
	},
	{
		label: 'Reddit r/Scams New',
		url: 'https://www.reddit.com/r/Scams/new/.rss'
	},
	{
		label: 'Reddit r/IndiaTech Scam Search',
		url: 'https://www.reddit.com/r/IndiaTech/search.rss?q=scam&restrict_sr=1&sort=new'
	},
	{
		label: 'Reddit r/personalfinanceindia Fraud Search',
		url: 'https://www.reddit.com/r/personalfinanceindia/search.rss?q=fraud%20OR%20scam&restrict_sr=1&sort=new'
	}
];

/** NewsAPI base URL */
export const NEWSAPI_BASE = 'https://newsapi.org/v2/everything';

/** Maximum articles to fetch per NewsAPI call */
export const MAX_ARTICLES_PER_FETCH = 20;
