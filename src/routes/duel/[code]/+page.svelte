<script lang="ts">
	import { browser } from '$app/environment';
	import GameplayEngine from '$lib/components/gameplay/GameplayEngine.svelte';
	import { PLAYER_ID_STORAGE_KEY, getOrCreatePlayerId } from '$lib/gameplay/engine.js';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
	let code = $derived(data.code);
	let challenge = $derived(data.challenge);
	let mission = $derived(data.mission);
	let challengerRank = $derived(data.challengerRank);

	let duelPhase = $state<'landing' | 'playing' | 'submitting' | 'results'>('landing');
	let playerId = $state<string | null>(null);

	// Set initial phase from server data
	$effect(() => {
		if (challenge.status === 'completed') {
			duelPhase = 'results';
		}
	});

	interface DuelResult {
		winner: string;
		challenge: typeof challenge;
	}
	let duelResult = $state<DuelResult | null>(null);

	$effect(() => {
		if (challenge.status === 'completed') {
			duelResult = { winner: challenge.winner ?? 'draw', challenge };
		}
	});
	let submitError = $state<string | null>(null);

	// Initialize player ID
	$effect(() => {
		if (browser) {
			playerId = getOrCreatePlayerId(localStorage.getItem(PLAYER_ID_STORAGE_KEY));
			localStorage.setItem(PLAYER_ID_STORAGE_KEY, playerId);
		}
	});

	function startDuel() {
		duelPhase = 'playing';
	}

	// Called via a MutationObserver-style approach: watch for the result screen to appear
	// Since GameplayEngine doesn't expose an onComplete callback, we'll poll for the
	// mission attempt save indicator and then submit scores.
	// ACTUALLY: We'll listen to the GameplayEngine's DOM for the result card and scrape XP
	// OR — simplest approach — we overlay a "Submit Scores" button after the game ends.
	let opponentXp = $state(0);
	let opponentTime = $state(0);
	let opponentWrongTaps = $state(0);
	let opponentCluesFound = $state(0);
	let opponentOutcome = $state('success');
	let missionFinished = $state(false);

	// Poll for the result element in GameplayEngine
	let pollTimer: number | undefined;

	$effect(() => {
		if (duelPhase === 'playing' && browser) {
			pollTimer = window.setInterval(() => {
				const resultEl = document.querySelector('[data-result-xp]');
				if (resultEl) {
					opponentXp = parseInt(resultEl.getAttribute('data-result-xp') ?? '0', 10);
					opponentTime = parseInt(resultEl.getAttribute('data-result-time') ?? '60', 10);
					opponentWrongTaps = parseInt(resultEl.getAttribute('data-result-wrong') ?? '0', 10);
					opponentCluesFound = parseInt(resultEl.getAttribute('data-result-found') ?? '0', 10);
					opponentOutcome = resultEl.getAttribute('data-result-outcome') ?? 'success';
					missionFinished = true;
					clearInterval(pollTimer);
				}
			}, 500);
		}

		return () => {
			if (pollTimer) clearInterval(pollTimer);
		};
	});

	async function submitDuelResult() {
		if (!playerId) return;

		duelPhase = 'submitting';
		submitError = null;

		try {
			const res = await fetch('/api/challenges/submit', {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({
					code,
					user_id: playerId,
					xp_earned: opponentXp,
					time_taken: opponentTime,
					wrong_taps: opponentWrongTaps,
					clues_found: opponentCluesFound,
					clues_total: challenge.challenger_clues_total,
					outcome: opponentOutcome
				})
			});

			if (!res.ok) {
				const err = await res.json();
				submitError = err.error || 'Failed to submit';
				duelPhase = 'playing';
				return;
			}

			const data = await res.json();
			duelResult = data;
			duelPhase = 'results';
		} catch (e) {
			submitError = 'Network error. Try again.';
			duelPhase = 'playing';
		}
	}

	function winnerLabel(winner: string): string {
		if (winner === 'challenger') return '🏆 Challenger Wins!';
		if (winner === 'opponent') return '🏆 You Win!';
		return '🤝 It\'s a Draw!';
	}

	function winnerColor(winner: string): string {
		if (winner === 'opponent') return '#7df2c9';
		if (winner === 'challenger') return '#ff6f61';
		return '#f5c46c';
	}
