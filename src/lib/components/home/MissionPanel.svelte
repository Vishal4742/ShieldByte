<script lang="ts">
	import type { ThreatArticle } from '$lib/types/threat.js';

	let { article } = $props<{ article: ThreatArticle | null }>();

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
</script>

<section class="mission-panel" id="mission">
	<div class="mission-panel__header">
		<p>Training console</p>
		<h2>Study the warning signs, not just the headline.</h2>
	</div>

	{#if article}
		<div class="mission-panel__frame">
			<div class="mission-panel__intro">
				<span class="mission-panel__badge">Featured case</span>
				<h3>{article.title}</h3>
				<p>{article.scenarioSummary}</p>
			</div>

			<div class="mission-panel__columns">
				<div>
					<p class="mission-panel__label">Victim profile</p>
					<p class="mission-panel__body">{article.victimProfile}</p>
				</div>

				<div>
					<p class="mission-panel__label">Defensive tip</p>
					<p class="mission-panel__body">{article.tip}</p>
				</div>
			</div>

			<div class="mission-panel__clues">
				{#each article.clues as clue, index}
					<article>
						<div>
							<span>{String(index + 1).padStart(2, '0')}</span>
							<strong>{clueLabels[clue.type] ?? clue.type}</strong>
						</div>
						<h4>{clue.clueText}</h4>
						<p>{clue.explanation}</p>
					</article>
				{/each}
			</div>
		</div>
	{:else}
		<div class="mission-panel__empty">
			No classified article is available yet. Run ingestion and classification first to populate the
			training console.
		</div>
	{/if}
</section>

<style>
	.mission-panel {
		display: grid;
		gap: 1.2rem;
	}

	.mission-panel__header p,
	.mission-panel__label,
	.mission-panel__badge,
	.mission-panel__clues span {
		font-family: var(--font-mono);
		font-size: 0.72rem;
		letter-spacing: 0.18em;
		text-transform: uppercase;
		color: var(--text-muted);
	}

	.mission-panel__header h2 {
		max-width: 26rem;
		margin-top: 0.35rem;
		font-family: var(--font-display);
		font-size: clamp(2.2rem, 5vw, 3.6rem);
		font-weight: 500;
		line-height: 0.95;
	}

	.mission-panel__frame,
	.mission-panel__empty {
		padding: 1.4rem;
		border: 1px solid var(--line-soft);
		background:
			radial-gradient(circle at top right, rgba(244, 172, 94, 0.16), transparent 34%),
			rgba(7, 10, 16, 0.84);
	}

	.mission-panel__intro h3 {
		margin: 0.9rem 0 0.8rem;
		font-family: var(--font-display);
		font-size: clamp(2rem, 4vw, 3.1rem);
		font-weight: 500;
		line-height: 0.95;
	}

	.mission-panel__intro p,
	.mission-panel__body,
	.mission-panel__clues p,
	.mission-panel__empty {
		color: var(--text-soft);
		line-height: 1.75;
	}

	.mission-panel__badge {
		display: inline-flex;
		padding: 0.45rem 0.75rem;
		border-radius: 999px;
		background: rgba(255, 255, 255, 0.06);
	}

	.mission-panel__columns {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: 1rem;
		margin: 1.5rem 0;
	}

	.mission-panel__clues {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: 0.95rem;
	}

	.mission-panel__clues article {
		padding: 1rem;
		border: 1px solid rgba(255, 255, 255, 0.08);
		background: rgba(255, 255, 255, 0.04);
	}

	.mission-panel__clues div {
		display: flex;
		justify-content: space-between;
		gap: 1rem;
		align-items: center;
	}

	.mission-panel__clues strong {
		font-size: 0.85rem;
		color: var(--accent-soft);
	}

	.mission-panel__clues h4 {
		margin: 0.9rem 0 0.6rem;
		font-size: 1.05rem;
	}

	@media (max-width: 900px) {
		.mission-panel__columns,
		.mission-panel__clues {
			grid-template-columns: 1fr;
		}
	}
</style>
