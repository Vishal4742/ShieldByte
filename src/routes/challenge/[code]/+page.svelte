<script lang="ts">
	import { browser } from '$app/environment';
	import GameplayEngine from '$lib/components/gameplay/GameplayEngine.svelte';
	import { PLAYER_ID_STORAGE_KEY, getOrCreatePlayerId } from '$lib/gameplay/engine.js';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	let challengeAccepted = $state(false);
	let claimState = $state<'idle' | 'claiming' | 'done' | 'error'>('idle');
	let claimMessage = $state('');

	async function acceptChallenge() {
		challengeAccepted = true;
		claimState = 'claiming';

		if (!browser) {
			return;
		}

		const playerId = getOrCreatePlayerId(localStorage.getItem(PLAYER_ID_STORAGE_KEY));
		localStorage.setItem(PLAYER_ID_STORAGE_KEY, playerId);

		try {
			const tokenRes = await fetch('/api/user/token', {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ user_id: playerId })
			});

			const tokenPayload = tokenRes.ok ? ((await tokenRes.json()) as { token: string }) : null;

			await fetch('/api/referrals/claim', {
				method: 'POST',
				headers: {
					'content-type': 'application/json',
					...(tokenPayload?.token
						? {
								'x-player-id': playerId,
								'x-player-token': tokenPayload.token
							}
						: {})
				},
				body: JSON.stringify({
					code: data.code,
					recruit_user_id: playerId
				})
			});

			claimState = 'done';
		} catch (error) {
			console.error('[challenge] Failed to claim referral:', error);
			claimState = 'error';
			claimMessage = 'Challenge accepted. Referral reward could not be claimed automatically.';
		}
	}
</script>

<svelte:head>
	<title>ShieldByte | Challenge</title>
</svelte:head>

<div class="challenge-shell">
	{#if !challengeAccepted}
		<main class="challenge-main">
			<section class="challenge-hero">
				<p class="challenge-label">Friend challenge</p>
				<h1>{data.referrerName} sent you a live scam round.</h1>
				<p class="challenge-copy">
					Play the same mission, beat the score, and prove you can spot the scam faster.
				</p>

				<div class="challenge-meta">
					<span>{data.mission.difficulty} difficulty</span>
					<span>{data.mission.fraudType.replaceAll('_', ' ')}</span>
					<span>head to head</span>
				</div>

				<div class="challenge-brief">
					<p class="challenge-label">Mission brief</p>
					<h2>Read the message. Judge the threat. Lock the scam signals.</h2>
					<p>
						This round uses the same mission rules as the main game: one clock, limited shields,
						and score pressure.
					</p>
				</div>

				<button type="button" class="challenge-cta" onclick={acceptChallenge}>
					Accept challenge
				</button>
			</section>
		</main>
	{:else}
		{#if claimState === 'error'}
			<div class="challenge-banner">{claimMessage}</div>
		{/if}

		<GameplayEngine mission={data.mission} streakDays={0} />
	{/if}
</div>

<style>
	.challenge-shell {
		padding: 1.25rem clamp(1rem, 4vw, 3rem) 3rem;
	}

	.challenge-main {
		max-width: 860px;
		margin: 0 auto;
	}

	.challenge-hero,
	.challenge-brief,
	.challenge-banner {
		border: 1px solid var(--panel-border);
		border-radius: 1.25rem;
		background:
			radial-gradient(circle at top right, rgba(66, 199, 255, 0.1), transparent 24%),
			linear-gradient(180deg, rgba(255, 255, 255, 0.04), rgba(255, 255, 255, 0.01)),
			var(--surface-1);
		box-shadow: var(--shadow-hud);
	}

	.challenge-hero {
		padding: 1.4rem;
	}

	.challenge-label,
	.challenge-meta span {
		font-family: var(--font-mono);
		font-size: 0.7rem;
		letter-spacing: 0.16em;
		text-transform: uppercase;
		color: var(--text-muted);
	}

	.challenge-hero h1,
	.challenge-brief h2 {
		margin: 0.45rem 0 0;
		font-family: var(--font-display);
		font-size: clamp(2.4rem, 6vw, 4.6rem);
		font-weight: 700;
		line-height: 0.94;
	}

	.challenge-copy,
	.challenge-brief p,
	.challenge-banner {
		color: var(--text-soft);
		line-height: 1.7;
	}

	.challenge-copy {
		max-width: 40rem;
		margin: 0.85rem 0 0;
		font-size: 1.03rem;
	}

	.challenge-meta {
		display: flex;
		flex-wrap: wrap;
		gap: 0.6rem;
		margin-top: 1rem;
	}

	.challenge-meta span {
		padding: 0.45rem 0.7rem;
		border: 1px solid rgba(130, 191, 255, 0.12);
		border-radius: 999px;
		background: rgba(255, 255, 255, 0.03);
		color: var(--text-soft);
	}

	.challenge-brief {
		margin-top: 1.2rem;
		padding: 1.1rem;
	}

	.challenge-cta {
		margin-top: 1.2rem;
		min-height: 3.2rem;
		padding: 0 1.3rem;
		border: none;
		border-radius: 0.95rem;
		background: linear-gradient(135deg, var(--accent-cyan), var(--accent-mint));
		color: #07131f;
		font-family: var(--font-mono);
		font-size: 0.72rem;
		font-weight: 600;
		letter-spacing: 0.16em;
		text-transform: uppercase;
		cursor: pointer;
	}

	.challenge-banner {
		max-width: 860px;
		margin: 0 auto 1rem;
		padding: 0.9rem 1rem;
	}

	@media (max-width: 720px) {
		.challenge-shell {
			padding: 1rem 0.9rem 2.5rem;
		}

		.challenge-hero,
		.challenge-brief {
			padding: 1rem;
			border-radius: 1rem;
		}

		.challenge-hero h1,
		.challenge-brief h2 {
			font-size: clamp(2rem, 9vw, 3rem);
		}

		.challenge-copy {
			font-size: 0.96rem;
		}

		.challenge-cta {
			width: 100%;
		}
	}
</style>
