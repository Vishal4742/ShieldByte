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

	const segments = $derived(buildMissionSegments(mission.messageBody, mission.clues));

	let foundIds = $state<number[]>([]);
	let wrongTaps = $state(0);
	let secondsRemaining = $state(MISSION_DURATION_SECONDS);
	let paused = $state(false);
	let missionState = $state<'ready' | 'active' | 'finished'>('ready');
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
	let shareLinkText = $state('Challenge a Friend');
	let isGeneratingLink = $state(false);

	let tickTimer: number | undefined;
	let livesTimer: number | undefined;
	let flashTimer: number | undefined;
	let swipeOffsetX = $state(0);
	let swipeDragging = $state(false);
	let swipePointerId = $state<number | null>(null);
	let swipeStartX = $state(0);
	let comboChain = $state(0);
	let bestCombo = $state(0);
	const missionLabel = $derived(mission.fraudType.replaceAll('_', ' '));
	const beginnerSteps = [
		'Tap only the risky words or phrases in the message.',
		'Each wrong tap breaks one shield.',
		'Clear every red flag before the round clock hits zero.'
	];

	const allCluesFound = $derived(foundIds.length === mission.clues.length);
	const timerTone = $derived(secondsRemaining <= LOW_TIME_THRESHOLD_SECONDS ? 'critical' : 'steady');
	const hasLives = $derived(livesState.lives > 0);
	const completionPercent = $derived(Math.round((foundIds.length / mission.clues.length) * 100));
	const shieldDisplay = $derived(Array.from({ length: 3 }, (_, index) => index < livesState.lives));
	const swipeDecision = $derived.by(() => {
		if (swipeOffsetX > 70) return 'start';
		if (swipeOffsetX < -70) return 'skip';
		return null;
	});
	const swipeRotation = $derived(Math.max(-14, Math.min(14, swipeOffsetX / 18)));
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
		mission.clues.find((clue) => !foundIds.includes(clue.id))?.explanation ??
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
			const res = await fetch('/api/lives', {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
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
		if (missionState === 'active' || result || livesState.lives <= 0) {
			return;
		}

		missionState = 'active';
		paused = false;
		feedbackTitle = 'Mission live';
		feedbackBody = 'Incoming message intercepted. Tap only the parts that would put a real player at risk.';
		swipeOffsetX = 0;
		swipeDragging = false;
		startTimers();
	}

	function handleBriefingPointerDown(event: PointerEvent) {
		if (missionState !== 'ready' || result) {
			return;
		}

		swipeDragging = true;
		swipePointerId = event.pointerId;
		swipeStartX = event.clientX - swipeOffsetX;
		(event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
	}

	function handleBriefingPointerMove(event: PointerEvent) {
		if (!swipeDragging || swipePointerId !== event.pointerId) {
			return;
		}

		swipeOffsetX = Math.max(-180, Math.min(180, event.clientX - swipeStartX));
	}

	function resolveBriefingSwipe() {
		if (swipeOffsetX > 120) {
			beginMission();
			return;
		}

		if (swipeOffsetX < -120) {
			if (browser) {
				window.location.assign('/play');
			}
			return;
		}

		swipeOffsetX = 0;
	}

	function handleBriefingPointerUp(event: PointerEvent) {
		if (swipePointerId !== event.pointerId) {
			return;
		}

		swipeDragging = false;
		swipePointerId = null;
		resolveBriefingSwipe();
	}

	function handleBriefingKeydown(event: KeyboardEvent) {
		if (missionState !== 'ready' || result) {
			return;
		}

		if (event.key === 'ArrowRight' || event.key === 'Enter' || event.key === ' ') {
			event.preventDefault();
			beginMission();
		}

		if (event.key === 'ArrowLeft') {
			event.preventDefault();
			if (browser) {
				window.location.assign('/play');
			}
		}
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
			const response = await fetch('/api/missions/attempt', {
				method: 'POST',
				headers: {
					'content-type': 'application/json'
				},
				body: JSON.stringify({
					user_id: playerId,
					mission_id: mission.id,
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

	async function generateChallengeLink() {
		if (isGeneratingLink || !result) return;
		isGeneratingLink = true;
		shareLinkText = 'Generating...';

		try {
			const res = await fetch('/api/challenges/create', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					user_id: playerId,
					mission_id: mission.id,
					xp_earned: result.xpEarned,
					time_taken: MISSION_DURATION_SECONDS - result.secondsRemaining,
					wrong_taps: result.wrongTaps,
					clues_found: result.foundCount,
					clues_total: mission.clues.length,
					outcome: result.outcome
				})
			});

			if (res.ok) {
				const { code } = await res.json() as { code: string };
				const duelUrl = `${window.location.origin}/duel/${code}`;
				await navigator.clipboard.writeText(duelUrl);
				shareLinkText = 'Duel Link Copied!';
				setTimeout(() => { shareLinkText = 'Challenge a Friend'; }, 3000);
			} else {
				shareLinkText = 'Failed. Try again.';
				setTimeout(() => { shareLinkText = 'Challenge a Friend'; }, 3000);
			}
		} catch (e) {
			console.error('Failed to generate challenge link', e);
			shareLinkText = 'Error';
			setTimeout(() => { shareLinkText = 'Challenge a Friend'; }, 3000);
		} finally {
			isGeneratingLink = false;
		}
	}

	async function handleSegmentTap(segment: (typeof segments)[number]) {
		if (missionState !== 'active' || paused || result) {
			return;
		}

		if (segment.clueId !== null && segment.clue) {
			if (foundIds.includes(segment.clueId)) {
				return;
			}

			foundIds = [...foundIds, segment.clueId];
			comboChain += 1;
			bestCombo = Math.max(bestCombo, comboChain);
			pulseFeedback('correct', 'Nice catch', segment.clue.explanation);

			if (foundIds.length + 1 === mission.clues.length) {
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

		if (livesState.lives <= 0) {
			finishMission('failed');
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
		swipeOffsetX = 0;
		swipeDragging = false;
		swipePointerId = null;
		flashState = 'idle';
		feedbackTitle = livesState.lives > 0 ? 'Mission ready' : 'No shields available';
		feedbackBody =
			livesState.lives > 0
				? 'Read the briefing, then start the round when you are ready.'
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

		// Load lives from server (source of truth)
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

			missionState = 'ready';
			feedbackTitle = livesState.lives > 0 ? 'Mission briefing' : 'No shields available';
			feedbackBody =
				livesState.lives > 0
					? 'Read the setup, check your shields, then hit start when you are ready to defend the player.'
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
			<a class="ghost-link" href="/play">New round</a>
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
			<span class="label">Combo boost</span>
			<strong>{Math.min(1 + streakDays * 0.1, 2).toFixed(1)}x</strong>
			<p>{streakDays} day streak applied</p>
		</article>
		<article>
			<span class="label">Combo chain</span>
			<strong>x{Math.max(comboChain, 1)}</strong>
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
					class:briefing-card--dragging={swipeDragging}
					class="briefing-card"
					role="button"
					tabindex="0"
					aria-label="Swipe right to start mission or swipe left to skip mission"
					style={`transform: translateX(${swipeOffsetX}px) rotate(${swipeRotation}deg);`}
					onpointerdown={handleBriefingPointerDown}
					onpointermove={handleBriefingPointerMove}
					onpointerup={handleBriefingPointerUp}
					onpointercancel={handleBriefingPointerUp}
					onkeydown={handleBriefingKeydown}
				>
					<div class="briefing-card__swipe-hint">
						<span class:active={swipeDecision === 'skip'}>Skip</span>
						<strong>Swipe</strong>
						<span class:active={swipeDecision === 'start'}>Deploy</span>
					</div>
					<div class="briefing-card__header">
						<div>
							<p class="label">Mission briefing</p>
							<h3>Protect the player from a {missionLabel} trap</h3>
						</div>
						<span>{mission.simulationType.replaceAll('_', ' ')}</span>
					</div>
					<div class="briefing-card__grid">
						<article>
							<span class="label">Threat source</span>
							<strong>{mission.sender}</strong>
						</article>
						<article>
							<span class="label">Red flags hidden</span>
							<strong>{mission.clues.length}</strong>
						</article>
						<article>
							<span class="label">Round stakes</span>
							<strong>3 shields / 60s</strong>
						</article>
					</div>
					<p class="briefing-card__tip">{mission.tip}</p>
					<div class="briefing-card__actions">
						<button type="button" class="ghost-button" onclick={() => browser && window.location.assign('/play')}>
							Skip mission
						</button>
						<button type="button" class="primary-action briefing-card__action" onclick={beginMission}>
							Start mission
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
							class:found={segment.clueId !== null && foundIds.includes(segment.clueId)}
							class="message-token"
							disabled={missionState !== 'active' || paused || (segment.clueId !== null && foundIds.includes(segment.clueId))}
							onclick={() => handleSegmentTap(segment)}
						>
							{segment.text}
						</button>
					{/if}
				{/each}
			</div>
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

			<section>
				<p class="label">Target list</p>
				<h3>Hidden red flags</h3>
				<div class="clue-board">
					{#each mission.clues as clue}
						<article class:locked={foundIds.includes(clue.id)}>
							<div>
								<strong>{foundIds.includes(clue.id) ? 'Found' : 'Hidden'}</strong>
								<span>{clue.difficulty}</span>
							</div>
							<p>{foundIds.includes(clue.id) ? clue.triggerText : 'Find this red flag somewhere in the message.'}</p>
						</article>
					{/each}
				</div>
			</section>

			<section>
				<p class="label">Run sync</p>
				<h3>{saveState === 'saved' ? 'Round saved' : saveState === 'saving' ? 'Saving progress' : 'Progress tracker'}</h3>
				<p>{saveMessage}</p>
				{#if profileSnapshot}
					<div class="sync-metrics">
						<span>{profileSnapshot.rank}</span>
						<span>{profileSnapshot.totalXp} XP</span>
						<span>{profileSnapshot.streakDays} day streak</span>
					</div>
				{/if}
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
				<a class="ghost-link" href="/play">New round</a>
				<button type="button" class="ghost-button" class:share-loading={isGeneratingLink} onclick={generateChallengeLink}>
					{shareLinkText}
				</button>
			</div>
		</section>
	{/if}
</section>

<style>
	.gameplay-shell {
		--panel: rgba(8, 15, 24, 0.88);
		--panel-strong: rgba(11, 20, 32, 0.94);
		--line: rgba(138, 190, 214, 0.18);
		--line-hot: rgba(255, 111, 97, 0.44);
		--text: #f2eee7;
		--muted: rgba(236, 230, 219, 0.62);
		--mint: #7df2c9;
		--amber: #f5c46c;
		--red: #ff6f61;
		display: grid;
		gap: 1rem;
		color: var(--text);
	}

	.label,
	.message-meta span,
	.clue-board strong,
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
			radial-gradient(circle at top right, rgba(125, 242, 201, 0.08), transparent 22%),
			linear-gradient(180deg, rgba(255, 255, 255, 0.04), rgba(255, 255, 255, 0.01)),
			var(--panel);
		box-shadow: 0 22px 60px rgba(0, 0, 0, 0.26);
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
			linear-gradient(180deg, rgba(255, 255, 255, 0.04), rgba(255, 255, 255, 0.01)),
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
		border: 1px solid rgba(255, 255, 255, 0.08);
		background: rgba(255, 255, 255, 0.04);
	}

	.tutorial-strip__steps span {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 2rem;
		height: 2rem;
		border-radius: 999px;
		background: var(--mint);
		color: #06271d;
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
			background-color 150ms ease;
	}

	.ghost-link,
	.ghost-button {
		background: transparent;
		color: var(--text);
	}

	.primary-action {
		border-color: transparent;
		background: linear-gradient(135deg, var(--amber), var(--mint));
		color: #052018;
	}

	.ghost-link:hover,
	.ghost-button:hover,
	.primary-action:hover {
		transform: translateY(-1px);
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
		box-shadow: 0 0 0 1px rgba(255, 111, 97, 0.18), 0 0 40px rgba(255, 111, 97, 0.08);
	}

	.status-grid article.critical strong {
		color: #ffd8d4;
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
		background: rgba(125, 242, 201, 0.12);
	}

	.message-slate.flash-wrong::after {
		background: rgba(255, 111, 97, 0.12);
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
		touch-action: pan-y;
		transition: transform 180ms ease;
	}

	.briefing-card--dragging {
		transition: none;
		cursor: grabbing;
	}

	.briefing-card__swipe-hint {
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: 0.75rem;
		margin-bottom: 0.9rem;
		font-family: var(--font-mono, 'IBM Plex Mono', monospace);
		font-size: 0.66rem;
		letter-spacing: 0.16em;
		text-transform: uppercase;
		color: var(--muted);
	}

	.briefing-card__swipe-hint span,
	.briefing-card__swipe-hint strong {
		padding: 0.35rem 0.55rem;
		border: 1px solid rgba(255, 255, 255, 0.08);
		background: rgba(255, 255, 255, 0.03);
	}

	.briefing-card__swipe-hint span.active {
		border-color: rgba(255, 183, 77, 0.3);
		background: rgba(255, 183, 77, 0.08);
		color: var(--text);
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

	.briefing-card__actions {
		display: flex;
		flex-wrap: wrap;
		gap: 0.8rem;
		margin-top: 1rem;
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

	.clue-board {
		display: grid;
		gap: 0.75rem;
		margin-top: 0.85rem;
	}

	.sync-metrics {
		display: flex;
		flex-wrap: wrap;
		gap: 0.55rem;
		margin-top: 0.85rem;
	}

	.sync-metrics span {
		padding: 0.45rem 0.65rem;
		border: 1px solid rgba(255, 255, 255, 0.08);
		background: rgba(255, 255, 255, 0.04);
		font-family: var(--font-mono, 'IBM Plex Mono', monospace);
		font-size: 0.72rem;
		letter-spacing: 0.12em;
		text-transform: uppercase;
	}

	.clue-board article {
		padding: 0.85rem;
		border: 1px solid rgba(255, 255, 255, 0.08);
		background: rgba(255, 255, 255, 0.03);
	}

	.clue-board article.locked {
		border-color: rgba(125, 242, 201, 0.28);
		background: rgba(125, 242, 201, 0.08);
	}

	.clue-board article div {
		display: flex;
		justify-content: space-between;
		gap: 0.8rem;
		align-items: center;
	}

	.clue-board article p {
		margin-top: 0.55rem;
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
</style>
