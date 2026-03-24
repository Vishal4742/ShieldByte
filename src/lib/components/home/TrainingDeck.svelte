<script lang="ts">
	import type { ThreatArticle } from '$lib/types/threat.js';
	import type { ThreatMission } from '$lib/types/mission.js';

	let { article, mission }: { article: ThreatArticle | null; mission: ThreatMission | null } = $props();

	const clueLabels: Record<string, string> = {
		urgency: 'Urgency pressure',
		fake_link: 'Suspicious link',
		unknown_sender: 'Unknown sender',
		credential_request: 'Credential request',
		too_good: 'Too good to be true',
		fake_authority: 'Fake authority',
		upfront_fee: 'Upfront fee',
		suspicious_link: 'Suspicious link',
		fake_sender: 'Fake sender',
		too_good_to_be_true: 'Too good to be true',
		signal: 'Warning signal'
	};

	const checklistItems = $derived.by(() => {
		if (mission?.clues.length) {
			return mission.clues.map((clue, index) => ({
				id: `mission-${index}`,
				label: clueLabels[clue.type] ?? clue.type,
				explanation: clue.explanation,
				source: clue.triggerText
			}));
		}

		return (article?.clues ?? []).map((clue, index) => ({
			id: `article-${index}`,
			label: clueLabels[clue.type] ?? clue.type,
			explanation: clue.explanation,
			source: clue.clueText
		}));
	});

	let selected = $state<string[]>([]);
	let hasSubmitted = $state(false);

	function toggleSelection(id: string) {
		selected = selected.includes(id)
			? selected.filter((entry) => entry !== id)
			: [...selected, id];
	}

	function reviewAnswers() {
		hasSubmitted = true;
	}

	function resetExercise() {
		selected = [];
		hasSubmitted = false;
	}

	const selectedCount = $derived(selected.length);
	const totalSignals = $derived(checklistItems.length);
	const messageLines = $derived(
		(mission?.messageBody || article?.scenarioSummary || '')
			.split(/\n+/)
			.map((line) => line.trim())
			.filter((line) => line.length > 0)
	);
</script>

