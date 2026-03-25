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
	let submitError = $state<string | null>(null);
	let opponentXp = $state(0);
	let opponentTime = $state(0);
	let opponentWrongTaps = $state(0);
	let opponentCluesFound = $state(0);
	let opponentOutcome = $state('success');
	let missionFinished = $state(false);
	let pollTimer: number | undefined;

	interface DuelResult {
		winner: string;
		challenge: typeof challenge;
	}

	let duelResult = $state<DuelResult | null>(null);

	$effect(() => {
		if (challenge.status === 'completed') {
			duelPhase = 'results';
			duelResult = { winner: challenge.winner ?? 'draw', challenge };
		}
	});

	$effect(() => {
		if (browser) {
			playerId = getOrCreatePlayerId(localStorage.getItem(PLAYER_ID_STORAGE_KEY));
			localStorage.setItem(PLAYER_ID_STORAGE_KEY, playerId);
		}
	});

	function startDuel() {
		duelPhase = 'playing';
	}

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

			duelResult = await res.json();
			duelPhase = 'results';
		} catch {
			submitError = 'Network error. Try again.';
			duelPhase = 'playing';
		}
	}

	function winnerLabel(winner: string): string {
		if (winner === 'challenger') return 'Challenger wins';
		if (winner === 'opponent') return 'You win';
		return 'Draw';
	}

	function winnerColor(winner: string): string {
		if (winner === 'opponent') return '#0a0a0a';
		if (winner === 'challenger') return '#e63946';
		return '#b88d45';
	}
</script>

<svelte:head>
	<title>ShieldByte | Duel</title>
</svelte:head>

