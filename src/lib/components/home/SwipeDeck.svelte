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

	const featuredQueue = $derived(articles.slice(0, 3));
	const missionCount = $derived(articles.length);
	const totalFlags = $derived(articles.reduce((sum, article) => sum + article.redFlags.length, 0));
	const averageConfidence = $derived.by(() => {
		if (articles.length === 0) return 0;
		return Math.round(
			(articles.reduce((sum, article) => sum + (article.confidence ?? 0.72), 0) / articles.length) * 100
		);
	});

	function threatBand(value: number | null): string {
		if (value === null) return 'Tracked';
		if (value >= 0.88) return 'Boss';
		if (value >= 0.72) return 'Live';
		return 'Warm-up';
	}
</script>

<section class="mission-queue" aria-label="Mission queue">
	<div class="mission-queue__header">
		<div>
			<p class="mission-queue__eyebrow">Mission queue</p>
			<h2>Pick a dossier, then enter the round.</h2>
		</div>
		<div class="mission-queue__scoreboard">
			<article>
				<span>Queue size</span>
				<strong>{String(missionCount).padStart(2, '0')}</strong>
			</article>
			<article>
				<span>Signals live</span>
				<strong>{String(totalFlags).padStart(2, '0')}</strong>
			</article>
			<article>
				<span>Board heat</span>
				<strong>{String(averageConfidence).padStart(2, '0')}%</strong>
			</article>
		</div>
	</div>

	{#if featuredQueue.length > 0}
		<div class="mission-queue__grid">
			{#each featuredQueue as article, index}
				<article class="mission-card">
					<div class="mission-card__top">
						<div>
							<span>Mission {String(index + 1).padStart(2, '0')}</span>
							<strong>{categoryLabels[article.category] ?? article.category}</strong>
						</div>
						<div class="mission-card__threat">
							<span>Threat band</span>
							<strong>{threatBand(article.confidence)}</strong>
						</div>
					</div>

					<h3>{article.title}</h3>
					<p>{article.scenarioSummary}</p>

					<div class="mission-card__stats">
						<div>
							<span>Channel</span>
							<strong>{article.channel}</strong>
						</div>
						<div>
							<span>Signals</span>
							<strong>{String(article.redFlags.length).padStart(2, '0')}</strong>
						</div>
						<div>
							<span>Source</span>
							<strong>{article.source}</strong>
						</div>
					</div>

					<div class="mission-card__flags">
						{#each article.redFlags.slice(0, 3) as flag}
							<span>{flag}</span>
						{/each}
					</div>

					<div class="mission-card__actions">
						<a href={`/play?article=${article.id}&type=${encodeURIComponent(article.category)}`}>
							Deploy mission
						</a>
						<a href={`/articles/${article.id}`} class="mission-card__secondary">Open dossier</a>
					</div>
				</article>
			{/each}
		</div>
	{:else}
		<div class="mission-queue__empty">No active cases are loaded yet.</div>
	{/if}
</section>

<style>
	.mission-queue {
		margin-top: 1rem;
		padding: 1.2rem;
		border: 1px solid var(--line-soft);
		background:
			radial-gradient(circle at top right, rgba(255, 183, 77, 0.08), transparent 24%),
			radial-gradient(circle at bottom left, rgba(114, 255, 214, 0.07), transparent 18%),
			linear-gradient(180deg, rgba(255, 255, 255, 0.04), rgba(255, 255, 255, 0.01)),
			var(--surface-1);
		box-shadow: var(--shadow-arcade);
	}

	.mission-queue__header,
	.mission-queue__scoreboard,
	.mission-card__top,
	.mission-card__stats,
	.mission-card__actions {
		display: flex;
		justify-content: space-between;
		gap: 0.9rem;
		align-items: center;
	}

	.mission-queue__eyebrow,
	.mission-queue__scoreboard span,
	.mission-card__top span,
	.mission-card__stats span {
		font-family: var(--font-mono);
		font-size: 0.7rem;
		letter-spacing: 0.16em;
		text-transform: uppercase;
		color: var(--text-muted);
	}

	.mission-queue__header h2 {
		margin: 0.35rem 0 0;
		font-family: var(--font-display);
		font-size: clamp(2.1rem, 5vw, 3.6rem);
		line-height: 0.94;
		font-weight: 500;
	}

	.mission-queue__scoreboard {
		flex-wrap: wrap;
	}

	.mission-queue__scoreboard article {
		min-width: 7rem;
		padding: 0.7rem 0.8rem;
		border: 1px solid rgba(255, 255, 255, 0.08);
		background: rgba(255, 255, 255, 0.04);
	}

	.mission-queue__scoreboard strong {
		display: block;
		margin-top: 0.45rem;
		font-family: var(--font-display);
		font-size: 1.8rem;
		line-height: 1;
	}

	.mission-queue__grid {
		display: grid;
		grid-template-columns: repeat(3, minmax(0, 1fr));
		gap: 1rem;
		margin-top: 1rem;
	}

	.mission-card {
		display: grid;
		gap: 1rem;
		padding: 1.2rem;
		border: 1px solid rgba(255, 255, 255, 0.08);
		background:
			linear-gradient(145deg, rgba(255, 255, 255, 0.04), rgba(255, 255, 255, 0.01)),
			var(--surface-2);
		box-shadow: var(--shadow-arcade);
	}

	.mission-card__top strong,
	.mission-card__stats strong {
		display: block;
		margin-top: 0.35rem;
		color: var(--text-strong);
	}

	.mission-card__threat {
		text-align: right;
	}

	.mission-card h3 {
		margin: 0;
		font-family: var(--font-display);
		font-size: clamp(2rem, 4vw, 2.8rem);
		line-height: 0.95;
		font-weight: 500;
	}

	.mission-card p {
		margin: 0;
		color: var(--text-soft);
		line-height: 1.75;
	}

	.mission-card__stats {
		display: grid;
		grid-template-columns: repeat(3, minmax(0, 1fr));
		align-items: start;
	}

	.mission-card__flags {
		display: flex;
		flex-wrap: wrap;
		gap: 0.6rem;
	}

	.mission-card__flags span {
		padding: 0.45rem 0.7rem;
		border: 1px solid rgba(255, 255, 255, 0.08);
		background: rgba(255, 255, 255, 0.04);
		color: var(--text-strong);
		font-size: 0.82rem;
	}

	.mission-card__actions a {
		flex: 1;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		min-height: 3rem;
		text-decoration: none;
		font-family: var(--font-mono);
		font-size: 0.72rem;
		letter-spacing: 0.16em;
		text-transform: uppercase;
		border: 1px solid rgba(255, 255, 255, 0.08);
	}

	.mission-card__actions a:first-child {
		border-color: transparent;
		background: linear-gradient(135deg, var(--accent-gold), #ffd48a);
		color: #091018;
	}

	.mission-card__secondary {
		background: rgba(255, 255, 255, 0.03);
		color: var(--text-strong);
	}

	.mission-queue__empty {
		padding: 1.2rem;
		color: var(--text-soft);
	}

	@media (max-width: 1080px) {
		.mission-queue__header,
		.mission-queue__scoreboard {
			flex-direction: column;
			align-items: flex-start;
		}

		.mission-queue__grid {
			grid-template-columns: 1fr;
		}
	}

	@media (max-width: 720px) {
		.mission-card__top,
		.mission-card__actions {
			flex-direction: column;
			align-items: flex-start;
		}

		.mission-card__stats {
			grid-template-columns: 1fr;
			gap: 0.75rem;
		}

		.mission-card__actions a {
			width: 100%;
		}
	}
</style>