<section class="training-deck" id="mission">
	<div class="training-deck__intro">
		<div>
			<p class="training-deck__eyebrow">Interactive training deck</p>
			<h2>Spot the scam signals before the explanation appears.</h2>
		</div>

		<div class="training-deck__summary">
			<div>
				<span>Featured case</span>
				<strong>{article?.title ?? 'No featured article available'}</strong>
			</div>
			<div>
				<span>Exercise mode</span>
				<strong>{mission ? 'Simulated message' : 'Classifier clue drill'}</strong>
			</div>
			<div>
				<span>Signals to find</span>
				<strong>{String(totalSignals).padStart(2, '0')}</strong>
			</div>
		</div>
	</div>

	{#if article}
		<div class="training-stage">
			<section class="mission-sheet">
				<div class="mission-sheet__header">
					<div>
						<p>Scenario file</p>
						<h3>{mission ? mission.simulationType.replace('_', ' ') : 'Classifier training brief'}</h3>
					</div>

					<div class="mission-sheet__meta">
						<div>
							<span>Sender</span>
							<strong>{mission?.sender ?? article.source}</strong>
						</div>
						<div>
							<span>Difficulty</span>
							<strong>{mission?.difficulty ?? 'guided'}</strong>
						</div>
					</div>
				</div>

				<div class="mission-sheet__body">
					{#if mission && messageLines.length > 0}
						{#each messageLines as line}
							<p>{line}</p>
						{/each}
					{:else}
						<p>{article.scenarioSummary}</p>
						<p>{article.body}</p>
					{/if}
				</div>

				<div class="mission-sheet__footer">
					<span>Read first. Mark each signal you would challenge before acting.</span>
					<a href={`/articles/${article.id}`}>Open full intelligence brief</a>
				</div>
			</section>

			<section class="training-console">
				<div class="training-console__header">
					<p>Checklist exercise</p>
					<h3>Mark the warning signs you can identify.</h3>
				</div>

				<div class="signal-grid">
					{#each checklistItems as item}
						<button
							type="button"
							class:selected={selected.includes(item.id)}
							class:revealed={hasSubmitted}
							onclick={() => toggleSelection(item.id)}
						>
							<span>{item.label}</span>
							<strong>{selected.includes(item.id) ? 'Marked' : 'Tap to mark'}</strong>
						</button>
					{/each}
				</div>

				<div class="training-console__actions">
					<div>
						<span>Marked signals</span>
						<strong>{String(selectedCount).padStart(2, '0')} / {String(totalSignals).padStart(2, '0')}</strong>
					</div>

					<div class="training-console__buttons">
						<button type="button" class="action-primary" onclick={reviewAnswers}>Review answers</button>
						<button type="button" class="action-secondary" onclick={resetExercise}>Reset</button>
					</div>
				</div>

				{#if hasSubmitted}
					<div class="answer-board">
						<p>Answer key</p>
						<div class="answer-board__grid">
							{#each checklistItems as item, index}
								<article>
									<div>
										<span>{String(index + 1).padStart(2, '0')}</span>
										<strong>{item.label}</strong>
									</div>
									<h4>{item.source}</h4>
									<p>{item.explanation}</p>
								</article>
							{/each}
						</div>
					</div>
				{/if}

				<div class="training-console__tip">
					<span>Defensive reminder</span>
					<p>{mission?.tip ?? article.tip}</p>
				</div>
			</section>
		</div>
	{:else}
		<div class="training-empty">
			No classified article is available yet. Run ingestion and classification first to enable the training deck.
		</div>
	{/if}
</section>

<style>
	.training-deck {
		display: grid;
		gap: 1.4rem;
		margin-top: 2.5rem;
	}

	.training-deck__eyebrow,
	.training-deck__summary span,
	.mission-sheet__header p,
	.mission-sheet__meta span,
	.training-console__header p,
	.training-console__actions span,
	.answer-board p,
	.answer-board span,
	.training-console__tip span,
	.training-empty {
		font-family: var(--font-mono);
		font-size: 0.72rem;
		text-transform: uppercase;
		letter-spacing: 0.18em;
		color: var(--text-muted);
	}

	.training-deck__intro {
		display: grid;
		grid-template-columns: minmax(0, 1.2fr) minmax(18rem, 0.8fr);
		gap: 1.25rem;
		align-items: end;
	}

	.training-deck__intro h2,
	.training-console__header h3 {
		margin: 0.45rem 0 0;
		font-family: var(--font-display);
		font-size: clamp(2.4rem, 6vw, 4.6rem);
		font-weight: 500;
		line-height: 0.92;
	}

	.training-deck__summary {
		display: grid;
		grid-template-columns: repeat(3, minmax(0, 1fr));
		gap: 1rem;
	}

	.training-deck__summary div,
	.training-empty {
		padding: 1rem;
		border: 1px solid var(--line-soft);
		background: rgba(255, 255, 255, 0.03);
	}

	.training-deck__summary strong {
		display: block;
		margin-top: 0.55rem;
		font-size: 1rem;
		line-height: 1.4;
	}

	.training-stage {
		display: grid;
		grid-template-columns: minmax(0, 1.05fr) minmax(22rem, 0.95fr);
		gap: 1.2rem;
		align-items: start;
	}

	.mission-sheet,
	.training-console {
		position: relative;
		padding: 1.4rem;
		border: 1px solid var(--line-soft);
		background:
			radial-gradient(circle at top right, rgba(242, 171, 90, 0.14), transparent 30%),
			linear-gradient(180deg, rgba(255, 255, 255, 0.04), rgba(255, 255, 255, 0.01)),
			rgba(7, 10, 16, 0.85);
	}

	.mission-sheet::before,
	.training-console::before {
		content: '';
		position: absolute;
		inset: 0.75rem;
		border: 1px dashed rgba(255, 255, 255, 0.08);
		pointer-events: none;
	}

	.mission-sheet__header,
	.training-console__actions,
	.answer-board__grid article div {
		display: flex;
		justify-content: space-between;
		gap: 1rem;
	}

	.mission-sheet__header h3 {
		margin: 0.45rem 0 0;
		font-family: var(--font-display);
		font-size: clamp(2rem, 4vw, 3.2rem);
		font-weight: 500;
		line-height: 0.95;
	}

	.mission-sheet__meta {
		display: grid;
		gap: 0.85rem;
		text-align: right;
	}

	.mission-sheet__meta strong,
	.training-console__actions strong {
		display: block;
		margin-top: 0.45rem;
		font-size: 0.95rem;
		color: var(--text-strong);
	}

	.mission-sheet__body {
		display: grid;
		gap: 0.95rem;
		margin: 1.4rem 0;
		padding: 1.25rem;
		background:
			linear-gradient(135deg, rgba(255, 255, 255, 0.08), rgba(255, 255, 255, 0.02)),
			rgba(255, 255, 255, 0.03);
		border: 1px solid rgba(255, 255, 255, 0.09);
		box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.05);
	}

	.mission-sheet__body p,
	.answer-board__grid article p,
	.training-console__tip p,
	.training-empty {
		margin: 0;
		color: var(--text-soft);
		line-height: 1.85;
	}

	.mission-sheet__footer {
		display: flex;
		flex-wrap: wrap;
		justify-content: space-between;
		gap: 1rem;
		align-items: center;
	}

	.mission-sheet__footer span,
	.mission-sheet__footer a {
		font-family: var(--font-mono);
		font-size: 0.74rem;
		letter-spacing: 0.14em;
		text-transform: uppercase;
		color: var(--text-muted);
		text-decoration: none;
	}

	.signal-grid,
	.answer-board__grid {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: 0.9rem;
	}

	.signal-grid {
		margin: 1.4rem 0;
	}

	.signal-grid button,
	.answer-board__grid article {
		padding: 1rem;
		border: 1px solid rgba(255, 255, 255, 0.1);
		background: rgba(255, 255, 255, 0.03);
		color: var(--text-strong);
		text-align: left;
	}

	.signal-grid button {
		cursor: pointer;
		transition:
			transform 160ms ease,
			border-color 160ms ease,
			background-color 160ms ease;
	}

	.signal-grid button:hover,
	.signal-grid button:focus-visible,
	.signal-grid button.selected {
		transform: translateY(-1px);
		border-color: rgba(242, 171, 90, 0.55);
		background: rgba(242, 171, 90, 0.08);
	}

	.signal-grid button.revealed {
		border-color: rgba(255, 255, 255, 0.18);
	}

	.signal-grid span,
	.signal-grid strong {
		display: block;
	}

	.signal-grid span {
		font-family: var(--font-display);
		font-size: 1.15rem;
		line-height: 1.1;
	}

	.signal-grid strong {
		margin-top: 0.7rem;
		font-family: var(--font-mono);
		font-size: 0.7rem;
		text-transform: uppercase;
		letter-spacing: 0.16em;
		color: var(--text-muted);
	}

	.training-console__buttons {
		display: flex;
		flex-wrap: wrap;
		gap: 0.8rem;
	}

	.action-primary,
	.action-secondary {
		min-height: 3rem;
		padding: 0 1rem;
		border: 1px solid var(--line-soft);
		font-family: var(--font-mono);
		font-size: 0.72rem;
		text-transform: uppercase;
		letter-spacing: 0.16em;
		cursor: pointer;
	}

	.action-primary {
		background: var(--accent);
		color: var(--surface-strong);
		border-color: transparent;
	}

	.action-secondary {
		background: transparent;
		color: var(--text-strong);
	}

	.answer-board {
		display: grid;
		gap: 0.95rem;
		margin-top: 1.3rem;
		padding-top: 1.3rem;
		border-top: 1px solid rgba(255, 255, 255, 0.08);
	}

	.answer-board__grid article h4 {
		margin: 0.8rem 0 0.55rem;
		font-size: 1.05rem;
		line-height: 1.35;
	}

	.training-console__tip {
		margin-top: 1.3rem;
		padding: 1rem;
		background: rgba(255, 255, 255, 0.03);
		border: 1px solid rgba(255, 255, 255, 0.08);
	}

	@media (max-width: 1100px) {
		.training-deck__intro,
		.training-stage,
		.training-deck__summary,
		.signal-grid,
		.answer-board__grid {
			grid-template-columns: 1fr;
		}

		.mission-sheet__header,
		.training-console__actions {
			flex-direction: column;
		}

		.mission-sheet__meta {
			text-align: left;
		}
	}
</style>