</script>

<svelte:head>
	<title>ShieldByte | Duel</title>
</svelte:head>

<div class="duel-shell">
	<div class="duel-grain"></div>

	{#if duelPhase === 'landing'}
		<!-- ─── Landing: Show challenger stats ─── -->
		<main class="duel-landing">
			<div class="duel-landing__icon">⚔️</div>
			<h1 class="duel-landing__title">Head-to-Head Challenge</h1>
			<p class="duel-landing__sub">
				<strong>{challengerRank}</strong> is challenging you to beat their score on this mission.
			</p>

			<div class="challenger-card">
				<p class="mono-label">Challenger's Score</p>
				<div class="challenger-stats">
					<div class="challenger-stat">
						<strong>{challenge.challenger_xp}</strong>
						<span>XP</span>
					</div>
					<div class="challenger-stat">
						<strong>{challenge.challenger_time}s</strong>
						<span>Time</span>
					</div>
					<div class="challenger-stat">
						<strong>{challenge.challenger_clues_found}/{challenge.challenger_clues_total}</strong>
						<span>Clues</span>
					</div>
					<div class="challenger-stat">
						<strong>{challenge.challenger_wrong_taps}</strong>
						<span>Errors</span>
					</div>
				</div>
			</div>

			<div class="mission-brief">
				<p class="mono-label">Mission brief</p>
				<p>Identify the hidden threat signals. Don't fall for the traps!</p>
				<div class="mission-meta">
					<span>Difficulty: {mission.difficulty}</span>
					<span>•</span>
					<span>Type: {mission.fraudType.replace('_', ' ')}</span>
				</div>
			</div>

			<button class="duel-cta" onclick={startDuel}>
				ACCEPT DUEL — BEAT THEIR SCORE
			</button>
			<p class="duel-landing__note">No sign-up required. Play instantly.</p>
		</main>

	{:else if duelPhase === 'playing' || duelPhase === 'submitting'}
		<!-- ─── Playing: GameplayEngine + Submit overlay ─── -->
		<GameplayEngine {mission} streakDays={0} />

		{#if missionFinished}
			<div class="submit-overlay">
				<div class="submit-card">
					<h2>Mission Complete!</h2>
					<p>Your XP: <strong>{opponentXp}</strong> | Time: <strong>{opponentTime}s</strong></p>
					<p>vs Challenger: <strong>{challenge.challenger_xp} XP</strong> in <strong>{challenge.challenger_time}s</strong></p>

					{#if submitError}
						<p class="submit-error">{submitError}</p>
					{/if}

					<button
						class="duel-cta"
						onclick={submitDuelResult}
						disabled={duelPhase === 'submitting'}
					>
						{duelPhase === 'submitting' ? 'Submitting...' : 'SUBMIT & SEE RESULTS'}
					</button>
				</div>
			</div>
		{/if}

	{:else if duelPhase === 'results' && duelResult}
		<!-- ─── Results: Head-to-head comparison ─── -->
		<main class="results-main">
			<div class="results-header">
				<h1 style="color: {winnerColor(duelResult.winner)}">{winnerLabel(duelResult.winner)}</h1>
			</div>

			<div class="hth-grid">
				<div class="hth-card">
					<p class="mono-label">Challenger</p>
					<div class="hth-stats">
						<div class="hth-stat">
							<strong>{duelResult.challenge.challenger_xp}</strong>
							<span>XP</span>
						</div>
						<div class="hth-stat">
							<strong>{duelResult.challenge.challenger_time}s</strong>
							<span>Time</span>
						</div>
						<div class="hth-stat">
							<strong>{duelResult.challenge.challenger_clues_found}/{duelResult.challenge.challenger_clues_total}</strong>
							<span>Clues</span>
						</div>
						<div class="hth-stat">
							<strong>{duelResult.challenge.challenger_wrong_taps}</strong>
							<span>Errors</span>
						</div>
					</div>
					{#if duelResult.winner === 'challenger'}
						<div class="hth-winner-tag">WINNER</div>
					{/if}
				</div>

				<div class="hth-vs">VS</div>

				<div class="hth-card hth-card--you">
					<p class="mono-label">You</p>
					<div class="hth-stats">
						<div class="hth-stat">
							<strong>{duelResult.challenge.opponent_xp}</strong>
							<span>XP</span>
						</div>
						<div class="hth-stat">
							<strong>{duelResult.challenge.opponent_time}s</strong>
							<span>Time</span>
						</div>
						<div class="hth-stat">
							<strong>{duelResult.challenge.opponent_clues_found}/{duelResult.challenge.opponent_clues_total}</strong>
							<span>Clues</span>
						</div>
						<div class="hth-stat">
							<strong>{duelResult.challenge.opponent_wrong_taps}</strong>
							<span>Errors</span>
						</div>
					</div>
					{#if duelResult.winner === 'opponent'}
						<div class="hth-winner-tag">WINNER</div>
					{/if}
				</div>
			</div>

			<div class="results-actions">
				<a href="/play" class="duel-cta">Play Another Mission</a>
				<a href="/" class="duel-cta duel-cta--ghost">Back to Home</a>
			</div>
		</main>
	{/if}
</div>

<style>
	.duel-shell {
		--font-display: 'Cormorant Garamond', serif;
		--font-mono: 'IBM Plex Mono', monospace;
		--mint: #7df2c9;
		--amber: #f5c46c;
		--line: rgba(138, 190, 214, 0.14);
		--panel: rgba(8, 15, 24, 0.88);
		--muted: rgba(236, 230, 219, 0.55);
		position: relative;
		min-height: 100vh;
		color: #f2eee7;
	}

	.duel-grain {
		position: fixed;
		inset: 0;
		pointer-events: none;
		opacity: 0.1;
		background-image:
			linear-gradient(rgba(255, 255, 255, 0.04) 1px, transparent 1px),
			linear-gradient(90deg, rgba(255, 255, 255, 0.03) 1px, transparent 1px);
		background-size: 52px 52px;
	}

	.mono-label {
		font-family: var(--font-mono);
		font-size: 0.68rem;
		letter-spacing: 0.18em;
		text-transform: uppercase;
		color: var(--muted);
		margin: 0;
	}

	/* ─── Landing ─── */
	.duel-landing {
		max-width: 560px;
		margin: 0 auto;
		padding: 4rem 2rem;
		text-align: center;
	}

	.duel-landing__icon {
		font-size: 4rem;
		margin-bottom: 1rem;
	}

	.duel-landing__title {
		font-family: var(--font-display);
		font-size: clamp(2.5rem, 5vw, 4rem);
		font-weight: 600;
		margin: 0;
		background: linear-gradient(135deg, var(--mint), var(--amber));
		-webkit-background-clip: text;
		-webkit-text-fill-color: transparent;
		background-clip: text;
	}

	.duel-landing__sub {
		color: var(--muted);
		font-size: 1.1rem;
		margin: 0.8rem 0 2rem;
		line-height: 1.6;
	}

	.duel-landing__note {
		color: var(--muted);
		font-size: 0.8rem;
		margin-top: 1rem;
	}

	.challenger-card {
		padding: 1.5rem;
		border: 1px solid rgba(125, 242, 201, 0.3);
		background:
			radial-gradient(circle at top, rgba(125, 242, 201, 0.08), transparent 50%),
			var(--panel);
		margin-bottom: 1.5rem;
	}

	.challenger-stats,
	.hth-stats {
		display: grid;
		grid-template-columns: repeat(4, 1fr);
		gap: 0.8rem;
		margin-top: 1rem;
	}

	.challenger-stat,
	.hth-stat {
		text-align: center;
	}

	.challenger-stat strong,
	.hth-stat strong {
		display: block;
		font-family: var(--font-display);
		font-size: 1.8rem;
		font-weight: 600;
		color: var(--mint);
	}

	.challenger-stat span,
	.hth-stat span {
		font-family: var(--font-mono);
		font-size: 0.62rem;
		letter-spacing: 0.14em;
		text-transform: uppercase;
		color: var(--muted);
	}

	.mission-brief {
		padding: 1.2rem;
		border: 1px solid var(--line);
		background: var(--panel);
		text-align: left;
		margin-bottom: 2rem;
	}

	.mission-brief p {
		margin: 0.4rem 0 0;
		color: rgba(236, 230, 219, 0.8);
	}

	.mission-meta {
		display: flex;
		gap: 0.6rem;
		margin-top: 0.8rem;
		font-family: var(--font-mono);
		font-size: 0.7rem;
		color: var(--mint);
		letter-spacing: 0.1em;
	}

	.duel-cta {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		min-height: 3.2rem;
		padding: 0 2rem;
		font-family: var(--font-mono);
		font-size: 0.76rem;
		font-weight: 600;
		letter-spacing: 0.14em;
		text-transform: uppercase;
		text-decoration: none;
		cursor: pointer;
		border: none;
		background: linear-gradient(135deg, var(--mint), #4fd1c5);
		color: #052018;
		transition: all 0.2s ease;
		width: 100%;
	}

	.duel-cta:hover {
		filter: brightness(1.1);
		transform: translateY(-1px);
	}

	.duel-cta:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.duel-cta--ghost {
		background: transparent;
		border: 1px solid var(--line);
		color: #f2eee7;
	}

	/* ─── Submit Overlay ─── */
	.submit-overlay {
		position: fixed;
		inset: 0;
		z-index: 100;
		display: flex;
		align-items: center;
		justify-content: center;
		background: rgba(4, 6, 11, 0.85);
		backdrop-filter: blur(12px);
	}

	.submit-card {
		max-width: 420px;
		padding: 2rem;
		border: 1px solid rgba(125, 242, 201, 0.3);
		background: var(--panel);
		text-align: center;
	}

	.submit-card h2 {
		font-family: var(--font-display);
		font-size: 2rem;
		margin: 0 0 0.8rem;
	}

	.submit-card p {
		color: var(--muted);
		margin: 0.3rem 0;
	}

	.submit-card strong {
		color: var(--mint);
	}

	.submit-error {
		color: #ff6f61 !important;
		font-family: var(--font-mono);
		font-size: 0.75rem;
	}

	/* ─── Results ─── */
	.results-main {
		max-width: 720px;
		margin: 0 auto;
		padding: 3rem 2rem;
	}

	.results-header {
		text-align: center;
		margin-bottom: 2rem;
	}

	.results-header h1 {
		font-family: var(--font-display);
		font-size: clamp(2.5rem, 5vw, 4rem);
		font-weight: 700;
		margin: 0;
	}

	.hth-grid {
		display: grid;
		grid-template-columns: 1fr auto 1fr;
		gap: 1rem;
		align-items: center;
	}

	.hth-card {
		padding: 1.5rem;
		border: 1px solid var(--line);
		background: var(--panel);
		position: relative;
	}

	.hth-card--you {
		border-color: rgba(125, 242, 201, 0.3);
	}

	.hth-vs {
		font-family: var(--font-display);
		font-size: 2rem;
		font-weight: 700;
		color: var(--amber);
		text-align: center;
	}

	.hth-winner-tag {
		position: absolute;
		top: -0.7rem;
		right: -0.5rem;
		background: var(--mint);
		color: #052018;
		font-family: var(--font-mono);
		font-size: 0.6rem;
		font-weight: 700;
		letter-spacing: 0.14em;
		padding: 0.3rem 0.6rem;
		text-transform: uppercase;
	}

	.results-actions {
		display: flex;
		gap: 1rem;
		margin-top: 2rem;
	}

	@media (max-width: 640px) {
		.hth-grid {
			grid-template-columns: 1fr;
		}

		.hth-vs {
			padding: 0.5rem 0;
		}

		.challenger-stats,
		.hth-stats {
			grid-template-columns: repeat(2, 1fr);
		}

		.results-actions {
			flex-direction: column;
		}
	}
</style>
