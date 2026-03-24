<script lang="ts">
	import GameplayEngine from '$lib/components/gameplay/GameplayEngine.svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
	let code = $derived(data.code);
	let mission = $derived(data.mission);
	let referrerName = $derived(data.referrerName);
	let recruitId = $derived(data.recruitId);

	let challengeAccepted = $state(false);

	async function acceptChallenge() {
		challengeAccepted = true;
	}
	
	// When the mission finishes in GameplayEngine, we should ideally claim the referral.
	// We'll intercept or just call the claim endpoint when they start.
	// Since we don't have a rigid auth wall, let's claim it as soon as they accept if we have a recruitId,
	// or fake it by sending a random id as guest to test the link mapping.
	$effect(() => {
		if (challengeAccepted) {
			const guestId = recruitId || 'guest-' + Math.random().toString(36).substring(7);
			fetch('/api/referrals/claim', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ code, recruit_user_id: guestId })
			}).catch(e => console.error(e));
		}
	});

</script>

<svelte:head>
	<title>ShieldByte | Challenge</title>
</svelte:head>

<div class="challenge-shell">
	{#if !challengeAccepted}
		<main class="landing-card bg-gray-900 border border-emerald-500/30 rounded-3xl p-8 max-w-xl mx-auto mt-20 text-center relative overflow-hidden">
			<div class="absolute inset-0 bg-gradient-to-b from-emerald-500/10 to-transparent pointer-events-none"></div>
			
			<div class="w-20 h-20 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
				<span class="text-4xl">🎯</span>
			</div>

			<h1 class="text-3xl font-bold text-white mb-2">You've Been Challenged!</h1>
			<p class="text-emerald-400 font-semibold text-lg mb-6">{referrerName} thinks you have what it takes to beat this Cyber Threat Mission.</p>
			
			<div class="bg-gray-800 rounded-xl p-4 text-left border border-gray-700 mb-8 mt-4 mx-4 shadow-inner">
				<p class="text-sm font-mono text-gray-500 uppercase tracking-widest mb-2">Mission Brief</p>
				<p class="text-gray-300">Identify the hidden threat signals within this incoming message. Don't fall for the traps!</p>
				<div class="mt-4 flex gap-4 text-sm font-mono text-cyan-400">
					<span>Difficulty: {mission.difficulty}</span>
					<span>•</span>
					<span>Target: {mission.fraudType.replace('_', ' ')}</span>
				</div>
			</div>

			<button 
				onclick={acceptChallenge}
				class="bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 text-gray-900 px-8 py-4 rounded-xl font-bold text-xl transition-all hover:scale-105 shadow-[0_0_30px_rgba(16,185,129,0.3)] w-full block"
			>
				ACCEPT CHALLENGE
			</button>
			<p class="text-gray-500 text-sm mt-4">No sign-up required. Play instantly.</p>
		</main>
	{:else}
		<GameplayEngine mission={mission} streakDays={0} />
	{/if}
</div>

<style>
	:global(body) {
		margin: 0;
		background: #040a10;
		color: #f2eee7;
		font-family: 'Cormorant Garamond', serif;
	}

	.challenge-shell {
		position: relative;
		min-height: 100vh;
	}
</style>
