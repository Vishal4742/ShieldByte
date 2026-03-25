<script lang="ts">
	import { browser } from '$app/environment';
	import { onMount } from 'svelte';
	import {
		buildMissionResultSummary,
		buildMissionSegments,
		consumeLife,
		resolveLivesState,
		LOW_TIME_THRESHOLD_SECONDS,
		MISSION_DURATION_SECONDS,
		PLAYER_ID_STORAGE_KEY,
		getOrCreatePlayerId,
		type LivesState,
		type PlayerStatsSnapshot,
		type MissionResultSummary
	} from '$lib/gameplay/engine.js';
	import type { ThreatMission } from '$lib/types/mission.js';

	interface Props {
		mission: ThreatMission;
		streakDays?: number;
	}

let { mission, streakDays = 0 }: Props = $props();

const PREDICTION_SESSION_KEY_PREFIX = 'shieldbyte:prediction';

const segments = $derived(buildMissionSegments(mission.messageBody, mission.clues));
	const matchedClueIds = $derived(
		new Set(
			segments
				.map((segment) => segment.clueId)
				.filter((clueId): clueId is number => clueId !== null)
		)
	);
	const fallbackClues = $derived(
		mission.clues.filter((clue) => !matchedClueIds.has(clue.id))
	);

	let foundIds = $state<number[]>([]);
	const foundIdSet = $derived(new Set(foundIds));
	let wrongTaps = $state(0);
	let secondsRemaining = $state(MISSION_DURATION_SECONDS);
	let paused = $state(false);
	let missionState = $state<'ready' | 'judging' | 'active' | 'finished'>('ready');
	let livesState = $state<LivesState>({
		lives: 3,
		lastUpdatedAt: Date.now(),
		nextLifeInMs: null
	});
	let result = $state<MissionResultSummary | null>(null);
	let flashState = $state<'idle' | 'correct' | 'wrong'>('idle');
	let feedbackTitle = $state('Mission ready');
	let feedbackBody = $state('Tap the scam clues inside the message before the clock runs out.');
	let currentTime = $state(Date.now());
	let playerId = $state<string | null>(null);
	let saveState = $state<'idle' | 'saving' | 'saved' | 'error'>('idle');
	let saveMessage = $state('Mission result will save when the run ends.');
	let profileSnapshot = $state<PlayerStatsSnapshot | null>(null);
	let playerToken = $state<string | null>(null);

	// ── AI Feedback state ──
	interface AIFeedback {
		feedbackText: string;
		patternIdentified: string;
		actionableTip: string;
		encouragement: string;
	}
	let aiFeedback = $state<AIFeedback | null>(null);
	let feedbackLoading = $state(false);
	let feedbackError = $state(false);

	// ── Badge & rank-up state ──
	interface EarnedBadge {
		badgeId: string;
		name: string;
		description: string;
		category: string;
		earnedAt: string;
	}
	interface RankUp {
		from: string;
		to: string;
	}
	let newBadges = $state<EarnedBadge[]>([]);
	let rankUp = $state<RankUp | null>(null);

	// ── Referral Share state ──
	let tickTimer: number | undefined;
	let livesTimer: number | undefined;
	let flashTimer: number | undefined;

