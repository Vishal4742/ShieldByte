<script lang="ts">
	import { browser } from '$app/environment';
	import { goto } from '$app/navigation';
	import type { PageData } from './$types.js';

	let { data }: { data: PageData } = $props();
	let links = $derived(data.links);
	let stats = $derived(data.stats);
	let userId = $derived(data.userId);

	let copiedCode: string | null = $state(null);

	$effect(() => {
		if (browser && !userId) {
			const storedId = localStorage.getItem('shieldbyte:player-id');
			if (storedId) {
				goto(`/profile/referrals?user_id=${encodeURIComponent(storedId)}`, { replaceState: true });
			}
		}
	});

	function copyLink(code: string) {
		const url = `${window.location.origin}/challenge/${code}`;
		navigator.clipboard.writeText(url);
		copiedCode = code;
		setTimeout(() => {
			if (copiedCode === code) copiedCode = null;
		}, 2000);
	}

	function formatDate(value: string) {
		return new Date(value).toLocaleDateString('en-IN', {
			year: 'numeric',
			month: 'short',
			day: 'numeric'
		});
	}
</script>

<svelte:head>
	<title>ShieldByte | Referrals</title>
</svelte:head>

<div class="referrals-shell">
	<main class="referrals-main">
		<section class="referrals-hero">
			<div>
				<p class="mono-label">Referral network</p>
				<h1>Challenge friends and spread scam awareness.</h1>
				<p class="referrals-copy">
					Share a mission link, bring someone into the game, and earn 500 XP for each successful recruit.
				</p>
			</div>
		</section>

		<section class="stats-strip">
			<article>
				<span class="mono-label">Total recruits</span>
				<strong>{stats.totalRecruits}</strong>
				<p>successful joins</p>
			</article>
			<article>
				<span class="mono-label">Link clicks</span>
				<strong>{stats.totalClicks}</strong>
				<p>challenge opens</p>
			</article>
			<article>
				<span class="mono-label">Bonus XP</span>
				<strong>+{stats.totalXpEarned}</strong>
				<p>earned from recruits</p>
			</article>
		</section>

		<section class="referrals-panel">
			<div class="section-header">
				<div>
					<p class="mono-label">Active links</p>
					<h2>Challenge links</h2>
				</div>
			</div>

			{#if links.length === 0}
				<div class="empty-state">
					<p>No challenge links yet.</p>
					<span>Finish a mission and use “Challenge a Friend” to generate your first referral link.</span>
				</div>
			{:else}
				<div class="links-list">
					{#each links as link}
						<article class="link-card">
							<div class="link-card__main">
								<p class="mono-label">Mission #{link.mission_id}</p>
								<h3>shieldbyte.app/challenge/{link.code}</h3>
								<p class="link-card__meta">Created {formatDate(link.created_at)}</p>
							</div>

							<div class="link-card__stats">
								<div>
									<span class="mono-label">Clicks</span>
									<strong>{link.clicks}</strong>
								</div>
								<div>
									<span class="mono-label">Recruits</span>
									<strong>{link.successful_recruits}</strong>
								</div>
							</div>

							<button type="button" class="copy-button" onclick={() => copyLink(link.code)}>
								{copiedCode === link.code ? 'Copied' : 'Copy link'}
							</button>
						</article>
					{/each}
				</div>
			{/if}
		</section>
	</main>
</div>

<style>
	.referrals-shell {
		position: relative;
		min-height: 100vh;
	}

	.referrals-main {
		max-width: 1100px;
		margin: 0 auto;
		padding: 1.5rem clamp(1rem, 4vw, 3rem) 4rem;
		display: grid;
		gap: 1.25rem;
	}

	.mono-label {
		margin: 0;
		font-family: var(--font-mono);
		font-size: 0.68rem;
		letter-spacing: 0.18em;
		text-transform: uppercase;
		color: var(--text-muted);
	}

	.referrals-hero,
	.stats-strip article,
	.referrals-panel,
	.link-card,
	.empty-state {
		border: 1px solid rgba(130, 191, 255, 0.1);
		border-radius: 1.2rem;
		background:
			radial-gradient(circle at top right, rgba(66, 199, 255, 0.06), transparent 24%),
			linear-gradient(180deg, rgba(255, 255, 255, 0.035), rgba(255, 255, 255, 0.015)),
			var(--surface-1);
		box-shadow: var(--shadow-hud);
	}

	.referrals-hero,
	.referrals-panel,
	.empty-state {
		padding: 1.25rem;
	}

	.referrals-hero h1,
	.section-header h2,
	.link-card h3 {
		margin: 0.45rem 0 0;
		font-family: var(--font-display);
		font-weight: 600;
		line-height: 0.98;
	}

	.referrals-hero h1 {
		font-size: clamp(2.35rem, 5vw, 4.1rem);
		max-width: 15ch;
	}

	.referrals-copy,
	.empty-state span,
	.link-card__meta {
		margin: 0.85rem 0 0;
		color: var(--text-soft);
		line-height: 1.7;
	}

	.stats-strip {
		display: grid;
		grid-template-columns: repeat(3, minmax(0, 1fr));
		gap: 0.85rem;
	}

	.stats-strip article {
		padding: 1rem;
	}

	.stats-strip strong {
		display: block;
		margin-top: 0.4rem;
		font-family: var(--font-display);
		font-size: 1.85rem;
		font-weight: 600;
		line-height: 1;
	}

	.stats-strip p {
		margin: 0.45rem 0 0;
		color: var(--text-soft);
	}

	.section-header {
		margin-bottom: 1rem;
	}

	.section-header h2 {
		font-size: clamp(1.9rem, 4vw, 2.8rem);
	}

	.links-list {
		display: grid;
		gap: 0.85rem;
	}

	.link-card {
		display: grid;
		grid-template-columns: minmax(0, 1.3fr) minmax(12rem, 0.55fr) auto;
		gap: 1rem;
		align-items: center;
		padding: 1rem;
	}

	.link-card h3 {
		font-size: 1.45rem;
		word-break: break-word;
	}

	.link-card__stats {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 0.65rem;
	}

	.link-card__stats div {
		padding: 0.75rem;
		border: 1px solid rgba(130, 191, 255, 0.08);
		border-radius: 1rem;
		background: rgba(255, 255, 255, 0.025);
	}

	.link-card__stats strong {
		display: block;
		margin-top: 0.35rem;
		font-family: var(--font-display);
		font-size: 1.35rem;
		font-weight: 600;
		line-height: 1;
	}

	.copy-button {
		min-height: 3rem;
		padding: 0 1rem;
		border: 1px solid rgba(130, 191, 255, 0.12);
		border-radius: 999px;
		background: linear-gradient(135deg, var(--accent-cyan), var(--accent-mint));
		color: #07131f;
		font-family: var(--font-mono);
		font-size: 0.68rem;
		font-weight: 600;
		letter-spacing: 0.16em;
		text-transform: uppercase;
		cursor: pointer;
	}

	.empty-state {
		text-align: center;
	}

	.empty-state p {
		margin: 0;
		font-family: var(--font-display);
		font-size: 1.6rem;
		font-weight: 600;
	}

	@media (max-width: 900px) {
		.stats-strip,
		.link-card {
			grid-template-columns: 1fr;
		}

		.link-card__stats {
			grid-template-columns: 1fr 1fr;
		}
	}

	@media (max-width: 720px) {
		.referrals-main {
			padding: 1rem 0.9rem 3rem;
		}

		.referrals-hero,
		.referrals-panel,
		.empty-state,
		.link-card {
			padding: 1rem;
			border-radius: 1rem;
		}
	}
</style>
