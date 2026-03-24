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
		articles[0]?.category ? categoryLabels[articles[0].category] : 'Live Threat Feed'
	);
</script>

<section class="hero">
	<div class="hero__copy">
		<p class="hero__eyebrow">Cyber fraud awareness and training platform</p>
		<h1>
			Train your instinct
			<span>before the scam arrives.</span>
		</h1>
		<p class="hero__lede">
			ShieldByte turns live fraud reporting into a visual intelligence feed and practical scam
			signals. The current pipeline ingests news, classifies attack patterns, and surfaces the clues
			people often miss.
		</p>

		<div class="hero__actions">
			<a href="#feed" class="hero__primary">Inspect threat feed</a>
			<a href="#mission" class="hero__secondary">Open mission panel</a>
		</div>
	</div>

	<div class="hero__panel">
		<div class="hero__status">
			<span class="hero__dot"></span>
			Live classification stream
		</div>

		<div class="hero__metrics">
			<article>
				<span>Recent cases</span>
				<strong>{articles.length.toString().padStart(2, '0')}</strong>
			</article>
			<article>
				<span>Distinct sources</span>
				<strong>{uniqueSources.toString().padStart(2, '0')}</strong>
			</article>
			<article>
				<span>Extracted signals</span>
				<strong>{totalClues.toString().padStart(2, '0')}</strong>
			</article>
		</div>

		<div class="hero__signal">
			<p>Current scan focus</p>
			<strong>{topCategory}</strong>
			<span>Editorial threat board inspired by the reference layouts in the repo root.</span>
		</div>
	</div>
</section>

<style>
	.hero {
		position: relative;
		display: grid;
		grid-template-columns: minmax(0, 1.4fr) minmax(20rem, 0.9fr);
		gap: 2rem;
		align-items: end;
		padding: 3rem 0 2rem;
	}

	.hero__copy {
		max-width: 46rem;
	}

	.hero__eyebrow,
	.hero__status,
	.hero__signal p,
	.hero__metrics span {
		font-family: var(--font-mono);
		font-size: 0.72rem;
		text-transform: uppercase;
		letter-spacing: 0.2em;
		color: var(--text-muted);
	}

	h1 {
		margin: 0.6rem 0 1rem;
		font-family: var(--font-display);
		font-size: clamp(4.2rem, 11vw, 8.6rem);
		font-weight: 500;
		line-height: 0.88;
		letter-spacing: -0.05em;
		text-wrap: balance;
	}

	h1 span {
		display: block;
		color: var(--accent-soft);
		font-style: italic;
	}

	.hero__lede {
		max-width: 38rem;
		font-size: 1.05rem;
		line-height: 1.8;
		color: var(--text-soft);
	}

	.hero__actions {
		display: flex;
		flex-wrap: wrap;
		gap: 1rem;
		margin-top: 2rem;
	}

	.hero__actions a {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		min-height: 3.25rem;
		padding: 0 1.4rem;
		border-radius: 999px;
		text-decoration: none;
		font-family: var(--font-mono);
		font-size: 0.8rem;
		letter-spacing: 0.14em;
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
		background: var(--accent);
		color: var(--surface-strong);
	}

	.hero__secondary {
		border: 1px solid var(--line-strong);
		color: var(--text-strong);
	}

	.hero__panel {
		position: relative;
		padding: 1.35rem;
		border: 1px solid var(--line-soft);
		background:
			linear-gradient(180deg, rgba(255, 255, 255, 0.05), rgba(255, 255, 255, 0.01)),
			rgba(7, 10, 16, 0.8);
		backdrop-filter: blur(16px);
		min-height: 21rem;
	}

	.hero__status {
		display: inline-flex;
		align-items: center;
		gap: 0.6rem;
	}

	.hero__dot {
		width: 0.55rem;
		height: 0.55rem;
		border-radius: 999px;
		background: var(--accent);
		box-shadow: 0 0 18px rgba(242, 171, 90, 0.9);
		animation: pulse 1.8s ease-in-out infinite;
	}

	.hero__metrics {
		display: grid;
		grid-template-columns: repeat(3, minmax(0, 1fr));
		gap: 0.9rem;
		margin: 2rem 0 1.5rem;
	}

	.hero__metrics article {
		padding: 0.95rem;
		border: 1px solid rgba(255, 255, 255, 0.08);
		background: rgba(255, 255, 255, 0.03);
	}

	.hero__metrics strong,
	.hero__signal strong {
		display: block;
		margin-top: 0.55rem;
		font-family: var(--font-display);
		font-size: 2.2rem;
		font-weight: 500;
		line-height: 1;
	}

	.hero__signal {
		padding-top: 1.2rem;
		border-top: 1px solid var(--line-soft);
	}

	.hero__signal span {
		display: block;
		margin-top: 0.8rem;
		color: var(--text-soft);
		line-height: 1.7;
	}

	@keyframes pulse {
		0%,
		100% {
			opacity: 1;
		}

		50% {
			opacity: 0.3;
		}
	}

	@media (max-width: 900px) {
		.hero {
			grid-template-columns: 1fr;
			padding-top: 2.2rem;
		}

		.hero__metrics {
			grid-template-columns: 1fr;
		}
	}
</style>
