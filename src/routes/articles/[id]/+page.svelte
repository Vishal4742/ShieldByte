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
	<title>{article.title} | ShieldByte Intelligence</title>
	<meta
		name="description"
		content={article.scenarioSummary}
	/>
</svelte:head>

<div class="brief-shell">
	<header class="brief-header">
		<a href="/">ShieldByte</a>
		<div>
			<span>{categoryLabels[article.category] ?? article.category}</span>
			<span>{formatDate(article.publishedAt)}</span>
		</div>
	</header>

	<main class="brief-grid">
		<section class="brief-hero">
			<p class="eyebrow">Article intelligence brief</p>
			<h1>{article.title}</h1>
			<p class="lede">{article.scenarioSummary}</p>

			<div class="meta-grid">
				<article>
					<span>Source</span>
					<strong>{article.source}</strong>
				</article>
				<article>
					<span>Channel</span>
					<strong>{article.channel}</strong>
				</article>
				<article>
					<span>Confidence</span>
					<strong>{formatConfidence(article.confidence)}</strong>
				</article>
			</div>

			<div class="actions">
				<a href={article.url} target="_blank" rel="noreferrer">Read original report</a>
				<a href="/">Back to threat feed</a>
			</div>
		</section>

		<aside class="sidebar">
			<section class="panel">
				<p class="panel__label">Victim profile</p>
				<p>{article.victimProfile}</p>
			</section>

			<section class="panel">
				<p class="panel__label">Defensive tip</p>
				<p>{article.tip}</p>
			</section>

			<section class="panel">
				<p class="panel__label">Red flags</p>
				<ul class="chips">
					{#each article.redFlags as redFlag}
						<li>{redFlag}</li>
					{/each}
				</ul>
			</section>
		</aside>

		<section class="panel panel--wide">
			<div class="section-heading">
				<p>Extracted clues</p>
				<h2>What the classifier surfaced</h2>
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
				<p>Article body</p>
				<h2>Stored report content</h2>
			</div>

			<div class="body-copy">
				{article.body}
			</div>
		</section>

		<section class="panel panel--wide">
			<div class="section-heading">
				<p>Raw extraction</p>
				<h2>Defensive parser view</h2>
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
				<p class="empty-copy">No structured extraction fields were available for this article.</p>
			{/if}
		</section>
	</main>
</div>

<style>
	:global(body) {
		margin: 0;
		background:
			radial-gradient(circle at top, rgba(242, 171, 90, 0.14), transparent 24%),
			#05070b;
		color: #f6f1e8;
		font-family: 'Cormorant Garamond', serif;
	}

	.brief-shell {
		--font-display: 'Cormorant Garamond', serif;
		--font-mono: 'IBM Plex Mono', monospace;
		--surface-strong: #0b0d12;
		--line-soft: rgba(255, 255, 255, 0.12);
		--text-strong: rgba(250, 247, 241, 0.96);
		--text-soft: rgba(235, 226, 212, 0.78);
		--text-muted: rgba(235, 226, 212, 0.5);
		--accent: #f2ab5a;
		--accent-soft: #ffd79b;
		min-height: 100vh;
		padding: 0 clamp(1.2rem, 4vw, 3rem) 4rem;
	}

	.brief-header,
	.section-heading p,
	.panel__label,
	.eyebrow,
	.meta-grid span,
	.clue-card__topline span,
	.field-card span {
		font-family: var(--font-mono);
		font-size: 0.72rem;
		letter-spacing: 0.18em;
		text-transform: uppercase;
		color: var(--text-muted);
	}

	.brief-header {
		display: flex;
		justify-content: space-between;
		gap: 1rem;
		align-items: center;
		padding: 1.2rem 0;
	}

	.brief-header a,
	.actions a {
		color: var(--text-strong);
		text-decoration: none;
	}

	.brief-header div,
	.actions {
		display: flex;
		flex-wrap: wrap;
		gap: 1rem;
	}

	.brief-grid {
		display: grid;
		grid-template-columns: minmax(0, 1.15fr) minmax(18rem, 0.85fr);
		gap: 1.5rem;
		align-items: start;
	}

	.brief-hero,
	.panel {
		padding: 1.3rem;
		border: 1px solid var(--line-soft);
		background:
			linear-gradient(180deg, rgba(255, 255, 255, 0.04), rgba(255, 255, 255, 0.01)),
			rgba(7, 10, 16, 0.84);
	}

	.brief-hero h1,
	.section-heading h2 {
		margin: 0.5rem 0 1rem;
		font-family: var(--font-display);
		font-size: clamp(2.6rem, 6vw, 5rem);
		font-weight: 500;
		line-height: 0.94;
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

	.meta-grid,
	.clue-grid,
	.extraction-grid {
		display: grid;
		grid-template-columns: repeat(3, minmax(0, 1fr));
		gap: 1rem;
	}

	.meta-grid {
		margin: 1.8rem 0 1.4rem;
	}

	.meta-grid article,
	.clue-card,
	.field-card {
		padding: 1rem;
		border: 1px solid rgba(255, 255, 255, 0.08);
		background: rgba(255, 255, 255, 0.03);
	}

	.meta-grid strong,
	.clue-card strong {
		display: block;
		margin-top: 0.5rem;
	}

	.sidebar {
		display: grid;
		gap: 1.5rem;
	}

	.panel--wide {
		grid-column: 1 / -1;
	}

	.clue-card__topline {
		display: flex;
		justify-content: space-between;
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
		.brief-grid,
		.meta-grid,
		.clue-grid,
		.extraction-grid {
			grid-template-columns: 1fr;
		}
	}
</style>