let comboChain = $state(0);
let bestCombo = $state(0);
let verdictChoice = $state<'scam' | 'safe' | null>(null);
let verdictCorrect = $state<boolean | null>(null);
let verdictProcessing = $state(false);
const missionLabel = $derived(mission.fraudType.replaceAll('_', ' '));
const expectedVerdictLabel = $derived(mission.expectedVerdict === 'scam' ? 'scam' : 'safe');
const beginnerSteps = [
	'Read the case and predict scam or safe.',
	'Then tap the risky words or phrases.',
	'Each wrong move costs a shield before the timer runs out.'
];
const verdictStatusLabel = $derived.by(() => {
	if (missionState === 'ready') return 'Pending';
	if (verdictChoice === null) return 'Choose';
	return verdictCorrect ? 'Correct' : 'Wrong';
});
const verdictStatusDetail = $derived.by(() => {
	if (verdictChoice === null) {
		return 'Call the message before clue hunting.';
	}

	return verdictCorrect
		? `You correctly predicted this message is ${expectedVerdictLabel}.`
		: `You predicted ${verdictChoice}, but the correct answer is ${expectedVerdictLabel}.`;
});

	const allCluesFound = $derived(foundIds.length === mission.clues.length);
	const timerTone = $derived(secondsRemaining <= LOW_TIME_THRESHOLD_SECONDS ? 'critical' : 'steady');
	const hasLives = $derived(livesState.lives > 0);
	const completionPercent = $derived(Math.round((foundIds.length / mission.clues.length) * 100));
	const activeComboMultiplier = $derived(Math.max(comboChain, 1));
	const shieldDisplay = $derived(Array.from({ length: 3 }, (_, index) => index < livesState.lives));

	const comboLabel = $derived(comboChain >= 3 ? 'Hot streak' : comboChain > 0 ? 'Building' : 'Cold start');
	const threatPercent = $derived.by(() => {
		if (result) {
			if (result.outcome === 'success') return 18;
			if (result.outcome === 'timeout') return 82;
			return 100;
		}

		const timerPressure = ((MISSION_DURATION_SECONDS - secondsRemaining) / MISSION_DURATION_SECONDS) * 68;
		const mistakePressure = wrongTaps * 14;
		return Math.min(100, Math.max(12, Math.round(timerPressure + mistakePressure + 12)));
	});
	const threatStatus = $derived.by(() => {
		if (threatPercent < 34) return 'stable';
		if (threatPercent < 68) return 'rising';
		return 'critical';
	});
	const threatLabel = $derived.by(() => {
		if (threatStatus === 'stable') return 'Threat contained';
		if (threatStatus === 'rising') return 'Threat rising';
		return 'Threat critical';
	});
	const resultGrade = $derived.by(() => {
		if (!result) return null;
		if (result.outcome === 'success' && result.wrongTaps === 0 && result.secondsRemaining >= 20) {
			return 'Perfect Clear';
		}
		if (result.outcome === 'success') {
			return 'Clean Save';
		}
		if (result.outcome === 'timeout') {
			return 'Close Call';
		}
		return 'Breach';
	});
	const nextHint = $derived(
		mission.clues.find((clue) => !foundIdSet.has(clue.id))?.explanation ??
			'No clues remain. Finish the run.'
	);
	const lifeCountdownLabel = $derived.by(() => {
		if (livesState.nextLifeInMs === null) {
			return 'Shields full';
		}

		const totalSeconds = Math.ceil(livesState.nextLifeInMs / 1000);
		const minutes = Math.floor(totalSeconds / 60);
		const seconds = totalSeconds % 60;
		return `+1 shield in ${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
	});

	async function persistLives(nextState: LivesState) {
		livesState = nextState;
		if (!browser || !playerId) {
			return;
		}

		// Server-authoritative sync: POST and adopt server response as truth
		try {
			const headers: Record<string, string> = { 'content-type': 'application/json' };
			if (playerToken) {
				headers['x-player-token'] = playerToken;
				headers['x-player-id'] = playerId!;
			}

			const res = await fetch('/api/lives', {
				method: 'POST',
				headers,
				body: JSON.stringify({ user_id: playerId, lives_remaining: nextState.lives })
			});

			if (res.ok) {
				const serverLives = (await res.json()) as LivesState;
				livesState = serverLives;
			}
		} catch (err) {
			console.warn('[GameplayEngine] Lives sync failed, using optimistic state:', err);
		}
	}

function beginMission() {
	if (missionState === 'active' || missionState === 'judging' || result || livesState.lives <= 0) {
			return;
		}

		missionState = 'judging';
		paused = false;
		verdictChoice = null;
		verdictCorrect = null;
	feedbackTitle = 'Make your call';
	feedbackBody = 'First decide whether this message is a scam or safe. Then the clue hunt begins.';
}

function predictionSessionKey() {
	if (!playerId) {
		return null;
	}

	return `${PREDICTION_SESSION_KEY_PREFIX}:${playerId}:${mission.id}`;
}

async function resolveVerdict(choice: 'scam' | 'safe') {
	if ((missionState !== 'ready' && missionState !== 'judging') || result || verdictChoice !== null || verdictProcessing) {
		return;
	}

	verdictProcessing = true;
	verdictChoice = choice;
	const isCorrect = choice === mission.expectedVerdict;
	verdictCorrect = isCorrect;

	if (browser) {
		const storageKey = predictionSessionKey();
		if (storageKey) {
			sessionStorage.setItem(
				storageKey,
				JSON.stringify({
					missionId: mission.id,
					playerId,
					prediction: choice,
					correct: isCorrect,
					recordedAt: new Date().toISOString()
				})
			);
		}
	}

	if (isCorrect) {
		feedbackTitle = 'Prediction recorded';
		feedbackBody = `You correctly marked this case as ${mission.expectedVerdict}. Now lock the exact warning signs before the clock runs out.`;
	} else {
		const nextLives = consumeLife(livesState, Date.now());
		livesState = nextLives; // Optimistic update before server call
		wrongTaps += 1;
		comboChain = 0;
		feedbackTitle = 'Prediction recorded';
		feedbackBody = `You marked this case as ${choice}, but it is ${mission.expectedVerdict}. You lost one shield, but you can still recover by finding the clues.`;
		await persistLives(nextLives);

			if (livesState.lives <= 0) {
				verdictProcessing = false;
				finishMission('failed');
				return;
			}
		}

	verdictProcessing = false;
	missionState = 'active';
	startTimers();
}
	function startTimers() {
		stopTimers();

		tickTimer = window.setInterval(() => {
			if (paused || missionState !== 'active' || result) {
				return;
			}

			if (secondsRemaining <= 1) {
				secondsRemaining = 0;
				finishMission('timeout');
				return;
			}

			secondsRemaining -= 1;
		}, 1000);

		livesTimer = window.setInterval(() => {
			currentTime = Date.now();
			if (!browser) {
				return;
			}

			// Client-side regen countdown (non-authoritative, for display smoothness)
			livesState = resolveLivesState(
				{ lives: livesState.lives, lastUpdatedAt: livesState.lastUpdatedAt },
				Date.now()
			);
		}, 1000);
	}

	function stopTimers() {
		if (tickTimer) {
			clearInterval(tickTimer);
			tickTimer = undefined;
		}

		if (livesTimer) {
			clearInterval(livesTimer);
			livesTimer = undefined;
		}
	}

	function pulseFeedback(kind: 'correct' | 'wrong', title: string, body: string) {
		flashState = kind;
		feedbackTitle = title;
		feedbackBody = body;

		if (flashTimer) {
			clearTimeout(flashTimer);
		}

		flashTimer = window.setTimeout(() => {
			flashState = 'idle';
		}, 650);
	}

	function finishMission(outcome: 'success' | 'timeout' | 'failed') {
		if (result) {
			return;
		}

		missionState = 'finished';
		paused = false;
		stopTimers();
		result = buildMissionResultSummary({
			clues: mission.clues,
			foundIds,
			wrongTaps,
			secondsRemaining,
			streakDays,
			livesRemaining: livesState.lives,
			outcome
		});

		if (outcome === 'success') {
			feedbackTitle = 'Mission cleared';
			feedbackBody = 'You found every active fraud clue before the window closed.';
		} else if (outcome === 'timeout') {
			feedbackTitle = 'Clock expired';
			feedbackBody = 'The scam stayed active long enough to beat the timer. Review the missed clues below.';
		} else {
			feedbackTitle = 'Shields down';
			feedbackBody = 'Random tapping burns lives fast. Slow down and justify each flag before you tap.';
		}

		void persistAttempt();
	}

	async function persistAttempt() {
		if (!browser || !result || !playerId || saveState === 'saving' || saveState === 'saved') {
			return;
		}

		saveState = 'saving';
		saveMessage = 'Saving mission attempt...';

		try {
			const headers: Record<string, string> = { 'content-type': 'application/json' };
			if (playerToken) {
				headers['x-player-token'] = playerToken;
				headers['x-player-id'] = playerId!;
			}

			const response = await fetch('/api/missions/attempt', {
				method: 'POST',
				headers,
				body: JSON.stringify({
					user_id: playerId,
					mission_id: mission.id,
					judgment_choice: verdictChoice,
					judgment_correct: verdictCorrect,
					xp_earned: result.xpEarned,
					base_xp: result.baseXP,
					speed_bonus: result.speedBonus,
					perfect_multiplier: result.perfectMultiplier,
					streak_multiplier: result.streakMultiplier,
					clues_found: result.foundCount,
					clues_missed: result.missedCount,
					wrong_taps: result.wrongTaps,
					lives_remaining: result.livesRemaining,
					time_taken: MISSION_DURATION_SECONDS - result.secondsRemaining,
					seconds_remaining: result.secondsRemaining,
					outcome: result.outcome
				})
			});

			if (!response.ok) {
				throw new Error(`Attempt save failed with status ${response.status}`);
			}

			const payload = (await response.json()) as {
				attempt_id?: number;
				profile?: PlayerStatsSnapshot;
				lives?: LivesState;
				new_badges?: EarnedBadge[];
				rank_up?: RankUp | null;
			};

			profileSnapshot = payload.profile ?? null;
			if (payload.lives) {
				livesState = payload.lives;
			}
			newBadges = payload.new_badges ?? [];
			rankUp = payload.rank_up ?? null;
			saveState = 'saved';
			saveMessage = payload.profile
				? `Saved to ${payload.profile.rank}. Total XP: ${payload.profile.totalXp}.`
				: 'Mission result saved.';

			// Fire AI feedback generation (non-blocking)
			if (result && payload.attempt_id) {
				void fetchAIFeedback(payload.attempt_id);
			}
		} catch (err) {
			console.error('[GameplayEngine] Failed to save attempt:', err);
			saveState = 'error';
			saveMessage = 'Could not save this run. Gameplay still completed locally.';
		}
	}

	async function fetchAIFeedback(attemptId: number) {
		if (!result || feedbackLoading || aiFeedback) {
			return;
		}

		feedbackLoading = true;
		feedbackError = false;

		try {
			const foundClues = result.clueResults
				.filter((c) => c.status === 'found')
				.map((c) => ({ triggerText: c.triggerText, type: c.type, explanation: c.explanation }));
			const missedClues = result.clueResults
				.filter((c) => c.status === 'missed')
				.map((c) => ({ triggerText: c.triggerText, type: c.type, explanation: c.explanation }));

			const res = await fetch('/api/feedback/generate', {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({
					user_id: playerId,
					mission_id: mission.id,
					attempt_id: attemptId,
					fraud_type: mission.fraudType,
					clues_found: foundClues,
					clues_missed: missedClues,
					time_taken: MISSION_DURATION_SECONDS - result.secondsRemaining,
					lives_remaining: result.livesRemaining
				})
			});

			if (!res.ok) {
				throw new Error(`Feedback request failed: ${res.status}`);
			}

			const data = (await res.json()) as { feedback?: AIFeedback };
			aiFeedback = data.feedback ?? null;
		} catch (err) {
			console.warn('[GameplayEngine] AI feedback generation failed:', err);
			feedbackError = true;
		} finally {
			feedbackLoading = false;
		}
	}

	async function handleSegmentTap(segment: (typeof segments)[number]) {
		if (missionState !== 'active' || paused || result) {
			return;
		}

		if (segment.clueId !== null && segment.clue) {
			if (foundIdSet.has(segment.clueId)) {
				return;
			}

			foundIds = [...foundIds, segment.clueId];
			comboChain += 1;
			bestCombo = Math.max(bestCombo, comboChain);
			pulseFeedback('correct', 'Nice catch', segment.clue.explanation);

			if (foundIds.length === mission.clues.length) {
				finishMission('success');
			}

			return;
		}

		if (segment.isWhitespace) {
			return;
		}

		wrongTaps += 1;
		comboChain = 0;
		const nextLives = consumeLife(livesState, Date.now());
		pulseFeedback('wrong', 'Careful', nextHint);

		// Await server confirmation of lives decrement
		await persistLives(nextLives);

		if (nextLives.lives <= 0) {
			finishMission('failed');
		}
	}

	function handleFallbackClueTap(clueId: number, explanation: string) {
		if (missionState !== 'active' || paused || result || foundIdSet.has(clueId)) {
			return;
		}

		foundIds = [...foundIds, clueId];
		comboChain += 1;
		bestCombo = Math.max(bestCombo, comboChain);
		pulseFeedback('correct', 'Signal locked', explanation);

		if (foundIds.length === mission.clues.length) {
			finishMission('success');
		}
	}

	async function restartMission() {
		if (!browser || !playerId) {
			return;
		}

		// Fetch server truth before restarting
		try {
			const res = await fetch(`/api/lives?user_id=${encodeURIComponent(playerId)}`);
			if (res.ok) {
				const serverLives = (await res.json()) as LivesState;
				livesState = serverLives;
			}
		} catch (err) {
			console.warn('[GameplayEngine] Failed to fetch server lives on restart:', err);
		}

		foundIds = [];
		wrongTaps = 0;
		comboChain = 0;
		bestCombo = 0;
		verdictChoice = null;
		verdictCorrect = null;
		verdictProcessing = false;
		secondsRemaining = MISSION_DURATION_SECONDS;
		paused = false;
		result = null;
		saveState = 'idle';
		saveMessage = 'Mission result will save when the run ends.';
		profileSnapshot = null;
		aiFeedback = null;
		feedbackLoading = false;
		feedbackError = false;
		newBadges = [];
		rankUp = null;
		flashState = 'idle';
		feedbackTitle = livesState.lives > 0 ? 'Mission ready' : 'No shields available';
		feedbackBody =
			livesState.lives > 0
				? 'Read the case, make your scam or safe call, and then lock the red flags.'
				: 'Wait for a shield to recharge before starting a new round.';
		missionState = 'ready';
	}

	function togglePause() {
		if (missionState !== 'active' || result) {
			return;
		}

		paused = !paused;
		feedbackTitle = paused ? 'Round paused' : 'Round resumed';
		feedbackBody = paused
			? 'Take a breath. Resume when you are ready to keep hunting.'
			: 'The clock is running again. Keep looking for scam signals.';
	}

	onMount(() => {
		if (!browser) {
			return;
		}

		playerId = getOrCreatePlayerId(localStorage.getItem(PLAYER_ID_STORAGE_KEY));
		localStorage.setItem(PLAYER_ID_STORAGE_KEY, playerId);

		// Acquire auth token for authenticated API calls
		void (async () => {
			try {
				const tokenRes = await fetch('/api/user/token', {
					method: 'POST',
					headers: { 'content-type': 'application/json' },
					body: JSON.stringify({ user_id: playerId })
				});
				if (tokenRes.ok) {
					const { token } = (await tokenRes.json()) as { token: string };
					playerToken = token;
				}
			} catch (err) {
				console.warn('[GameplayEngine] Token acquisition failed:', err);
			}
		})();

		// Load lives from the server without clobbering a round the player already started.
		void (async () => {
			try {
				const res = await fetch(`/api/lives?user_id=${encodeURIComponent(playerId!)}`);
				if (res.ok) {
					const serverLives = (await res.json()) as LivesState;
					livesState = serverLives;
				}
			} catch (err) {
				console.warn('[GameplayEngine] Failed to fetch server lives:', err);
			}

			if (missionState !== 'ready' || result || verdictChoice !== null) {
				return;
			}

			feedbackTitle = livesState.lives > 0 ? 'Mission briefing' : 'No shields available';
			feedbackBody =
				livesState.lives > 0
					? 'Read the setup and predict whether this case is a scam or safe.'
					: 'You are out of shields. Wait for one to recharge or come back later.';
		})();

		return () => {
			stopTimers();
			if (flashTimer) {
				clearTimeout(flashTimer);
			}
		};
	});
</script>

<section class="gameplay-shell">
	<header class="mission-strip">
		<div>
			<p class="label">Round live</p>
			<h1>{mission.fraudType.replaceAll('_', ' ')} challenge</h1>
			<p class="intro">
				Spot the scam before it tricks the player. Tap the exact risky phrases. One wrong tap costs a shield, so play for precision instead of speed panic.
			</p>
		</div>

		<div class="mission-strip__controls">
			<a class="ghost-link" href="/#queue">Mission board</a>
			<button type="button" class="ghost-button" onclick={togglePause}>
				{paused ? 'Resume round' : 'Pause round'}
			</button>
		</div>
	</header>

	<section class="tutorial-strip" aria-label="How to play">
		<div class="tutorial-strip__hero">
			<p class="label">How to play</p>
			<h2>Read, tap, survive</h2>
			<p>New players should understand this round in a few seconds.</p>
		</div>
		<div class="tutorial-strip__steps">
			{#each beginnerSteps as step, index}
				<article>
					<span>{index + 1}</span>
					<p>{step}</p>
				</article>
			{/each}
		</div>
	</section>

	<div class="status-grid">
		<article class:critical={timerTone === 'critical'}>
			<span class="label">Time left</span>
			<strong>{String(secondsRemaining).padStart(2, '0')}s</strong>
			<p>{timerTone === 'critical' ? 'Final seconds. Trust your instincts.' : 'Stay calm and read carefully.'}</p>
		</article>
		<article>
			<span class="label">Shields</span>
			<strong>{'◈ '.repeat(livesState.lives).trim() || 'depleted'}</strong>
			<p>{lifeCountdownLabel}</p>
		</article>
		<article>
			<span class="label">Progress</span>
			<strong>{foundIds.length}/{mission.clues.length}</strong>
			<p>{completionPercent}% cleared</p>
		</article>
		<article>
			<span class="label">Judgment</span>
			<strong>{verdictStatusLabel}</strong>
			<p>{verdictStatusDetail}</p>
		</article>
		<article>
			<span class="label">Combo boost</span>
			<strong>{Math.min(1 + streakDays * 0.1, 2).toFixed(1)}x</strong>
			<p>{streakDays} day streak applied</p>
		</article>
			<article>
				<span class="label">Combo chain</span>
				<strong>x{activeComboMultiplier}</strong>
				<p>{comboLabel}</p>
			</article>
		<article class:critical={threatStatus === 'critical'}>
			<span class="label">Threat meter</span>
			<strong>{threatPercent}%</strong>
			<p>{threatLabel}</p>
		</article>
	</div>

	<div class="play-grid">
		<section class:critical={timerTone === 'critical'} class:flash-correct={flashState === 'correct'} class:flash-wrong={flashState === 'wrong'} class="message-slate">
			<div class="message-slate__header">
				<div>
					<p class="label">Incoming message</p>
					<h2>{mission.simulationType.replaceAll('_', ' ')}</h2>
				</div>
				<div class="message-meta">
					<span>{mission.sender}</span>
					<span>{mission.difficulty} mode</span>
				</div>
			</div>

			<div aria-live="polite" class="feedback-banner">
				<strong>{feedbackTitle}</strong>
				<p>{feedbackBody}</p>
			</div>

			{#if missionState === 'ready' && !result}
				<div
					class="briefing-card"
					role="region"
					aria-label="Mission briefing"
				>
					<div class="briefing-card__header">
						<div>
							<p class="label">Mission briefing</p>
							<h3>Decide whether this {missionLabel} message is a scam or safe.</h3>
						</div>
						<span>{mission.simulationType.replaceAll('_', ' ')}</span>
					</div>
					<div class="briefing-card__grid">
						<article>
							<span class="label">Threat source</span>
							<strong>{mission.sender}</strong>
						</article>
						<article>
							<span class="label">Step 1</span>
							<strong>Judge scam or safe</strong>
						</article>
						<article>
							<span class="label">Step 2</span>
							<strong>Find {mission.clues.length} red flags</strong>
						</article>
						<article>
							<span class="label">Round stakes</span>
							<strong>3 shields / 60s</strong>
						</article>
					</div>
					<p class="briefing-card__tip">{mission.tip}</p>
					{#if verdictChoice !== null}
						<div class:verdict-callout--correct={verdictCorrect} class:verdict-callout--wrong={verdictCorrect === false} class="verdict-callout">
							<p class="label">Prediction result</p>
							<strong>{verdictCorrect ? 'Correct prediction' : 'Wrong prediction'}</strong>
							<p>
								{verdictCorrect
									? `You called this case correctly. It is ${expectedVerdictLabel}. Now find every red flag to lock in the win and save progress.`
									: `The correct answer is ${expectedVerdictLabel}. Your prediction cost one shield. You can still finish the round and save progress to your profile.`}
							</p>
						</div>
					{/if}
					<div class="briefing-card__actions">
						<a class="ghost-link" href="/#queue">
							Back to mission board
						</a>
						<button
							type="button"
							class="verdict verdict--danger briefing-card__action"
							disabled={verdictProcessing || livesState.lives <= 0}
							onclick={() => resolveVerdict('scam')}
						>
							Scam
						</button>
						<button
							type="button"
							class="verdict briefing-card__action"
							disabled={verdictProcessing || livesState.lives <= 0}
							onclick={() => resolveVerdict('safe')}
						>
							Safe
						</button>
					</div>
				</div>
			{/if}

			<div class:paused={paused || missionState !== 'active'} class="message-card">
				{#each segments as segment}
					{#if segment.isWhitespace}
						<span class="message-text">{segment.text}</span>
					{:else}
						<button
							type="button"
							class:decoy={segment.clueId === null}
							class:found={segment.clueId !== null && foundIdSet.has(segment.clueId)}
							class="message-token"
							disabled={missionState !== 'active' || paused || (segment.clueId !== null && foundIdSet.has(segment.clueId))}
							onclick={() => handleSegmentTap(segment)}
						>
							{segment.text}
						</button>
					{/if}
				{/each}
			</div>

			{#if fallbackClues.length > 0}
				<div class="fallback-clues">
					<div class="fallback-clues__header">
						<p class="label">Backup clue targets</p>
						<p>Some signals could not be mapped directly into the message. Lock them here so the round remains playable.</p>
					</div>

					<div class="fallback-clues__grid">
						{#each fallbackClues as clue}
							<button
								type="button"
								class:found={foundIdSet.has(clue.id)}
								class="fallback-clue"
								disabled={missionState !== 'active' || paused || foundIdSet.has(clue.id)}
								onclick={() => handleFallbackClueTap(clue.id, clue.explanation)}
							>
								<span>{clue.type.replaceAll('_', ' ')}</span>
								<strong>{clue.triggerText}</strong>
							</button>
						{/each}
					</div>
				</div>
			{/if}
		</section>

		<aside class="intel-rail">
			<section>
				<p class="label">Arcade coach</p>
				<h3>What usually gives scams away</h3>
				<ul>
					<li>Watch for pressure words, fake authority, money requests, and strange links.</li>
					<li>If you are unsure, pause and reread instead of tapping randomly.</li>
					<li>Wrong taps hurt more than slow play.</li>
				</ul>
			</section>

			<section>
				<p class="label">Coach tip</p>
				<h3>Best habit for this round</h3>
				<p>{mission.tip}</p>
			</section>
		</aside>
	</div>

	{#if result}
		<section class="result-screen"
			data-result-xp="{result.xpEarned}"
			data-result-time="{MISSION_DURATION_SECONDS - result.secondsRemaining}"
			data-result-wrong="{result.wrongTaps}"
			data-result-found="{result.foundCount}"
			data-result-outcome="{result.outcome}"
		>
			<div class="result-screen__hero">
				<div>
					<p class="label">Round result</p>
					<h2>
						{#if result.outcome === 'success'}
							Scam stopped
						{:else if result.outcome === 'failed'}
							Shields broken
						{:else}
							Time ran out
						{/if}
					</h2>
					<p class="result-grade">{resultGrade}</p>
				</div>
				<strong>{result.xpEarned} XP</strong>
			</div>

			<div class="result-grid">
				<article>
					<span class="label">Found / missed</span>
					<h3>{result.foundCount} / {result.missedCount}</h3>
					<p>You still get the full lesson below, even if the round went badly.</p>
				</article>
				<article>
					<span class="label">Score breakdown</span>
					<h3>{result.baseXP} + {result.speedBonus}</h3>
					<p>Perfect x{result.perfectMultiplier}, streak x{result.streakMultiplier.toFixed(1)}</p>
				</article>
				<article>
					<span class="label">Best combo</span>
					<h3>x{Math.max(bestCombo, 1)}</h3>
					<p>Longest chain of correct taps this round.</p>
				</article>
				<article>
					<span class="label">Shields left</span>
					<h3>{result.livesRemaining}</h3>
					<p>{result.wrongTaps} wrong tap{result.wrongTaps === 1 ? '' : 's'} in this round.</p>
				</article>
			</div>

			<div class="result-clues">
				{#each result.clueResults as clue, index}
					<article class:missed={clue.status === 'missed'}>
						<div>
							<span>{String(index + 1).padStart(2, '0')}</span>
							<strong>{clue.status === 'found' ? 'Found' : 'Missed'}</strong>
						</div>
						<h3>{clue.triggerText}</h3>
						<p>{clue.explanation}</p>
					</article>
				{/each}
			</div>

			<!-- AI Mentor Feedback Card -->
			<div class="ai-feedback-section">
				{#if feedbackLoading}
					<article class="ai-feedback-card ai-feedback-card--loading">
						<div class="ai-feedback-card__header">
							<span class="label">AI mentor</span>
							<span class="ai-feedback-card__badge">Analyzing...</span>
						</div>
						<div class="ai-feedback-skeleton">
							<div class="skeleton-line skeleton-line--wide"></div>
							<div class="skeleton-line skeleton-line--medium"></div>
							<div class="skeleton-line skeleton-line--narrow"></div>
						</div>
					</article>
				{:else if aiFeedback}
					<article class="ai-feedback-card">
						<div class="ai-feedback-card__header">
							<span class="label">AI mentor</span>
							<span class="ai-feedback-card__badge">{aiFeedback.patternIdentified}</span>
						</div>
						<p class="ai-feedback-card__text">{aiFeedback.feedbackText}</p>
						<div class="ai-feedback-card__tip">
							<strong>Use this next time</strong>
							<p>{aiFeedback.actionableTip}</p>
						</div>
						<p class="ai-feedback-card__encouragement">{aiFeedback.encouragement}</p>
					</article>
				{:else if feedbackError}
					<article class="ai-feedback-card ai-feedback-card--error">
						<div class="ai-feedback-card__header">
							<span class="label">AI mentor</span>
						</div>
						<p class="ai-feedback-card__text">Feedback is temporarily unavailable. Review the clue breakdown above to learn from this mission.</p>
					</article>
				{/if}
			</div>

			<!-- Rank-up + Badge Awards -->
			{#if rankUp}
				<div class="rank-up-banner">
					<span class="label">Level up</span>
					<h3>{rankUp.from} → {rankUp.to}</h3>
				</div>
			{/if}

			{#if newBadges.length > 0}
				<div class="badges-earned">
					<span class="label">Rewards unlocked</span>
					<div class="badges-grid">
						{#each newBadges as badge, i}
							<article class="badge-card" style="animation-delay: {i * 120}ms">
								<span class="badge-card__category">{badge.category}</span>
								<h3 class="badge-card__name">{badge.name}</h3>
								<p class="badge-card__description">{badge.description}</p>
							</article>
						{/each}
					</div>
				</div>
			{/if}

			<div class="result-actions">
				<button type="button" class="primary-action" onclick={restartMission}>Play again</button>
				<a class="ghost-link" href="/#queue">Mission board</a>
			</div>
		</section>
	{/if}
</section>

<style>
	.gameplay-shell {
		--panel: rgba(255, 255, 255, 0.28);
		--panel-strong: rgba(255, 255, 255, 0.18);
		--line: rgba(10, 10, 10, 0.1);
		--line-hot: rgba(212, 97, 40, 0.3);
		--text: rgba(20, 34, 45, 0.96);
		--muted: rgba(20, 34, 45, 0.68);
		--mint: rgba(20, 34, 45, 0.92);
		--amber: #eda167;
		--red: #d46128;
		display: grid;
		gap: 1rem;
		color: var(--text);
	}

	.label,
	.message-meta span,
	.result-clues span {
		font-family: var(--font-mono, 'IBM Plex Mono', monospace);
		font-size: 0.72rem;
		letter-spacing: 0.16em;
		text-transform: uppercase;
		color: var(--muted);
	}

	.mission-strip,
	.status-grid article,
	.message-slate,
	.intel-rail section,
	.result-screen,
	.result-grid article,
	.result-clues article {
		border: 1px solid var(--line);
		border-radius: 1rem;
		background:
			radial-gradient(circle at top right, rgba(230, 57, 70, 0.06), transparent 24%),
			linear-gradient(180deg, rgba(255, 255, 255, 0.28), rgba(255, 255, 255, 0.12)),
			var(--panel);
		box-shadow: var(--shadow-hud);
	}

	.mission-strip,
	.message-slate,
	.intel-rail section,
	.result-screen {
		padding: 1.2rem;
	}

	.tutorial-strip {
		display: grid;
		grid-template-columns: minmax(0, 0.85fr) minmax(0, 1.15fr);
		gap: 1rem;
		padding: 1rem 1.2rem;
		border: 1px solid rgba(245, 196, 108, 0.22);
		background:
			radial-gradient(circle at top left, rgba(245, 196, 108, 0.12), transparent 30%),
			linear-gradient(180deg, rgba(255, 255, 255, 0.28), rgba(255, 255, 255, 0.12)),
			var(--panel);
	}

	.tutorial-strip__hero h2 {
		margin: 0.35rem 0 0.45rem;
		font-family: var(--font-display, 'Cormorant Garamond', serif);
		font-size: clamp(2rem, 5vw, 3rem);
		font-weight: 600;
		line-height: 0.94;
	}

	.tutorial-strip__hero p:last-child {
		margin: 0;
		color: var(--muted);
		line-height: 1.6;
	}

	.tutorial-strip__steps {
		display: grid;
		grid-template-columns: repeat(3, minmax(0, 1fr));
		gap: 0.75rem;
	}

	.tutorial-strip__steps article {
		padding: 0.95rem;
		border: 1px solid rgba(10, 10, 10, 0.1);
		background: rgba(255, 255, 255, 0.18);
	}

	.tutorial-strip__steps span {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 2rem;
		height: 2rem;
		border-radius: 999px;
		background: var(--amber);
		color: #14222d;
		font-family: var(--font-mono, 'IBM Plex Mono', monospace);
		font-size: 0.82rem;
		font-weight: 700;
	}

	.tutorial-strip__steps p {
		margin: 0.85rem 0 0;
		color: var(--text);
		line-height: 1.5;
	}

	.mission-strip {
		display: flex;
		justify-content: space-between;
		gap: 1rem;
		align-items: end;
	}

	.mission-strip h1,
	.message-slate h2,
	.intel-rail h3,
	.result-screen h2,
	.result-clues h3 {
		margin: 0.45rem 0 0;
		font-family: var(--font-display, 'Cormorant Garamond', serif);
		font-weight: 500;
		line-height: 0.95;
	}

	.mission-strip h1 {
		font-size: clamp(2.7rem, 7vw, 5.4rem);
	}

	.intro,
	.feedback-banner p,
	.intel-rail li,
	.intel-rail p,
	.result-grid p,
	.result-clues p {
		margin: 0;
		color: var(--muted);
		line-height: 1.7;
	}

	.mission-strip__controls {
		display: grid;
		gap: 0.7rem;
		justify-items: end;
	}

	.ghost-link,
	.ghost-button,
	.primary-action {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		min-height: 3rem;
		padding: 0 1rem;
		border: 1px solid var(--line);
		font-family: var(--font-mono, 'IBM Plex Mono', monospace);
		font-size: 0.72rem;
		letter-spacing: 0.16em;
		text-transform: uppercase;
		text-decoration: none;
		cursor: pointer;
		transition:
			transform 150ms ease,
			border-color 150ms ease,
			background-color 150ms ease,
			box-shadow 150ms ease,
			color 150ms ease;
	}

	.ghost-link,
	.ghost-button {
		background: rgba(20, 34, 45, 0.08);
		color: #0f1c26;
		border-color: rgba(20, 34, 45, 0.22);
		box-shadow: 0 0 0 1px rgba(255, 255, 255, 0.16) inset;
	}

	.primary-action {
		border-color: rgba(143, 59, 24, 0.22);
		background: linear-gradient(135deg, #d46128, #eda167);
		color: #101820;
		box-shadow: 0 10px 24px rgba(143, 59, 24, 0.18);
	}

	.ghost-link:hover,
	.ghost-button:hover,
	.primary-action:hover {
		transform: translateY(-1px);
	}

	.ghost-link:hover,
	.ghost-button:hover {
		background: rgba(20, 34, 45, 0.14);
		border-color: rgba(20, 34, 45, 0.3);
	}

	.primary-action:hover {
		box-shadow: 0 14px 28px rgba(143, 59, 24, 0.24);
	}

	.status-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(10rem, 1fr));
		gap: 0.85rem;
	}

	.result-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(12rem, 1fr));
		gap: 0.85rem;
	}

	.status-grid article,
	.result-grid article {
		padding: 1rem;
	}

	.status-grid strong,
	.result-grid h3,
	.result-screen__hero strong {
		display: block;
		margin-top: 0.55rem;
		font-family: var(--font-display, 'Cormorant Garamond', serif);
		font-size: clamp(2rem, 4vw, 3rem);
		font-weight: 500;
		line-height: 1;
	}

	.status-grid article.critical,
	.message-slate.critical {
		border-color: var(--line-hot);
		box-shadow: 0 0 0 1px rgba(212, 97, 40, 0.14);
	}

	.status-grid article.critical strong {
		color: #8f3b18;
	}

	.play-grid {
		display: grid;
		grid-template-columns: minmax(0, 1.18fr) minmax(18rem, 0.82fr);
		gap: 1rem;
	}

	.message-slate {
		position: relative;
		overflow: hidden;
	}

	.message-slate.flash-correct::after,
	.message-slate.flash-wrong::after {
		content: '';
		position: absolute;
		inset: 0;
		pointer-events: none;
		animation: flash 620ms ease;
	}

	.message-slate.flash-correct::after {
		background: rgba(237, 161, 103, 0.12);
	}

	.message-slate.flash-wrong::after {
		background: rgba(212, 97, 40, 0.12);
	}

	@keyframes flash {
		from {
			opacity: 1;
		}
		to {
			opacity: 0;
		}
	}

	.message-slate__header,
	.result-screen__hero,
	.result-clues article div {
		display: flex;
		justify-content: space-between;
		gap: 1rem;
		align-items: start;
	}

	.message-meta {
		display: flex;
		flex-wrap: wrap;
		gap: 0.6rem;
		justify-content: end;
	}

	.message-meta span {
		padding: 0.45rem 0.65rem;
		border: 1px solid rgba(255, 255, 255, 0.08);
		background: rgba(255, 255, 255, 0.04);
	}

	.feedback-banner {
		margin-top: 1rem;
		padding: 0.9rem 1rem;
		border: 1px solid rgba(255, 255, 255, 0.08);
		background: rgba(255, 255, 255, 0.03);
	}

	.feedback-banner strong {
		display: block;
		margin-bottom: 0.35rem;
		font-size: 1rem;
	}

	.briefing-card {
		margin-top: 1rem;
		padding: 1rem;
		border: 1px solid rgba(255, 183, 77, 0.22);
		border-radius: 1rem;
		background:
			radial-gradient(circle at top right, rgba(255, 183, 77, 0.08), transparent 22%),
			rgba(255, 255, 255, 0.03);
	}

	.briefing-card__header,
	.briefing-card__grid {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: 0.9rem;
		align-items: end;
	}

	.briefing-card__header h3 {
		margin: 0.35rem 0 0;
		font-family: var(--font-display);
		font-size: clamp(1.8rem, 4vw, 2.6rem);
		font-weight: 500;
		line-height: 0.96;
	}

	.briefing-card__header > span,
	.briefing-card__grid span {
		font-family: var(--font-mono, 'IBM Plex Mono', monospace);
		font-size: 0.68rem;
		letter-spacing: 0.16em;
		text-transform: uppercase;
		color: var(--muted);
	}

	.briefing-card__header > span {
		justify-self: end;
		padding: 0.45rem 0.7rem;
		border: 1px solid rgba(255, 255, 255, 0.08);
		background: rgba(255, 255, 255, 0.04);
	}

	.briefing-card__grid {
		grid-template-columns: repeat(3, minmax(0, 1fr));
		margin-top: 1rem;
	}

	.briefing-card__grid article {
		padding: 0.85rem;
		border: 1px solid rgba(255, 255, 255, 0.08);
		background: rgba(255, 255, 255, 0.03);
	}

	.briefing-card__grid strong {
		display: block;
		margin-top: 0.45rem;
		font-family: var(--font-display);
		font-size: 1.45rem;
		line-height: 1.05;
	}

	.briefing-card__tip {
		margin: 1rem 0 0;
		color: var(--text);
		line-height: 1.7;
	}

	.briefing-card__action {
		margin-top: 0;
	}

	.verdict-callout {
		margin-top: 1rem;
		padding: 0.95rem 1rem;
		border: 1px solid rgba(10, 10, 10, 0.12);
		border-radius: 1rem;
		background: rgba(255, 255, 255, 0.14);
	}

	.verdict-callout strong {
		display: block;
		margin: 0.35rem 0 0;
		font-family: var(--font-display);
		font-size: clamp(1.45rem, 3vw, 2rem);
		font-weight: 500;
		line-height: 1;
	}

	.verdict-callout p:last-child {
		margin: 0.55rem 0 0;
		color: var(--text);
		line-height: 1.65;
	}

	.verdict-callout--correct {
		border-color: rgba(125, 242, 201, 0.28);
		background: rgba(125, 242, 201, 0.12);
	}

	.verdict-callout--wrong {
		border-color: rgba(212, 97, 40, 0.28);
		background: rgba(212, 97, 40, 0.12);
	}

	.briefing-card__actions {
		display: flex;
		flex-wrap: wrap;
		gap: 0.8rem;
		margin-top: 1rem;
	}

	.verdict {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		min-height: 3.2rem;
		min-width: 6.5rem;
		padding: 0 1.4rem;
		border: 1.5px solid rgba(46, 196, 140, 0.45);
		border-radius: 0.95rem;
		background: linear-gradient(135deg, rgba(46, 196, 140, 0.22), rgba(125, 242, 201, 0.18));
		color: var(--text);
		font-family: var(--font-mono, 'IBM Plex Mono', monospace);
		font-size: 0.78rem;
		font-weight: 600;
		letter-spacing: 0.16em;
		text-transform: uppercase;
		cursor: pointer;
		transition:
			transform 150ms ease,
			border-color 150ms ease,
			background-color 150ms ease,
			box-shadow 150ms ease,
			opacity 150ms ease;
		box-shadow: 0 4px 14px rgba(46, 196, 140, 0.12);
	}

	.verdict:hover {
		transform: translateY(-2px);
		background: linear-gradient(135deg, rgba(46, 196, 140, 0.32), rgba(125, 242, 201, 0.26));
		border-color: rgba(46, 196, 140, 0.6);
		box-shadow: 0 8px 22px rgba(46, 196, 140, 0.18);
	}

	.verdict:active {
		transform: translateY(0);
		box-shadow: 0 2px 8px rgba(46, 196, 140, 0.1);
	}

	.verdict:focus-visible {
		outline: 2px solid rgba(46, 196, 140, 0.6);
		outline-offset: 2px;
	}

	.verdict:disabled {
		opacity: 0.4;
		cursor: not-allowed;
		transform: none;
		box-shadow: none;
	}

	.verdict--danger {
		background: linear-gradient(135deg, rgba(230, 57, 70, 0.28), rgba(255, 107, 107, 0.22));
		border-color: rgba(230, 57, 70, 0.5);
		box-shadow: 0 4px 14px rgba(230, 57, 70, 0.12);
	}

	.verdict--danger:hover {
		background: linear-gradient(135deg, rgba(230, 57, 70, 0.4), rgba(255, 107, 107, 0.32));
		border-color: rgba(230, 57, 70, 0.7);
		box-shadow: 0 8px 22px rgba(230, 57, 70, 0.2);
	}

	.verdict--danger:active {
		box-shadow: 0 2px 8px rgba(230, 57, 70, 0.1);
	}

	.message-card {
		margin-top: 1rem;
		padding: 1.1rem;
		border-radius: 1.2rem 1.2rem 1.2rem 0.35rem;
		border: 1px solid rgba(125, 242, 201, 0.18);
		background: var(--panel-strong);
		line-height: 1.9;
		white-space: pre-wrap;
		font-size: clamp(1.02rem, 1.1vw, 1.14rem);
		box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.03);
	}

	.fallback-clues {
		margin-top: 1rem;
		padding: 1rem;
		border: 1px solid rgba(130, 191, 255, 0.12);
		border-radius: 1rem;
		background: rgba(255, 255, 255, 0.025);
	}

	.fallback-clues__header p:last-child {
		margin: 0.45rem 0 0;
		color: var(--muted);
		line-height: 1.6;
	}

	.fallback-clues__grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(16rem, 1fr));
		gap: 0.75rem;
		margin-top: 1rem;
	}

	.fallback-clue {
		appearance: none;
		display: flex;
		flex-direction: column;
		align-items: flex-start;
		justify-content: flex-start;
		width: 100%;
		min-height: 8.5rem;
		padding: 0.9rem;
		border: 1px solid rgba(130, 191, 255, 0.12);
		border-radius: 1rem;
		background: rgba(255, 255, 255, 0.03);
		color: var(--text);
		text-align: left;
		cursor: pointer;
		box-sizing: border-box;
		white-space: normal;
		word-break: break-word;
		overflow-wrap: anywhere;
	}

	.fallback-clue span,
	.fallback-clue strong {
		display: block;
		width: 100%;
	}

	.fallback-clue span {
		font-family: var(--font-mono, 'IBM Plex Mono', monospace);
		font-size: 0.62rem;
		letter-spacing: 0.14em;
		text-transform: uppercase;
		color: var(--muted);
	}

	.fallback-clue strong {
		margin-top: 0.55rem;
		font-size: 1rem;
		line-height: 1.5;
		font-family: var(--font-display, 'Cormorant Garamond', serif);
	}

	.fallback-clue.found {
		border-color: rgba(125, 242, 201, 0.28);
		background: rgba(125, 242, 201, 0.08);
	}

	.message-card.paused {
		opacity: 0.62;
		filter: saturate(0.8);
	}

	.message-text,
	.message-token {
		font: inherit;
		white-space: pre-wrap;
	}

	.message-token {
		display: inline;
		padding: 0.14rem 0.22rem;
		border: none;
		border-radius: 0.45rem;
		background: rgba(245, 196, 108, 0.14);
		color: var(--text);
		cursor: pointer;
		transition:
			background-color 120ms ease,
			box-shadow 120ms ease,
			color 120ms ease;
	}

	.message-token:hover,
	.message-token:focus-visible {
		background: rgba(245, 196, 108, 0.22);
		box-shadow: 0 0 0 1px rgba(245, 196, 108, 0.25);
		outline: none;
	}

	.message-token.decoy {
		background: rgba(255, 255, 255, 0.03);
	}

	.message-token.found,
	.message-token:disabled.found {
		background: rgba(125, 242, 201, 0.22);
		color: #dbfff1;
		cursor: default;
	}

	.message-token:disabled {
		opacity: 1;
	}

	.intel-rail {
		display: grid;
		gap: 1rem;
	}

	.intel-rail ul {
		margin: 0.75rem 0 0;
		padding-left: 1.1rem;
		display: grid;
		gap: 0.45rem;
	}

	.result-screen {
		display: grid;
		gap: 1rem;
	}

	.result-clues {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: 0.85rem;
	}

	.result-clues article {
		padding: 1rem;
	}

	.result-clues article.missed {
		border-color: rgba(255, 111, 97, 0.24);
	}

	.result-grade {
		margin: 0.45rem 0 0;
		font-family: var(--font-mono, 'IBM Plex Mono', monospace);
		font-size: 0.72rem;
		letter-spacing: 0.16em;
		text-transform: uppercase;
		color: var(--amber);
	}

	.result-actions {
		display: flex;
		flex-wrap: wrap;
		gap: 0.8rem;
	}

	/* ── AI Feedback Card ── */

	.ai-feedback-section {
		min-height: 2rem;
	}

	.ai-feedback-card {
		padding: 1.2rem;
		border: 1px solid rgba(125, 242, 201, 0.22);
		background:
			linear-gradient(135deg, rgba(125, 242, 201, 0.06), rgba(125, 242, 201, 0.02)),
			var(--panel);
		animation: fadeInUp 420ms ease;
	}

	.ai-feedback-card--loading {
		border-color: rgba(255, 255, 255, 0.08);
		background: var(--panel);
	}

	.ai-feedback-card--error {
		border-color: rgba(255, 111, 97, 0.18);
		background:
			linear-gradient(135deg, rgba(255, 111, 97, 0.04), transparent),
			var(--panel);
	}

	.ai-feedback-card__header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: 0.8rem;
		margin-bottom: 0.85rem;
	}

	.ai-feedback-card__badge {
		padding: 0.4rem 0.7rem;
		border: 1px solid rgba(125, 242, 201, 0.28);
		background: rgba(125, 242, 201, 0.1);
		font-family: var(--font-mono, 'IBM Plex Mono', monospace);
		font-size: 0.68rem;
		letter-spacing: 0.12em;
		text-transform: uppercase;
		color: var(--mint);
	}

	.ai-feedback-card__text {
		margin: 0;
		color: var(--text);
		line-height: 1.75;
		font-size: 1.05rem;
	}

	.ai-feedback-card__tip {
		margin-top: 0.85rem;
		padding: 0.8rem 1rem;
		border: 1px solid rgba(245, 196, 108, 0.22);
		background: rgba(245, 196, 108, 0.06);
	}

	.ai-feedback-card__tip strong {
		display: block;
		margin-bottom: 0.3rem;
		font-family: var(--font-mono, 'IBM Plex Mono', monospace);
		font-size: 0.72rem;
		letter-spacing: 0.14em;
		text-transform: uppercase;
		color: var(--amber);
	}

	.ai-feedback-card__tip p {
		margin: 0;
		color: var(--text);
		line-height: 1.65;
	}

	.ai-feedback-card__encouragement {
		margin: 0.85rem 0 0;
		color: var(--mint);
		font-style: italic;
		line-height: 1.65;
	}

	/* ── Rank Up & Badges ── */

	.rank-up-banner {
		margin-top: 1.5rem;
		padding: 1.2rem;
		border: 1px solid rgba(245, 196, 108, 0.3);
		background:
			linear-gradient(135deg, rgba(245, 196, 108, 0.1), transparent),
			var(--panel);
		text-align: center;
		animation: fadeInUp 500ms ease;
	}

	.rank-up-banner h3 {
		margin: 0.5rem 0 0;
		font-size: 1.8rem;
		color: var(--amber);
	}

	.badges-earned {
		margin-top: 2rem;
	}

	.badges-earned > .label {
		display: block;
		margin-bottom: 1rem;
	}

	.badges-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
		gap: 1rem;
	}

	.badge-card {
		padding: 1.2rem;
		border: 1px solid rgba(125, 242, 201, 0.2);
		background: var(--panel);
		opacity: 0;
		animation: fadeInUp 400ms ease forwards;
	}

	.badge-card__category {
		display: inline-block;
		margin-bottom: 0.5rem;
		padding: 0.2rem 0.5rem;
		background: rgba(125, 242, 201, 0.1);
		color: var(--mint);
		font-family: var(--font-mono, 'IBM Plex Mono', monospace);
		font-size: 0.65rem;
		text-transform: uppercase;
		letter-spacing: 0.1em;
	}

	.badge-card__name {
		margin: 0 0 0.4rem;
		font-size: 1.2rem;
		color: var(--text);
	}

	.badge-card__description {
		margin: 0;
		font-size: 0.9rem;
		color: rgba(242, 238, 231, 0.7);
		line-height: 1.5;
	}

	/* Skeleton loader */
	.ai-feedback-skeleton {
		display: grid;
		gap: 0.6rem;
	}

	.skeleton-line {
		height: 0.85rem;
		border-radius: 4px;
		background: linear-gradient(
			90deg,
			rgba(255, 255, 255, 0.04),
			rgba(255, 255, 255, 0.08),
			rgba(255, 255, 255, 0.04)
		);
		background-size: 200% 100%;
		animation: shimmer 1.5s ease-in-out infinite;
	}

	.skeleton-line--wide { width: 92%; }
	.skeleton-line--medium { width: 70%; }
	.skeleton-line--narrow { width: 48%; }

	@keyframes shimmer {
		0% { background-position: 200% 0; }
		100% { background-position: -200% 0; }
	}

	@keyframes fadeInUp {
		from {
			opacity: 0;
			transform: translateY(8px);
		}
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}

	@media (max-width: 1100px) {
		.tutorial-strip,
		.status-grid,
		.result-grid,
		.play-grid,
		.result-clues {
			grid-template-columns: 1fr;
		}

		.briefing-card__header,
		.briefing-card__grid {
			grid-template-columns: 1fr;
		}

		.tutorial-strip__steps {
			grid-template-columns: 1fr;
		}

		.mission-strip,
		.message-slate__header,
		.result-screen__hero {
			flex-direction: column;
		}

		.mission-strip__controls {
			justify-items: start;
		}
	}

	@media (max-width: 720px) {
		.gameplay-shell {
			gap: 0.85rem;
		}

		.label,
		.message-meta span,
		.result-clues span {
			font-size: 0.62rem;
			letter-spacing: 0.12em;
		}

		.mission-strip,
		.message-slate,
		.intel-rail section,
		.result-screen {
			padding: 1rem;
			border-radius: 0.95rem;
		}

		.tutorial-strip {
			padding: 0.95rem;
			border-radius: 0.95rem;
		}

		.mission-strip h1 {
			font-size: clamp(2rem, 9vw, 3rem);
		}

		.tutorial-strip__hero h2,
		.message-slate h2,
		.intel-rail h3,
		.result-screen h2,
		.result-clues h3 {
			font-size: clamp(1.7rem, 7vw, 2.35rem);
		}

		.ghost-link,
		.ghost-button,
		.primary-action {
			width: 100%;
			min-height: 2.85rem;
			font-size: 0.66rem;
		}

		.status-grid {
			grid-template-columns: 1fr 1fr;
			gap: 0.7rem;
		}

		.status-grid article,
		.result-grid article,
		.tutorial-strip__steps article,
		.briefing-card__grid article,
		.result-clues article,
		.ai-feedback-card,
		.badge-card,
		.rank-up-banner {
			padding: 0.85rem;
		}

		.status-grid strong,
		.result-grid h3,
		.result-screen__hero strong {
			font-size: 1.75rem;
		}

		.message-card {
			padding: 0.9rem;
			font-size: 0.98rem;
			line-height: 1.8;
		}

		.message-token {
			padding: 0.16rem 0.18rem;
			border-radius: 0.36rem;
		}

		.briefing-card {
			padding: 0.9rem;
		}

		.fallback-clues__grid {
			grid-template-columns: 1fr;
		}

		.result-actions {
			flex-direction: column;
		}
	}

	@media (max-width: 480px) {
		.status-grid {
			grid-template-columns: 1fr;
		}

		.message-meta {
			justify-content: start;
		}

		.tutorial-strip__steps span {
			width: 1.75rem;
			height: 1.75rem;
			font-size: 0.74rem;
		}

		.ai-feedback-card__header,
		.result-clues article div {
			flex-direction: column;
			align-items: flex-start;
		}
	}
</style>
