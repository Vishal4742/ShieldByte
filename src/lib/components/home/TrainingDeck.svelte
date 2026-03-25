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
	const accuracy = $derived(totalSignals > 0 ? Math.round((selectedCount / totalSignals) * 100) : 0);
	const score = $derived((selectedCount * 150) + (hasSubmitted ? 250 : 0));
	const messageLines = $derived(
		(mission?.messageBody || article?.scenarioSummary || '')
			.split(/\n+/)
			.map((line) => line.trim())
			.filter((line) => line.length > 0)
	);
	const missionType = $derived(mission ? mission.simulationType.replace('_', ' ') : 'Classifier drill');
</script>

<section class="training-app" id="mission">
	<div class="training-app__header">
		<div>
			<p class="training-app__eyebrow">Practice arena</p>
			<h2>Train the mission before you go live.</h2>
		</div>

		<div class="training-app__stats">
			<article>
				<span>Mission score</span>
				<strong>{String(score).padStart(4, '0')}</strong>
			</article>
			<article>
				<span>Signals marked</span>
				<strong>{String(selectedCount).padStart(2, '0')} / {String(totalSignals).padStart(2, '0')}</strong>
			</article>
			<article>
				<span>Read accuracy</span>
				<strong>{String(accuracy).padStart(2, '0')}%</strong>
			</article>
		</div>
	</div>

	{#if article}
		<div class="training-app__grid">
			<section class="training-slate training-slate--intel">
				<div class="slate-heading">
					<div>
				<p>Mission dossier</p>
						<h3>{article.title}</h3>
					</div>
					<a href={`/articles/${article.id}`}>Full brief</a>
				</div>

				<div class="signal-pill-row">
					<span>{missionType}</span>
					<span>{mission?.difficulty ?? 'guided'}</span>
					<span>{mission?.sender ?? article.source}</span>
				</div>

				<div class="message-window">
					<header>
						<span>Incoming scenario</span>
						<strong>{mission ? 'Live simulation' : 'Training scenario'}</strong>
					</header>

					<div class="message-window__body">
						{#if mission && messageLines.length > 0}
							{#each messageLines as line}
								<p>{line}</p>
							{/each}
						{:else}
							<p>{article.scenarioSummary}</p>
							<p>{article.body}</p>
						{/if}
					</div>
				</div>

				<div class="intel-strip">
					<div>
						<span>Profile</span>
						<p>{article.victimProfile}</p>
					</div>
					<div>
						<span>Defensive tip</span>
						<p>{mission?.tip ?? article.tip}</p>
					</div>
				</div>
			</section>

			<section class="training-slate training-slate--control">
				<div class="slate-heading">
					<div>
						<p>Action grid</p>
						<h3>Lock every signal you can defend.</h3>
					</div>
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
							<strong>{selected.includes(item.id) ? 'Locked in' : 'Mark signal'}</strong>
						</button>
					{/each}
				</div>

				<div class="control-row">
					<div class="progress-module">
						<span>Session state</span>
						<strong>{hasSubmitted ? 'Reviewed' : 'Active'}</strong>
						<p>Lock the signals you would stop before a real player loses shields.</p>
					</div>

					<div class="action-stack">
						<button type="button" class="action-primary" onclick={reviewAnswers}>Reveal evaluation</button>
						<button type="button" class="action-secondary" onclick={resetExercise}>Reset drill</button>
					</div>
				</div>

				{#if hasSubmitted}
					<div class="evaluation-board">
						<div class="slate-heading slate-heading--compact">
							<div>
								<p>Evaluation log</p>
								<h3>Why each signal matters</h3>
							</div>
						</div>

						<div class="evaluation-board__grid">
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
			</section>
		</div>
	{:else}
		<div class="training-empty">
			No classified article is available yet. Run ingestion and classification first to unlock the mission board.
		</div>
	{/if}
</section>

<style>
	.training-app {
		display: grid;
		gap: 1.2rem;
		margin-top: 2.2rem;
	}

	.training-app__eyebrow,
	.training-app__stats span,
	.slate-heading p,
	.signal-pill-row span,
	.message-window header span,
	.intel-strip span,
	.progress-module span,
	.evaluation-board span,
	.training-empty {
		font-family: var(--font-mono);
		font-size: 0.72rem;
		text-transform: uppercase;
		letter-spacing: 0.18em;
		color: var(--text-muted);
	}

	.training-app__header {
		display: grid;
		grid-template-columns: minmax(0, 1.05fr) minmax(22rem, 0.95fr);
		gap: 1rem;
		align-items: end;
	}

	.training-app__header h2,
	.slate-heading h3 {
		margin: 0.4rem 0 0;
		font-family: var(--font-display);
		font-size: clamp(2.5rem, 6vw, 4.7rem);
		font-weight: 500;
		line-height: 0.92;
	}

	.training-app__stats {
		display: grid;
		grid-template-columns: repeat(3, minmax(0, 1fr));
		gap: 0.9rem;
	}

	.training-app__stats article,
	.training-empty {
		padding: 1rem;
		border: 1px solid var(--line-soft);
		background:
			radial-gradient(circle at top right, rgba(114, 255, 214, 0.08), transparent 24%),
			linear-gradient(180deg, rgba(255, 255, 255, 0.04), rgba(255, 255, 255, 0.01)),
			var(--surface-1);
		box-shadow: var(--shadow-arcade);
	}

	.training-app__stats strong {
		display: block;
		margin-top: 0.55rem;
		font-family: var(--font-display);
		font-size: 2.1rem;
		line-height: 1;
	}

	.training-app__grid {
		display: grid;
		grid-template-columns: minmax(0, 1.08fr) minmax(24rem, 0.92fr);
		gap: 1rem;
	}

	.training-slate {
		position: relative;
		padding: 1.3rem;
		border: 1px solid var(--line-soft);
		background:
			radial-gradient(circle at top right, rgba(255, 183, 77, 0.14), transparent 28%),
			radial-gradient(circle at bottom left, rgba(114, 255, 214, 0.06), transparent 22%),
			linear-gradient(180deg, rgba(255, 255, 255, 0.04), rgba(255, 255, 255, 0.01)),
			var(--surface-2);
		overflow: hidden;
		box-shadow: var(--shadow-arcade);
	}

	.training-slate::before {
		content: '';
		position: absolute;
		inset: 0.85rem;
		border: 1px dashed rgba(255, 255, 255, 0.08);
		pointer-events: none;
	}

	.slate-heading,
	.message-window header,
	.control-row,
	.evaluation-board__grid article div {
		display: flex;
		justify-content: space-between;
		gap: 1rem;
		align-items: flex-start;
	}

	.slate-heading a {
		font-family: var(--font-mono);
		font-size: 0.72rem;
		text-transform: uppercase;
		letter-spacing: 0.16em;
		color: var(--accent-soft);
		text-decoration: none;
	}

	.signal-pill-row {
		display: flex;
		flex-wrap: wrap;
		gap: 0.65rem;
		margin-top: 1rem;
	}

	.signal-pill-row span {
		padding: 0.45rem 0.7rem;
		border: 1px solid rgba(255, 255, 255, 0.08);
		background: rgba(255, 255, 255, 0.04);
		color: var(--text-strong);
	}

	.message-window {
		margin-top: 1rem;
		border: 1px solid rgba(255, 255, 255, 0.08);
		background: rgba(5, 8, 14, 0.65);
	}

	.message-window header {
		padding: 0.9rem 1rem;
		border-bottom: 1px solid rgba(255, 255, 255, 0.08);
	}

	.message-window header strong {
		color: var(--text-strong);
		font-size: 0.95rem;
	}

	.message-window__body {
		display: grid;
		gap: 0.9rem;
		padding: 1rem;
		max-height: 24rem;
		overflow: auto;
	}

	.message-window__body p,
	.intel-strip p,
	.progress-module p,
	.evaluation-board__grid article p,
	.training-empty {
		margin: 0;
		color: var(--text-soft);
		line-height: 1.8;
	}

	.intel-strip {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: 0.9rem;
		margin-top: 1rem;
	}

	.intel-strip div,
	.progress-module,
	.evaluation-board__grid article {
		padding: 1rem;
		border: 1px solid rgba(255, 255, 255, 0.08);
		background: rgba(255, 255, 255, 0.03);
	}

	.intel-strip p {
		margin-top: 0.55rem;
	}

	.signal-grid,
	.evaluation-board__grid {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: 0.8rem;
		margin-top: 1rem;
	}

	.signal-grid button {
		padding: 1rem;
		border: 1px solid rgba(255, 255, 255, 0.1);
		background: rgba(255, 255, 255, 0.03);
		color: var(--text-strong);
		text-align: left;
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
		border-color: rgba(255, 183, 77, 0.52);
		background: rgba(255, 183, 77, 0.08);
	}

	.signal-grid span,
	.signal-grid strong {
		display: block;
	}

	.signal-grid span {
		font-family: var(--font-display);
		font-size: 1.12rem;
		line-height: 1.08;
	}

	.signal-grid strong {
		margin-top: 0.7rem;
		font-family: var(--font-mono);
		font-size: 0.68rem;
		text-transform: uppercase;
		letter-spacing: 0.16em;
		color: var(--text-muted);
	}

	.control-row {
		margin-top: 1rem;
		align-items: stretch;
	}

	.progress-module {
		flex: 1;
	}

	.progress-module strong {
		display: block;
		margin-top: 0.5rem;
		font-family: var(--font-display);
		font-size: 1.7rem;
		line-height: 1;
	}

	.progress-module p {
		margin-top: 0.7rem;
	}

	.action-stack {
		display: grid;
		gap: 0.75rem;
		min-width: 12rem;
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
		background: linear-gradient(135deg, var(--accent-gold), #ffd48a);
		color: #0b111b;
		border-color: transparent;
	}

	.action-secondary {
		background: transparent;
		color: var(--text-strong);
	}

	.evaluation-board {
		margin-top: 1rem;
		padding-top: 1rem;
		border-top: 1px solid rgba(255, 255, 255, 0.08);
	}

	.slate-heading--compact h3 {
		font-size: clamp(1.8rem, 4vw, 2.8rem);
	}

	.evaluation-board__grid article h4 {
		margin: 0.8rem 0 0.55rem;
		font-size: 1rem;
		line-height: 1.35;
	}

	@media (max-width: 1100px) {
		.training-app__header,
		.training-app__stats,
		.training-app__grid,
		.intel-strip,
		.signal-grid,
		.evaluation-board__grid {
			grid-template-columns: 1fr;
		}

		.slate-heading,
		.message-window header,
		.control-row {
			flex-direction: column;
		}

		.action-stack {
			min-width: 0;
		}
	}
</style>
