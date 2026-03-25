<script lang="ts">
	import type { PageData } from './$types';
	import { formatPublishedDate } from '$lib/formatters/date.js';

	let { data }: { data: PageData } = $props();
	const article = $derived(data.article);

	const categoryLabels: Record<string, string> = {
		UPI_fraud: 'UPI Fraud',
		KYC_fraud: 'KYC Fraud',
		lottery_fraud: 'Lottery Fraud',
		job_scam: 'Job Scam',
		investment_fraud: 'Investment Fraud',
		customer_support_scam: 'Support Scam'
	};

	const clueLabels: Record<string, string> = {
		urgency: 'Urgency',
		fake_link: 'Fake Link',
		unknown_sender: 'Unknown Sender',
		credential_request: 'Credential Request',
		too_good: 'Too Good To Be True',
		fake_authority: 'Fake Authority',
		upfront_fee: 'Upfront Fee',
		signal: 'Signal'
	};

	function formatConfidence(value: number | null): string {
		if (value === null) return 'N/A';
		return `${Math.round(value * 100)}%`;
	}
</script>

<svelte:head>
	<title>{article.title} | ShieldByte Dossier</title>
	<meta name="description" content={article.scenarioSummary} />
</svelte:head>

<div class="dossier-shell">
	<header class="dossier-hero">
		<div class="dossier-hero__copy">
			<p class="mono-label">Mission dossier</p>
			<h1>{article.title}</h1>
			<p class="dossier-hero__summary">{article.scenarioSummary}</p>

			<div class="dossier-hero__actions">
				<a href={`/play?article=${article.id}&type=${encodeURIComponent(article.category)}`} class="dossier-cta">
					Play this case
				</a>
				<a href={article.url} target="_blank" rel="noreferrer" class="dossier-cta dossier-cta--ghost">
					Open source report
				</a>
			</div>
		</div>

		<div class="dossier-hero__meta">
			<article>
				<span class="mono-label">Category</span>
				<strong>{categoryLabels[article.category] ?? article.category}</strong>
			</article>
			<article>
				<span class="mono-label">Published</span>
				<strong>{formatPublishedDate(article.publishedAt)}</strong>
			</article>
			<article>
				<span class="mono-label">Classifier read</span>
				<strong>{formatConfidence(article.confidence)}</strong>
			</article>
			<article>
				<span class="mono-label">Channel</span>
				<strong>{article.channel}</strong>
			</article>
		</div>
	</header>

	<main class="dossier-grid">
		<section class="dossier-panel">
			<div class="section-header">
				<div>
					<p class="mono-label">Signal board</p>
					<h2>What the player should catch</h2>
				</div>
			</div>

			<div class="clue-grid">
				{#each article.clues as clue, index}
					<article class="clue-card">
						<div class="clue-card__top">
							<span class="mono-label">{String(index + 1).padStart(2, '0')}</span>
							<span class="mono-label">{clueLabels[clue.type] ?? clue.type}</span>
						</div>
						<h3>{clue.clueText}</h3>
						<p>{clue.explanation}</p>
					</article>
				{/each}
			</div>
		</section>

		<aside class="dossier-sidebar">
			<section class="dossier-panel">
				<p class="mono-label">Victim profile</p>
				<p>{article.victimProfile}</p>
			</section>

			<section class="dossier-panel">
				<p class="mono-label">Defensive tip</p>
				<p>{article.tip}</p>
			</section>

			<section class="dossier-panel">
				<p class="mono-label">Live flags</p>
				<ul class="chips">
					{#each article.redFlags as redFlag}
						<li>{redFlag}</li>
					{/each}
				</ul>
			</section>
		</aside>

		<section class="dossier-panel dossier-panel--wide">
			<div class="section-header">
				<div>
					<p class="mono-label">Source transcript</p>
					<h2>Underlying case text</h2>
				</div>
			</div>
			<div class="body-copy">{article.body}</div>
		</section>

		<section class="dossier-panel dossier-panel--wide">
			<div class="section-header">
				<div>
					<p class="mono-label">Parser log</p>
					<h2>Captured structured fields</h2>
				</div>
			</div>

			{#if article.rawExtractionFields.length > 0}
				<div class="field-grid">
					{#each article.rawExtractionFields as field}
						<article class="field-card">
							<span class="mono-label">{field.label}</span>
							{#if Array.isArray(field.value)}
								<ul>
									{#each field.value as item}
										<li>{item}</li>
									{/each}
								</ul>
							{:else}
								<p>{field.value}</p>
							{/if}
						</article>
					{/each}
				</div>
			{:else}
				<p class="empty-copy">No structured extraction fields were available for this dossier.</p>
			{/if}
		</section>
	</main>
</div>

<style>
	.dossier-shell {
		max-width: 1200px;
		margin: 0 auto;
		padding: 1.5rem clamp(1rem, 4vw, 3rem) 4rem;
	}

	.mono-label {
		margin: 0;
		font-family: var(--font-mono);
		font-size: 0.68rem;
		letter-spacing: 0.18em;
		text-transform: uppercase;
		color: var(--text-muted);
	}

	.dossier-hero,
	.dossier-panel,
	.clue-card,
	.field-card {
		border: 1px solid rgba(10, 10, 10, 0.1);
		border-radius: 1.2rem;
		background:
			radial-gradient(circle at top right, rgba(230, 57, 70, 0.06), transparent 24%),
			linear-gradient(180deg, rgba(255, 255, 255, 0.28), rgba(255, 255, 255, 0.12)),
			var(--surface-1);
		box-shadow: var(--shadow-hud);
	}

	.dossier-hero {
		display: flex;
		flex-direction: column;
		gap: 1.25rem;
		padding: 1.25rem;
	}

	.dossier-hero__copy h1,
	.section-header h2,
	.clue-card h3 {
		margin: 0.45rem 0 0;
		font-family: var(--font-display);
		line-height: 0.98;
		font-weight: 600;
	}

	.dossier-hero__copy h1 {
		font-size: clamp(2.4rem, 5vw, 4.5rem);
		max-width: 14ch;
	}

	.dossier-hero__summary,
	.dossier-panel p,
	.clue-card p,
	.body-copy,
	.field-card p,
	.field-card li,
	.empty-copy {
		color: var(--text-soft);
		line-height: 1.72;
	}

	.dossier-hero__summary {
		max-width: 38rem;
		margin: 0.85rem 0 0;
		font-size: 1rem;
	}

	.dossier-hero__actions {
		display: flex;
		flex-wrap: wrap;
		gap: 0.8rem;
		margin-top: 1.15rem;
	}

	.dossier-cta {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		min-height: 3rem;
		padding: 0 1.2rem;
		border-radius: 999px;
		background: linear-gradient(135deg, var(--accent-cyan), var(--accent-hot));
		color: #f4f4f2;
		font-family: var(--font-mono);
		font-size: 0.7rem;
		font-weight: 600;
		letter-spacing: 0.16em;
		text-transform: uppercase;
		text-decoration: none;
	}

	.dossier-cta--ghost {
		background: transparent;
		border: 1px solid rgba(10, 10, 10, 0.12);
		color: var(--text-strong);
	}

	.dossier-hero__meta {
		display: grid;
		grid-template-columns: repeat(4, minmax(0, 1fr));
		gap: 0.8rem;
	}

	.dossier-hero__meta article {
		padding: 0.85rem;
		border: 1px solid rgba(10, 10, 10, 0.08);
		border-radius: 1rem;
		background: rgba(255, 255, 255, 0.025);
	}

	.dossier-hero__meta strong {
		display: block;
		margin-top: 0.35rem;
		font-family: var(--font-display);
		font-size: 1.35rem;
		font-weight: 600;
		line-height: 1.05;
	}

	.dossier-grid {
		display: grid;
		grid-template-columns: minmax(0, 1.15fr) minmax(18rem, 0.85fr);
		gap: 1rem;
		margin-top: 1rem;
		align-items: start;
	}

	.dossier-sidebar {
		display: grid;
		gap: 1rem;
	}

	.dossier-panel {
		padding: 1.2rem;
	}

	.dossier-panel--wide {
		grid-column: 1 / -1;
	}

	.section-header {
		margin-bottom: 1rem;
	}

	.section-header h2 {
		font-size: clamp(1.9rem, 4vw, 2.9rem);
	}

	.clue-grid,
	.field-grid {
		display: grid;
		grid-template-columns: repeat(3, minmax(0, 1fr));
		gap: 0.85rem;
	}

	.clue-card,
	.field-card {
		padding: 1rem;
	}

	.clue-card__top {
		display: flex;
		justify-content: space-between;
		gap: 0.8rem;
	}

	.clue-card h3 {
		font-size: 1.45rem;
	}

	.chips,
	.field-card ul {
		display: flex;
		flex-wrap: wrap;
		gap: 0.55rem;
		padding: 0;
		margin: 0.75rem 0 0;
		list-style: none;
	}

	.chips li,
	.field-card li {
		padding: 0.38rem 0.7rem;
		border: 1px solid rgba(10, 10, 10, 0.08);
		border-radius: 999px;
		background: rgba(255, 255, 255, 0.2);
	}

	.body-copy {
		white-space: pre-wrap;
	}

	@media (max-width: 980px) {
		.dossier-grid,
		.clue-grid,
		.field-grid {
			grid-template-columns: 1fr;
		}
	}

	@media (max-width: 720px) {
		.dossier-shell {
			padding: 1rem 0.9rem 3rem;
		}

		.dossier-hero,
		.dossier-panel,
		.clue-card,
		.field-card {
			padding: 1rem;
			border-radius: 1rem;
		}

		.dossier-hero__meta {
			grid-template-columns: 1fr 1fr;
		}

		.dossier-hero__actions {
			flex-direction: column;
		}
	}
</style>
