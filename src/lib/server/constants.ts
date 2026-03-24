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

/** RSS feed URLs for government and news sources */
export const RSS_FEEDS = [
	// Press Information Bureau — Cyber/Tech section
	'https://pib.gov.in/RssMain.aspx?ModId=6&Lang=1&Regid=3',
	// CERT-In advisories
	'https://www.cert-in.org.in/Rss.jsp',
	// Times of India — Tech
	'https://timesofindia.indiatimes.com/rssfeeds/5880659.cms'
];

/** NewsAPI base URL */
export const NEWSAPI_BASE = 'https://newsapi.org/v2/everything';

/** Maximum articles to fetch per NewsAPI call */
export const MAX_ARTICLES_PER_FETCH = 20;