<div class="duel-shell">
	{#if duelPhase === 'landing'}
		<main class="duel-main">
			<section class="duel-hero">
				<p class="mono-label">Head to head</p>
				<h1>Beat the challenger on the same scam round.</h1>
				<p class="duel-copy">
					{challengerRank} finished this mission already. Clear the same case with a better score, faster time, or fewer mistakes.
				</p>
			</section>

			<section class="duel-grid">
				<article class="duel-card">
					<p class="mono-label">Challenger score</p>
					<div class="duel-stats">
						<div><strong>{challenge.challenger_xp}</strong><span>XP</span></div>
						<div><strong>{challenge.challenger_time}s</strong><span>Time</span></div>
						<div><strong>{challenge.challenger_clues_found}/{challenge.challenger_clues_total}</strong><span>Clues</span></div>
						<div><strong>{challenge.challenger_wrong_taps}</strong><span>Errors</span></div>
					</div>
				</article>

				<article class="duel-card">
					<p class="mono-label">Mission brief</p>
					<h2>{mission.fraudType.replaceAll('_', ' ')}</h2>
					<p class="duel-copy">
						One round. Same rules. Read the message carefully and beat the existing run.
					</p>
					<div class="duel-meta">
						<span>{mission.difficulty}</span>
						<span>{mission.sender}</span>
					</div>
				</article>
			</section>

			<button class="duel-cta" onclick={startDuel}>Accept duel</button>
		</main>
	{:else if duelPhase === 'playing' || duelPhase === 'submitting'}
		<GameplayEngine {mission} streakDays={0} />

		{#if missionFinished}
			<div class="submit-overlay">
				<div class="submit-card">
					<p class="mono-label">Round complete</p>
					<h2>Submit your duel score.</h2>
					<p>Your run: <strong>{opponentXp} XP</strong> in <strong>{opponentTime}s</strong></p>
					<p>Challenger: <strong>{challenge.challenger_xp} XP</strong> in <strong>{challenge.challenger_time}s</strong></p>

					{#if submitError}
						<p class="submit-error">{submitError}</p>
					{/if}

					<button class="duel-cta" onclick={submitDuelResult} disabled={duelPhase === 'submitting'}>
						{duelPhase === 'submitting' ? 'Submitting...' : 'Submit score'}
					</button>
				</div>
			</div>
		{/if}
	{:else if duelPhase === 'results' && duelResult}
		<main class="duel-main">
			<section class="duel-results">
				<p class="mono-label">Result</p>
				<h1 style="color: {winnerColor(duelResult.winner)}">{winnerLabel(duelResult.winner)}</h1>
			</section>

			<section class="duel-grid">
				<article class="duel-card">
					<p class="mono-label">Challenger</p>
					<div class="duel-stats">
						<div><strong>{duelResult.challenge.challenger_xp}</strong><span>XP</span></div>
						<div><strong>{duelResult.challenge.challenger_time}s</strong><span>Time</span></div>
						<div><strong>{duelResult.challenge.challenger_clues_found}/{duelResult.challenge.challenger_clues_total}</strong><span>Clues</span></div>
						<div><strong>{duelResult.challenge.challenger_wrong_taps}</strong><span>Errors</span></div>
					</div>
				</article>

				<article class="duel-card duel-card--accent">
					<p class="mono-label">You</p>
					<div class="duel-stats">
						<div><strong>{duelResult.challenge.opponent_xp}</strong><span>XP</span></div>
						<div><strong>{duelResult.challenge.opponent_time}s</strong><span>Time</span></div>
						<div><strong>{duelResult.challenge.opponent_clues_found}/{duelResult.challenge.opponent_clues_total}</strong><span>Clues</span></div>
						<div><strong>{duelResult.challenge.opponent_wrong_taps}</strong><span>Errors</span></div>
					</div>
				</article>
			</section>

			<div class="results-actions">
				<a href="/play" class="duel-cta">Play another mission</a>
				<a href="/" class="duel-cta duel-cta--ghost">Back home</a>
			</div>
		</main>
	{/if}
</div>

<style>
	.duel-shell {
		padding: 1.5rem clamp(1rem, 4vw, 3rem) 3rem;
	}

	.mono-label {
		margin: 0;
		font-family: var(--font-mono);
		font-size: 0.68rem;
		letter-spacing: 0.18em;
		text-transform: uppercase;
		color: var(--text-muted);
	}

	.duel-main {
		max-width: 980px;
		margin: 0 auto;
		display: grid;
		gap: 1rem;
	}

	.duel-hero,
	.duel-card,
	.submit-card,
	.duel-results {
		border: 1px solid rgba(10, 10, 10, 0.1);
		border-radius: 1.2rem;
		background:
			radial-gradient(circle at top right, rgba(230, 57, 70, 0.06), transparent 24%),
			linear-gradient(180deg, rgba(255, 255, 255, 0.28), rgba(255, 255, 255, 0.12)),
			var(--surface-1);
		box-shadow: var(--shadow-hud);
	}

	.duel-hero,
	.duel-card,
	.submit-card,
	.duel-results {
		padding: 1.25rem;
	}

	.duel-hero h1,
	.duel-results h1,
	.duel-card h2 {
		margin: 0.45rem 0 0;
		font-family: var(--font-display);
		font-weight: 600;
		line-height: 0.98;
	}

	.duel-hero h1,
	.duel-results h1 {
		font-size: clamp(2.4rem, 5vw, 4.2rem);
		max-width: 14ch;
	}

	.duel-copy,
	.submit-card p {
		margin: 0.8rem 0 0;
		color: var(--text-soft);
		line-height: 1.72;
	}

	.duel-grid {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 1rem;
	}

	.duel-card--accent {
		border-color: rgba(230, 57, 70, 0.18);
	}

	.duel-stats {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: 0.75rem;
		margin-top: 1rem;
	}

	.duel-stats div {
		padding: 0.8rem;
		border: 1px solid rgba(10, 10, 10, 0.08);
		border-radius: 1rem;
		background: rgba(255, 255, 255, 0.025);
	}

	.duel-stats strong {
		display: block;
		font-family: var(--font-display);
		font-size: 1.7rem;
		font-weight: 600;
		line-height: 1;
	}

	.duel-stats span,
	.duel-meta span {
		font-family: var(--font-mono);
		font-size: 0.64rem;
		letter-spacing: 0.14em;
		text-transform: uppercase;
		color: var(--text-muted);
	}

	.duel-meta {
		display: flex;
		flex-wrap: wrap;
		gap: 0.55rem;
		margin-top: 1rem;
	}

	.duel-meta span {
		padding: 0.4rem 0.65rem;
		border: 1px solid rgba(10, 10, 10, 0.1);
		border-radius: 999px;
		background: rgba(255, 255, 255, 0.2);
	}

	.duel-cta {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		min-height: 3rem;
		padding: 0 1.25rem;
		border-radius: 999px;
		background: linear-gradient(135deg, var(--accent-cyan), var(--accent-hot));
		color: #f4f4f2;
		font-family: var(--font-mono);
		font-size: 0.7rem;
		font-weight: 600;
		letter-spacing: 0.16em;
		text-transform: uppercase;
		text-decoration: none;
		border: none;
		cursor: pointer;
	}

	.duel-cta--ghost {
		background: transparent;
		border: 1px solid rgba(10, 10, 10, 0.12);
		color: var(--text-strong);
	}

	.submit-overlay {
		position: fixed;
		inset: 0;
		z-index: 100;
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 1rem;
		background: rgba(244, 244, 242, 0.74);
		backdrop-filter: blur(10px);
	}

	.submit-card {
		max-width: 30rem;
		text-align: center;
	}

	.submit-card h2 {
		margin: 0.45rem 0 0;
		font-family: var(--font-display);
		font-size: 2.2rem;
		font-weight: 600;
	}

	.submit-card strong {
		color: var(--accent-hot);
	}

	.submit-error {
		color: var(--accent-hot) !important;
		font-family: var(--font-mono);
		font-size: 0.72rem;
		letter-spacing: 0.1em;
		text-transform: uppercase;
	}

	.results-actions {
		display: flex;
		gap: 0.85rem;
	}

	@media (max-width: 720px) {
		.duel-shell {
			padding: 1rem 0.9rem 2.5rem;
		}

		.duel-grid,
		.duel-stats {
			grid-template-columns: 1fr;
		}

		.duel-hero,
		.duel-card,
		.submit-card,
		.duel-results {
			padding: 1rem;
			border-radius: 1rem;
		}

		.results-actions {
			flex-direction: column;
		}
	}
</style>
