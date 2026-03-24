<script lang="ts">
	import type { PageData } from './$types.js';
	import { fade, slide } from 'svelte/transition';
	
	let { data }: { data: PageData } = $props();
	let links = $derived(data.links);
	let stats = $derived(data.stats);
	
	let copiedCode: string | null = $state(null);
	
	function copyLink(code: string) {
		const url = `${window.location.origin}/challenge/${code}`;
		navigator.clipboard.writeText(url);
		copiedCode = code;
		setTimeout(() => {
			if (copiedCode === code) copiedCode = null;
		}, 2000);
	}
</script>

<svelte:head>
	<title>ShieldByte | Referrals</title>
</svelte:head>

<div class="max-w-4xl mx-auto p-4 md:p-8 space-y-8 pb-32">
	<div class="space-y-4 text-center">
		<h1 class="text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-emerald-400 to-cyan-400">
			Recruit Network
		</h1>
		<p class="text-gray-400 text-lg">Challenge friends, spread awareness, and earn <span class="text-emerald-400 font-bold">500 XP</span> per successful recruit.</p>
	</div>

	<!-- Stats Grid -->
	<div class="grid grid-cols-1 md:grid-cols-3 gap-6">
		<div class="bg-gray-800/50 rounded-2xl p-6 border border-emerald-500/20 text-center">
			<div class="text-emerald-500 mb-2">
				<svg class="w-8 h-8 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
				</svg>
			</div>
			<div class="text-3xl font-bold text-white mb-1">{stats.totalRecruits}</div>
			<div class="text-sm text-gray-400 uppercase tracking-widest font-semibold">Total Recruits</div>
		</div>

		<div class="bg-gray-800/50 rounded-2xl p-6 border border-cyan-500/20 text-center">
			<div class="text-cyan-500 mb-2">
				<svg class="w-8 h-8 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
				</svg>
			</div>
			<div class="text-3xl font-bold text-white mb-1">{stats.totalClicks}</div>
			<div class="text-sm text-gray-400 uppercase tracking-widest font-semibold">Link Clicks</div>
		</div>

		<div class="bg-gradient-to-br from-emerald-500/20 to-cyan-500/20 rounded-2xl p-6 border border-emerald-500/30 text-center relative overflow-hidden">
			<div class="absolute -right-4 -top-4 w-24 h-24 bg-emerald-500/20 blur-2xl rounded-full"></div>
			<div class="text-emerald-400 mb-2 relative z-10">
				<svg class="w-8 h-8 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
				</svg>
			</div>
			<div class="text-3xl font-bold text-white mb-1 relative z-10">+{stats.totalXpEarned}</div>
			<div class="text-sm text-gray-400 uppercase tracking-widest font-semibold relative z-10">Bonus XP</div>
		</div>
	</div>

	<!-- Links List -->
	<div class="bg-gray-900 rounded-3xl p-6 border border-gray-800">
		<h2 class="text-xl font-bold text-white mb-6">Active Challenge Links</h2>
		
		{#if links.length === 0}
			<div class="text-center py-12 text-gray-500">
				<svg class="w-16 h-16 mx-auto mb-4 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
				</svg>
				<p class="text-lg">You haven't shared any missions yet.</p>
				<p class="text-sm mt-2">Finish a mission and tap "Challenge a Friend" to generate a link!</p>
			</div>
		{:else}
			<div class="space-y-4">
				{#each links as link}
					<div class="bg-gray-800/50 hover:bg-gray-800 transition-colors rounded-2xl p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border border-gray-700/50">
						<div>
							<div class="text-sm text-gray-400 mb-1">Mission #{link.mission_id} - {new Date(link.created_at).toLocaleDateString()}</div>
							<div class="font-mono text-emerald-400 tracking-wider font-bold">shieldbyte.app/challenge/{link.code}</div>
						</div>
						
						<div class="flex items-center gap-6 w-full md:w-auto mt-2 md:mt-0">
							<div class="flex items-center gap-4 text-sm text-gray-400 bg-gray-900 rounded-lg px-3 py-1.5 flex-1 md:flex-none justify-center">
								<span title="Clicks">👁️ {link.clicks}</span>
								<span>•</span>
								<span title="Recruits" class="text-emerald-400 font-semibold">🤝 {link.successful_recruits}</span>
							</div>
							
							<button 
								onclick={() => copyLink(link.code)}
								class="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-xl transition-colors font-semibold text-sm flex items-center gap-2"
							>
								{#if copiedCode === link.code}
									<span in:fade>✓ Copied</span>
								{:else}
									<svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
										<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
									</svg>
									Copy
								{/if}
							</button>
						</div>
					</div>
				{/each}
			</div>
		{/if}
	</div>
</div>
