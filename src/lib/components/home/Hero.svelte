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
	const totalClues = $derived(articles.reduce((sum, article) => sum + article.clues.length, 0));
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
	const liveOps = $derived([
		{ label: 'Combo streak', value: `${String(Math.max(totalClues - 2, 0)).padStart(2, '0')} clears` },
		{ label: 'Case spread', value: `${String(uniqueSources).padStart(2, '0')} feeds` },
		{ label: 'Board heat', value: `${String(confidenceScore).padStart(2, '0')}%` }
	]);
</script>

<section class="hero">
	<div class="hero__column hero__column--primary">
		<div class="hero__badge-row">
			<p class="hero__eyebrow">ShieldByte arcade deck</p>
			<span class="hero__live"><i></i> Live mission queue</span>
		</div>

		<h1>
			Scan.
			<span>Flag.</span>
			Train.
		</h1>

		<p class="hero__lede">
			Train like a player, not a reader. ShieldByte turns messy real scam reports into fast rounds,
			case boards, and repeatable pattern drills for everyday scam defense.
		</p>

		<div class="hero__actions">
			<a href="/play" class="hero__primary">Start scam hunt</a>
			<a href="#feed" class="hero__secondary">Browse case board</a>
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

	<div class="hero__column hero__column--secondary">
		<div class="signal-radar">
			<div class="signal-radar__rings"></div>
			<div class="signal-radar__core">
				<span>Scan focus</span>
				<strong>{topCategory}</strong>
			</div>
		</div>

		<div class="session-board">
			<article>
				<span>Case queue</span>
				<strong>{String(articles.length).padStart(2, '0')}</strong>
			</article>
			<article>
				<span>Signals extracted</span>
				<strong>{String(totalClues).padStart(2, '0')}</strong>
			</article>
			<article>
				<span>Operator tier</span>
				<strong>Field Analyst</strong>
			</article>
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
		padding: 1.4rem;
		border: 1px solid var(--line-soft);
		background:
			radial-gradient(circle at top left, rgba(255, 183, 77, 0.16), transparent 24%),
			radial-gradient(circle at bottom right, rgba(114, 255, 214, 0.08), transparent 20%),
			linear-gradient(180deg, rgba(255, 255, 255, 0.05), rgba(255, 255, 255, 0.01)),
			var(--surface-1);
		backdrop-filter: blur(18px);
		overflow: hidden;
		box-shadow: var(--shadow-arcade);
	}

	.hero__column::before {
		content: '';
		position: absolute;
		inset: 0.85rem;
		border: 1px dashed rgba(255, 255, 255, 0.08);
		pointer-events: none;
	}

	.hero__badge-row,
	.hero__ticker article span,
	.session-board span,
	.signal-radar__core span {
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
		border-radius: 999px;
		border: 1px solid rgba(255, 255, 255, 0.08);
		background: rgba(255, 255, 255, 0.04);
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
		background: var(--accent-gold);
		box-shadow: 0 0 14px rgba(255, 183, 77, 0.9);
		animation: pulse 1.7s ease-in-out infinite;
	}

	h1 {
		margin: 1rem 0 1.1rem;
		font-family: var(--font-display);
		font-size: clamp(4.4rem, 13vw, 9rem);
		font-weight: 500;
		line-height: 0.82;
		letter-spacing: -0.06em;
	}

	h1 span {
		display: block;
		color: #ffe2b7;
		font-style: italic;
		transform: translateX(1.4rem);
	}

	.hero__lede {
		max-width: 40rem;
		margin: 0;
		font-size: 1.03rem;
		line-height: 1.85;
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
		min-height: 3.2rem;
		padding: 0 1.3rem;
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
		background: linear-gradient(135deg, var(--accent-gold), #ffd48a);
		color: #0b111b;
		box-shadow: 0 18px 32px rgba(255, 183, 77, 0.18);
	}

	.hero__secondary {
		border: 1px solid var(--line-strong);
		color: var(--text-strong);
		background: rgba(255, 255, 255, 0.03);
	}

	.hero__ticker {
		display: grid;
		grid-template-columns: repeat(3, minmax(0, 1fr));
		gap: 0.9rem;
		margin-top: 2rem;
	}

	.hero__ticker article,
	.session-board article {
		padding: 0.95rem;
		border: 1px solid rgba(255, 255, 255, 0.08);
		background: rgba(255, 255, 255, 0.03);
	}

	.hero__ticker strong,
	.session-board strong,
	.signal-radar__core strong {
		display: block;
		margin-top: 0.55rem;
		font-family: var(--font-display);
		font-size: 1.9rem;
		font-weight: 500;
		line-height: 1;
	}

	.hero__column--secondary {
		display: grid;
		gap: 1rem;
		align-content: space-between;
	}

	.signal-radar {
		position: relative;
		display: grid;
		place-items: center;
		min-height: 16rem;
		border: 1px solid rgba(255, 255, 255, 0.08);
		background:
			radial-gradient(circle, rgba(255, 183, 77, 0.08) 0 14%, transparent 15% 100%),
			radial-gradient(circle at center, rgba(255, 255, 255, 0.05), transparent 66%);
	}

	.signal-radar__rings {
		position: absolute;
		inset: 1.2rem;
		border-radius: 999px;
		border: 1px solid rgba(255, 255, 255, 0.1);
		box-shadow:
			0 0 0 2.5rem rgba(255, 255, 255, 0.03),
			0 0 0 5rem rgba(255, 255, 255, 0.02);
	}

	.signal-radar__core {
		position: relative;
		z-index: 1;
		text-align: center;
	}

	.session-board {
		display: grid;
		gap: 0.85rem;
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
		.hero__ticker {
			grid-template-columns: 1fr;
		}

		h1 span {
			transform: none;
		}
	}
</style>
