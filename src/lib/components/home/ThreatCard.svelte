<script lang="ts">
	import type { ThreatArticle } from '$lib/types/threat.js';

	let { article, index }: { article: ThreatArticle; index: number } = $props();

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

	function confidenceBand(value: number | null): string {
		if (value === null) return 'Review';
		if (value >= 0.9) return 'Critical';
		if (value >= 0.75) return 'High';
		return 'Tracked';
	}
</script>

<article class="threat-card">
	<div class="threat-card__header">
		<div class="threat-card__index">
			<span>Round</span>
			<strong>{String(index + 1).padStart(2, '0')}</strong>
		</div>

		<div class="threat-card__status">
			<span>{confidenceBand(article.confidence)}</span>
			<strong>{categoryLabels[article.category] ?? article.category}</strong>
		</div>
	</div>

	<div class="threat-card__body">
		<h3>{article.title}</h3>
		<p>{article.scenarioSummary}</p>
	</div>

	<div class="threat-card__matrix">
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

	<ul class="threat-card__tags">
		{#each article.redFlags.slice(0, 3) as redFlag}
			<li>{redFlag}</li>
		{/each}
	</ul>

	<div class="threat-card__footer">
		<a
			href={`/play?article=${article.id}&type=${encodeURIComponent(article.category)}`}
			class="threat-card__primary"
		>
			Deploy mission
		</a>
		<a href={`/articles/${article.id}`}>Open dossier</a>
	</div>
</article>

<style>
	.threat-card {
		position: relative;
		display: grid;
		gap: 1rem;
		padding: 1.2rem;
		border: 1px solid var(--panel-border);
		border-radius: 1.2rem;
		background:
			linear-gradient(140deg, rgba(255, 255, 255, 0.05), transparent 35%),
			radial-gradient(circle at bottom right, rgba(237, 161, 103, 0.06), transparent 22%),
			linear-gradient(180deg, rgba(255, 255, 255, 0.04), rgba(255, 255, 255, 0.01)),
			var(--surface-1);
		min-height: 100%;
		box-shadow: var(--shadow-hud);
		transition:
			transform 180ms ease,
			border-color 180ms ease,
			box-shadow 180ms ease;
	}

	.threat-card:hover,
	.threat-card:focus-within {
		transform: translateY(-2px);
		border-color: var(--line-strong);
		box-shadow: 0 18px 40px rgba(0, 0, 0, 0.22);
	}

	.threat-card__header,
	.threat-card__matrix,
	.threat-card__footer {
		display: flex;
		justify-content: space-between;
		gap: 1rem;
		align-items: flex-start;
	}

	.threat-card__index span,
	.threat-card__status span,
	.threat-card__matrix span,
	.threat-card__footer a {
		font-family: var(--font-mono);
		font-size: 0.68rem;
		text-transform: uppercase;
		letter-spacing: 0.18em;
		color: var(--text-muted);
		text-decoration: none;
	}

	.threat-card__index strong,
	.threat-card__status strong,
	.threat-card__matrix strong {
		display: block;
		margin-top: 0.45rem;
		color: var(--text-strong);
	}

	.threat-card__index strong {
		font-family: var(--font-display);
		font-size: 2rem;
		font-weight: 700;
		line-height: 1;
		color: var(--accent-soft);
	}

	.threat-card__status {
		text-align: right;
	}

	.threat-card__status strong {
		max-width: 10rem;
		font-size: 0.92rem;
		line-height: 1.35;
	}

	.threat-card__body h3 {
		margin: 0;
		font-family: var(--font-display);
		font-size: clamp(1.8rem, 4vw, 2.5rem);
		font-weight: 700;
		line-height: 0.96;
		text-transform: uppercase;
	}

	.threat-card__body p {
		margin: 0.8rem 0 0;
		color: var(--text-soft);
		line-height: 1.75;
	}

	.threat-card__matrix {
		display: grid;
		grid-template-columns: repeat(3, minmax(0, 1fr));
	}

	.threat-card__tags {
		display: flex;
		flex-wrap: wrap;
		gap: 0.65rem;
		list-style: none;
		padding: 0;
		margin: 0;
	}

	.threat-card__tags li {
		padding: 0.45rem 0.75rem;
		background: rgba(255, 255, 255, 0.05);
		border: 1px solid rgba(255, 255, 255, 0.12);
		border-radius: 999px;
		color: var(--text-strong);
		font-size: 0.82rem;
	}

	.threat-card__footer {
		border-top: 1px solid rgba(255, 255, 255, 0.08);
		padding-top: 1rem;
	}

	.threat-card__primary {
		color: var(--accent-soft);
	}

	.threat-card__footer a:hover,
	.threat-card__footer a:focus-visible {
		color: var(--text-strong);
	}

	@media (max-width: 720px) {
		.threat-card {
			padding: 1rem;
			border-radius: 1rem;
		}

		.threat-card__index span,
		.threat-card__status span,
		.threat-card__matrix span,
		.threat-card__footer a {
			font-size: 0.62rem;
			letter-spacing: 0.14em;
		}

		.threat-card__header,
		.threat-card__footer {
			flex-direction: column;
		}

		.threat-card__status {
			text-align: left;
		}

		.threat-card__matrix {
			grid-template-columns: 1fr;
			gap: 0.85rem;
		}
	}

	@media (max-width: 480px) {
		.threat-card__body h3 {
			font-size: 1.65rem;
		}

		.threat-card__tags li {
			font-size: 0.74rem;
			padding: 0.38rem 0.62rem;
		}
	}
</style>
