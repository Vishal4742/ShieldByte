<script lang="ts">
	import type { ThreatArticle } from '$lib/types/threat.js';

	let { articles }: { articles: ThreatArticle[] } = $props();

	const categoryLabels: Record<string, string> = {
		UPI_fraud: 'UPI Fraud',
		KYC_fraud: 'KYC Fraud',
		lottery_fraud: 'Lottery Fraud',
		job_scam: 'Job Scam',
		investment_fraud: 'Investment Fraud',
		customer_support_scam: 'Support Scam'
	};

	const uniqueSources = $derived(new Set(articles.map((article) => article.source)).size);
	const topCategory = $derived(
		articles[0]?.category ? categoryLabels[articles[0].category] : 'Threat feed'
	);
	const confidenceScore = $derived(
		articles.length > 0
			? Math.round(
					(articles.reduce((sum, article) => sum + (article.confidence ?? 0.72), 0) / articles.length) *
						100
				)
			: 0
	);
	const featuredCase = $derived(articles[0] ?? null);
	const featuredPlayHref = $derived(
		featuredCase
			? `/play?article=${featuredCase.id}&type=${encodeURIComponent(featuredCase.category)}`
			: '/play'
	);
	const featuredArticleHref = $derived(featuredCase ? `/articles/${featuredCase.id}` : '#queue');
	const liveOps = $derived([
		{ label: 'Live cases', value: String(articles.length).padStart(2, '0') },
		{ label: 'Sources', value: String(uniqueSources).padStart(2, '0') },
		{ label: 'Classifier read', value: `${String(confidenceScore).padStart(2, '0')}%` }
	]);
</script>

