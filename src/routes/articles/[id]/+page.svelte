<script lang="ts">
	import type { PageData } from './$types';

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

	function formatDate(value: string | null): string {
		if (!value) return 'No publish date';

		return new Intl.DateTimeFormat('en-IN', {
			day: '2-digit',
			month: 'short',
			year: 'numeric'
		}).format(new Date(value));
	}

	function formatConfidence(value: number | null): string {
		if (value === null) return 'N/A';
		return `${Math.round(value * 100)}%`;
	}
</script>

<svelte:head>
	<title>{article.title} | ShieldByte Mission Dossier</title>
	<meta name="description" content={article.scenarioSummary} />
</svelte:head>

<div class="dossier-shell">
	<header class="dossier-head">
		<div>
			<p>Mission dossier</p>
			<h1>{article.title}</h1>
		</div>
		<div class="dossier-head__meta">
			<span>{categoryLabels[article.category] ?? article.category}</span>
			<span>{formatDate(article.publishedAt)}</span>
		</div>
	</header>

	<section class="dossier-hero">
		<div class="dossier-hero__summary">
			<p class="eyebrow">Round setup</p>
			<p class="lede">{article.scenarioSummary}</p>

			<div class="dossier-hero__actions">
				<a href={`/play?article=${article.id}&type=${encodeURIComponent(article.category)}`}>
					Deploy mission
				</a>
				<a href={article.url} target="_blank" rel="noreferrer" class="dossier-hero__secondary">
					Read source report
				</a>
			</div>
		</div>

		<div class="dossier-hero__scoreboard">
			<article>
				<span>Source</span>
				<strong>{article.source}</strong>
			</article>
			<article>
				<span>Channel</span>
				<strong>{article.channel}</strong>
			</article>
			<article>
				<span>Classifier read</span>
				<strong>{formatConfidence(article.confidence)}</strong>
			</article>
		</div>
	</section>

	<main class="dossier-grid">
		<aside class="sidebar">
			<section class="panel">
				<p class="panel__label">Target profile</p>
				<p>{article.victimProfile}</p>
			</section>

			<section class="panel">
				<p class="panel__label">Coach tip</p>
				<p>{article.tip}</p>
			</section>

			<section class="panel">
				<p class="panel__label">Live flags</p>
				<ul class="chips">
					{#each article.redFlags as redFlag}
						<li>{redFlag}</li>
					{/each}
				</ul>
			</section>
		</aside>

		<section class="panel panel--wide">
			<div class="section-heading">
				<p>Signal board</p>
				<h2>What players should catch in the round</h2>
			</div>

			<div class="clue-grid">
				{#each article.clues as clue, index}
					<article class="clue-card">
						<div class="clue-card__topline">
							<span>{String(index + 1).padStart(2, '0')}</span>
							<strong>{clueLabels[clue.type] ?? clue.type}</strong>
						</div>
						<h3>{clue.clueText}</h3>
						<p>{clue.explanation}</p>
					</article>
				{/each}
			</div>
		</section>

		<section class="panel panel--wide">
			<div class="section-heading">
				<p>Case transcript</p>
				<h2>Stored source copy behind the mission</h2>
			</div>

			<div class="body-copy">{article.body}</div>
		</section>

		<section class="panel panel--wide">
			<div class="section-heading">
				<p>Parser log</p>
				<h2>Structured fields captured from the article</h2>
			</div>

			{#if article.rawExtractionFields.length > 0}
				<div class="extraction-grid">
					{#each article.rawExtractionFields as field}
						<article class="field-card">
							<span>{field.label}</span>
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
		padding: 1.25rem clamp(1.2rem, 4vw, 3rem) 4rem;
	}

	.dossier-head,
	.dossier-head__meta,
	.section-heading,
	.clue-card__topline,
	.dossier-hero__actions {
		display: flex;
		justify-content: space-between;
		gap: 1rem;
		align-items: flex-start;
	}

	.dossier-head p,
	.dossier-head__meta span,
	.section-heading p,
	.panel__label,
	.eyebrow,
	.clue-card__topline span,
	.field-card span {
		font-family: var(--font-mono);
		font-size: 0.72rem;
		letter-spacing: 0.18em;
		text-transform: uppercase;
		color: var(--text-muted);
	}

	.dossier-head {
		margin-top: 0.3rem;
	}

	.dossier-head h1,
	.section-heading h2 {
		margin: 0.45rem 0 0;
		font-family: var(--font-display);
		font-size: clamp(2.6rem, 6vw, 5rem);
		font-weight: 500;
		line-height: 0.94;
	}

	.dossier-head__meta {
		flex-wrap: wrap;
	}

	.dossier-head__meta span,
	.dossier-hero__scoreboard article,
	.panel,
	.clue-card,
	.field-card {
		padding: 0.9rem 1rem;
		border: 1px solid var(--line-soft);
		background:
			linear-gradient(180deg, rgba(255, 255, 255, 0.04), rgba(255, 255, 255, 0.01)),
			var(--surface-1);
		box-shadow: var(--shadow-arcade);
	}

	.dossier-hero {
		display: grid;
		grid-template-columns: minmax(0, 1.2fr) minmax(18rem, 0.8fr);
		gap: 1rem;
		margin-top: 1rem;
	}

	.dossier-hero__summary,
	.dossier-hero__scoreboard {
		padding: 1.2rem;
		border: 1px solid var(--line-soft);
		background:
			radial-gradient(circle at top right, rgba(255, 183, 77, 0.1), transparent 24%),
			radial-gradient(circle at bottom left, rgba(114, 255, 214, 0.06), transparent 18%),
			linear-gradient(180deg, rgba(255, 255, 255, 0.04), rgba(255, 255, 255, 0.01)),
			var(--surface-2);
		box-shadow: var(--shadow-arcade);
	}

	.lede,
	.panel p,
	.clue-card p,
	.body-copy,
	.field-card p,
	.field-card li,
	.empty-copy {
		color: var(--text-soft);
		line-height: 1.75;
	}

	.lede {
		margin: 0.55rem 0 0;
		font-size: 1.02rem;
	}

	.dossier-hero__actions {
		margin-top: 1.4rem;
	}

	.dossier-hero__actions a {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		min-height: 3rem;
		padding: 0 1.2rem;
		text-decoration: none;
		font-family: var(--font-mono);
		font-size: 0.72rem;
		letter-spacing: 0.16em;
		text-transform: uppercase;
	}

	.dossier-hero__actions a:first-child {
		background: linear-gradient(135deg, var(--accent-gold), #ffd48a);
		color: #091018;
	}

	.dossier-hero__secondary {
		border: 1px solid rgba(255, 255, 255, 0.08);
		background: rgba(255, 255, 255, 0.03);
		color: var(--text-strong);
	}

	.dossier-hero__scoreboard {
		display: grid;
		gap: 0.85rem;
	}

	.dossier-hero__scoreboard span {
		font-family: var(--font-mono);
		font-size: 0.72rem;
		letter-spacing: 0.16em;
		text-transform: uppercase;
		color: var(--text-muted);
	}

	.dossier-hero__scoreboard strong {
		display: block;
		margin-top: 0.45rem;
		font-size: 1.1rem;
		color: var(--text-strong);
	}

	.dossier-grid {
		display: grid;
		grid-template-columns: minmax(0, 1.15fr) minmax(18rem, 0.85fr);
		gap: 1.25rem;
		margin-top: 1.25rem;
		align-items: start;
	}

	.sidebar {
		display: grid;
		gap: 1rem;
	}

	.panel--wide {
		grid-column: 1 / -1;
	}

	.clue-grid,
	.extraction-grid {
		display: grid;
		grid-template-columns: repeat(3, minmax(0, 1fr));
		gap: 1rem;
	}

	.clue-card h3 {
		margin: 0.9rem 0 0.6rem;
		font-size: 1.2rem;
	}

	.chips,
	.field-card ul {
		display: flex;
		flex-wrap: wrap;
		gap: 0.65rem;
		padding: 0;
		margin: 0;
		list-style: none;
	}

	.chips li,
	.field-card li {
		padding: 0.45rem 0.8rem;
		background: rgba(255, 255, 255, 0.05);
	}

	.body-copy {
		white-space: pre-wrap;
	}

	@media (max-width: 960px) {
		.dossier-head,
		.dossier-hero,
		.dossier-grid,
		.clue-grid,
		.extraction-grid {
			grid-template-columns: 1fr;
		}

		.dossier-head,
		.dossier-hero__actions {
			flex-direction: column;
		}
	}
</style>
