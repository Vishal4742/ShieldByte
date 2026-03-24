<script lang="ts">
	import type { ThreatArticle } from '$lib/types/threat.js';

	let { article, index } = $props<{ article: ThreatArticle; index: number }>();

	const categoryLabels: Record<string, string> = {
		UPI_fraud: 'UPI Fraud',
		KYC_fraud: 'KYC Fraud',
		lottery_fraud: 'Lottery Fraud',
		job_scam: 'Job Scam',
		investment_fraud: 'Investment Fraud',
		customer_support_scam: 'Support Scam'
	};

	function formatDate(value: string | null): string {
		if (!value) return 'No publish date';

		return new Intl.DateTimeFormat('en-IN', {
			day: '2-digit',
			month: 'short',
			year: 'numeric'
		}).format(new Date(value));
	}
</script>

<article class="threat-card">
	<div class="threat-card__topline">
		<span>{String(index + 1).padStart(2, '0')}</span>
		<span>{categoryLabels[article.category] ?? article.category}</span>
	</div>

	<h3>{article.title}</h3>
	<p>{article.scenarioSummary}</p>

	<div class="threat-card__meta">
		<div>
			<span>Source</span>
			<strong>{article.source}</strong>
		</div>
		<div>
			<span>Channel</span>
			<strong>{article.channel}</strong>
		</div>
		<div>
			<span>Date</span>
			<strong>{formatDate(article.publishedAt)}</strong>
		</div>
	</div>

	<ul>
		{#each article.redFlags.slice(0, 3) as redFlag}
			<li>{redFlag}</li>
		{/each}
	</ul>

	<div class="threat-card__actions">
		<a href={`/articles/${article.id}`} class="threat-card__primary">Open intelligence brief</a>
		<a href={article.url} target="_blank" rel="noreferrer">Read source report</a>
	</div>
</article>

<style>
	.threat-card {
		display: grid;
		gap: 1rem;
		padding: 1.25rem;
		border: 1px solid var(--line-soft);
		background:
			linear-gradient(180deg, rgba(244, 172, 94, 0.08), rgba(255, 255, 255, 0)),
			rgba(8, 12, 20, 0.76);
		min-height: 100%;
	}

	.threat-card__topline,
	.threat-card__meta span,
	a {
		font-family: var(--font-mono);
		font-size: 0.72rem;
		text-transform: uppercase;
		letter-spacing: 0.18em;
		color: var(--text-muted);
	}

	.threat-card__topline {
		display: flex;
		justify-content: space-between;
		gap: 1rem;
		padding-bottom: 0.9rem;
		border-bottom: 1px solid rgba(255, 255, 255, 0.08);
	}

	h3 {
		font-family: var(--font-display);
		font-size: 2rem;
		font-weight: 500;
		line-height: 0.98;
	}

	p {
		color: var(--text-soft);
		line-height: 1.7;
	}

	.threat-card__meta {
		display: grid;
		grid-template-columns: repeat(3, minmax(0, 1fr));
		gap: 0.8rem;
	}

	.threat-card__meta strong {
		display: block;
		margin-top: 0.45rem;
		font-size: 0.95rem;
		line-height: 1.4;
	}

	ul {
		display: flex;
		flex-wrap: wrap;
		gap: 0.65rem;
		list-style: none;
		padding: 0;
		margin: 0;
	}

	li {
		padding: 0.45rem 0.8rem;
		border-radius: 999px;
		background: rgba(255, 255, 255, 0.06);
		color: var(--text-strong);
		font-size: 0.85rem;
	}

	a {
		display: inline-flex;
		align-items: center;
		gap: 0.6rem;
		width: fit-content;
		color: var(--accent-soft);
		text-decoration: none;
	}

	.threat-card__actions {
		display: flex;
		flex-wrap: wrap;
		gap: 1rem;
	}

	.threat-card__primary {
		color: var(--accent);
	}

	a:hover,
	a:focus-visible {
		color: var(--text-strong);
	}

	@media (max-width: 720px) {
		.threat-card__meta {
			grid-template-columns: 1fr;
		}
	}
</style>