<section class="hero">
	<div class="hero__column hero__column--primary">
		<div class="hero__badge-row">
			<p class="hero__eyebrow">Scam defense game</p>
			<span class="hero__live"><i></i> Real cases, playable rounds</span>
		</div>

		<h1>
			Learn scams
			<span>by playing.</span>
		</h1>

		<p class="hero__lede">
			Read a suspicious message, decide if it is a scam, and review the exact signals you missed.
			ShieldByte turns scam awareness into short, replayable game rounds instead of passive reading.
		</p>

		<div class="hero__actions">
			<a href="/play" class="hero__primary">Play first round</a>
			<a href="#queue" class="hero__secondary">Open mission queue</a>
		</div>

		<div class="hero__loop">
			<article>
				<span>1</span>
				<p>Open a real scam case.</p>
			</article>
			<article>
				<span>2</span>
				<p>Predict scam or not.</p>
			</article>
			<article>
				<span>3</span>
				<p>Review the exact warning signs.</p>
			</article>
		</div>
	</div>

	<div class="hero__column hero__column--secondary">
		<div class="preview-card">
			<div class="preview-card__top">
				<div>
					<span>Mission preview</span>
					<strong>{featuredCase ? (categoryLabels[featuredCase.category] ?? featuredCase.category) : topCategory}</strong>
				</div>
				<div class="preview-card__status">Live</div>
			</div>

			<div class="preview-card__message">
				<p class="preview-card__sender">{featuredCase?.source ?? 'Unknown sender'}</p>
				<p class="preview-card__body">
					{featuredCase?.scenarioSummary ?? 'Fresh scam cases will appear here once the queue is loaded.'}
				</p>
			</div>

			<div class="preview-card__choices">
				<a href={featuredPlayHref} class="preview-card__choice preview-card__choice--danger">
					Play this case
				</a>
				<a href={featuredArticleHref} class="preview-card__choice">
					Read dossier
				</a>
			</div>

			<div class="hero__ticker">
				{#each liveOps as item}
					<article>
						<span>{item.label}</span>
						<strong>{item.value}</strong>
					</article>
				{/each}
			</div>
		</div>
	</div>
</section>

<style>
	.hero {
		display: grid;
		grid-template-columns: minmax(0, 1.35fr) minmax(20rem, 0.9fr);
		gap: 1.4rem;
		align-items: stretch;
		padding: 2.2rem 0 1.4rem;
	}

	.hero__column {
		position: relative;
		padding: 1.45rem;
		border: 1px solid var(--panel-border);
		border-radius: 1.4rem;
		background:
			radial-gradient(circle at top left, rgba(255, 255, 255, 0.14), transparent 24%),
			radial-gradient(circle at bottom right, rgba(237, 161, 103, 0.1), transparent 22%),
			linear-gradient(180deg, rgba(255, 255, 255, 0.16), rgba(255, 255, 255, 0.06)),
			var(--surface-1);
		backdrop-filter: blur(18px);
		overflow: hidden;
		box-shadow: var(--shadow-hud);
	}

	.hero__column::before {
		content: '';
		position: absolute;
		inset: 0.8rem;
		border: 1px solid rgba(20, 34, 45, 0.1);
		border-radius: 1rem;
		pointer-events: none;
	}

	.hero__badge-row,
	.hero__ticker article span,
	.hero__loop span,
	.preview-card span,
	.preview-card__sender {
		font-family: var(--font-mono);
		font-size: 0.72rem;
		text-transform: uppercase;
		letter-spacing: 0.18em;
		color: var(--text-muted);
	}

	.hero__badge-row {
		display: flex;
		flex-wrap: wrap;
		justify-content: space-between;
		gap: 0.8rem;
		align-items: center;
	}

	.hero__eyebrow {
		margin: 0;
	}

	.hero__live {
		display: inline-flex;
		align-items: center;
		gap: 0.55rem;
		padding: 0.45rem 0.7rem;
		border-radius: 0.8rem;
		border: 1px solid rgba(255, 255, 255, 0.14);
		background: rgba(255, 255, 255, 0.12);
		font-family: var(--font-mono);
		font-size: 0.72rem;
		letter-spacing: 0.14em;
		text-transform: uppercase;
		color: var(--text-strong);
	}

	.hero__live i {
		width: 0.5rem;
		height: 0.5rem;
		border-radius: 999px;
		background: var(--accent-lime);
		box-shadow: 0 0 14px rgba(237, 161, 103, 0.42);
		animation: pulse 1.7s ease-in-out infinite;
	}

	h1 {
		margin: 1rem 0 1.1rem;
		font-family: var(--font-display);
		font-size: clamp(4rem, 11vw, 7rem);
		font-weight: 700;
		line-height: 0.9;
		letter-spacing: -0.04em;
	}

	h1 span {
		display: inline-block;
		color: var(--accent-soft);
		text-shadow: 0 4px 24px rgba(0, 0, 0, 0.1);
	}

	.hero__lede {
		max-width: 40rem;
		margin: 0;
		font-size: 1.02rem;
		line-height: 1.8;
		color: var(--text-soft);
	}

	.hero__actions {
		display: flex;
		flex-wrap: wrap;
		gap: 0.9rem;
		margin-top: 1.8rem;
	}

	.hero__actions a {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		min-height: 3.35rem;
		padding: 0 1.35rem;
		text-decoration: none;
		font-family: var(--font-mono);
		font-size: 0.78rem;
		letter-spacing: 0.16em;
		text-transform: uppercase;
		transition:
			transform 180ms ease,
			background-color 180ms ease,
			border-color 180ms ease;
	}

	.hero__actions a:hover,
	.hero__actions a:focus-visible {
		transform: translateY(-1px);
	}

	.hero__primary {
		background: rgba(255, 255, 255, 0.14);
		color: var(--text-strong);
		border: 1px solid var(--panel-border);
		border-radius: 0.95rem;
		box-shadow: none;
	}

	.hero__secondary {
		border: 1px solid var(--panel-border);
		border-radius: 0.95rem;
		color: var(--text-strong);
		background: rgba(255, 255, 255, 0.08);
	}

	.hero__loop {
		display: grid;
		grid-template-columns: repeat(3, minmax(0, 1fr));
		gap: 0.7rem;
		margin-top: 1.7rem;
	}

	.hero__loop article,
	.hero__ticker article {
		padding: 0.95rem;
		border: 1px solid rgba(20, 34, 45, 0.1);
		border-radius: 1rem;
		background: linear-gradient(180deg, rgba(255, 255, 255, 0.06), rgba(255, 255, 255, 0.03));
	}

	.hero__loop span {
		display: inline-grid;
		place-items: center;
		width: 1.8rem;
		height: 1.8rem;
		border-radius: 999px;
		background: rgba(255, 255, 255, 0.06);
		color: var(--accent-soft);
	}

	.hero__loop p {
		margin: 0.8rem 0 0;
		line-height: 1.6;
		color: rgba(10, 10, 10, 0.82);
	}

	.preview-card {
		display: grid;
		gap: 1rem;
		height: 100%;
		padding: 1.2rem;
		border: 1px solid rgba(10, 10, 10, 0.08);
		border-radius: 1.1rem;
		background:
			radial-gradient(circle at top right, rgba(255, 255, 255, 0.12), transparent 26%),
			linear-gradient(180deg, rgba(255, 255, 255, 0.16), rgba(255, 255, 255, 0.06)),
			var(--surface-2);
	}

	.preview-card__top {
		display: flex;
		justify-content: space-between;
		gap: 1rem;
		align-items: start;
	}

	.preview-card__top strong {
		display: block;
		margin-top: 0.45rem;
		font-family: var(--font-display);
		font-size: 1.7rem;
		font-weight: 700;
		line-height: 1;
	}

	.preview-card__status {
		padding: 0.45rem 0.7rem;
		border-radius: 999px;
		border: 1px solid rgba(255, 255, 255, 0.14);
		background: transparent;
		font-family: var(--font-mono);
		font-size: 0.68rem;
		letter-spacing: 0.14em;
		text-transform: uppercase;
		color: var(--text-soft);
	}

	.preview-card__message {
		padding: 1rem;
		border: 1px solid rgba(10, 10, 10, 0.08);
		border-radius: 1rem;
		background: rgba(255, 255, 255, 0.14);
	}

	.preview-card__sender {
		margin: 0;
	}

	.preview-card__body {
		margin: 0.8rem 0 0;
		font-size: 1rem;
		line-height: 1.75;
		color: var(--text-soft);
	}

	.preview-card__choices {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 0.75rem;
	}

	.preview-card__choice {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		min-height: 3rem;
		border: 1px solid rgba(20, 34, 45, 0.12);
		border-radius: 0.95rem;
		background: rgba(255, 255, 255, 0.12);
		color: var(--text-strong);
		text-decoration: none;
		font-family: var(--font-mono);
		font-size: 0.72rem;
		letter-spacing: 0.16em;
		text-transform: uppercase;
	}

	.preview-card__choice--danger {
		background: rgba(255, 255, 255, 0.14);
		border-color: var(--line-strong);
		color: var(--text-strong);
	}

	.hero__ticker strong,
	.preview-card strong {
		display: block;
		margin-top: 0.55rem;
		font-family: var(--font-display);
		font-size: 1.7rem;
		font-weight: 700;
		line-height: 1;
		text-transform: uppercase;
	}

	@keyframes pulse {
		0%,
		100% {
			opacity: 1;
		}

		50% {
			opacity: 0.35;
		}
	}

	@media (max-width: 980px) {
		.hero,
		.hero__loop,
		.hero__ticker {
			grid-template-columns: 1fr;
		}
	}

	@media (max-width: 720px) {
		.hero {
			gap: 1rem;
			padding: 1.1rem 0 1rem;
		}

		.hero__column {
			padding: 1rem;
			border-radius: 1rem;
		}

		.hero__column::before {
			inset: 0.6rem;
			border-radius: 0.8rem;
		}

		.hero__badge-row,
		.hero__actions {
			gap: 0.65rem;
		}

		h1 {
			font-size: clamp(2.8rem, 14vw, 4.1rem);
			line-height: 0.92;
		}

		.hero__lede {
			font-size: 0.95rem;
			line-height: 1.65;
		}

		.hero__actions a {
			width: 100%;
			min-height: 3rem;
			padding: 0 1rem;
		}

		.hero__loop,
		.hero__ticker {
			gap: 0.7rem;
			margin-top: 1.4rem;
		}

		.hero__loop article,
		.hero__ticker article,
		.preview-card {
			padding: 0.8rem;
		}

		.hero__ticker strong,
		.preview-card strong {
			font-size: 1.35rem;
		}
	}

	@media (max-width: 480px) {
		.hero__badge-row,
		.hero__ticker article span,
		.hero__loop span,
		.preview-card span,
		.preview-card__sender {
			font-size: 0.62rem;
			letter-spacing: 0.14em;
		}

		h1 {
			font-size: 2.55rem;
		}

		.hero__live {
			width: 100%;
			justify-content: center;
		}

		.hero__ticker {
			grid-template-columns: 1fr;
		}

		.preview-card__choices {
			grid-template-columns: 1fr;
		}
	}
</style>
