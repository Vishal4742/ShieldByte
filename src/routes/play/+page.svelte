<script lang="ts">
	import GameplayEngine from '$lib/components/gameplay/GameplayEngine.svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
</script>

<svelte:head>
	<title>ShieldByte | Scam Hunt</title>
	<meta
		name="description"
		content="Play a live ShieldByte round with shields, timer pressure, clue tapping, and arcade-style scam defense feedback."
	/>
</svelte:head>

<div class="play-shell">
	<div class="play-shell__glow play-shell__glow--mint"></div>
	<div class="play-shell__glow play-shell__glow--ember"></div>
	<div class="play-shell__grid"></div>

	<header class="play-head">
		<div>
			<p>{data.selectionMode === 'swipe_deck' ? 'Swipe-selected mission' : 'Arcade mission room'}</p>
			<h1>Scam Hunt</h1>
		</div>
		<div class="play-head__meta">
			{#if data.selectionMode === 'swipe_deck'}
				<span>direct deploy</span>
			{/if}
			{#if data.requestedFraudType}
				<span>{data.requestedFraudType.replaceAll('_', ' ')}</span>
			{/if}
			<span>60s round</span>
			<span>3 shields</span>
			<span>live clue taps</span>
		</div>
	</header>

	<main>
		{#if data.mission}
			<GameplayEngine mission={data.mission} streakDays={data.streakDays} />
		{:else}
			<section class="empty-state">
				<p class="eyebrow">No mission available</p>
				<h2>Generate active missions before opening the play screen.</h2>
				<p>
					Run the ingestion, classification, and mission generation pipelines, then reload this page.
				</p>
				<a href="/">Return home</a>
			</section>
		{/if}
	</main>
</div>

<style>
	.play-shell {
		position: relative;
		min-height: 100vh;
		overflow: clip;
	}

	.play-shell__grid {
		position: fixed;
		inset: 0;
		pointer-events: none;
		opacity: 0.12;
		background-image:
			linear-gradient(rgba(114, 255, 214, 0.12) 1px, transparent 1px),
			linear-gradient(90deg, rgba(114, 255, 214, 0.08) 1px, transparent 1px);
		background-size: 88px 88px;
		mask-image: radial-gradient(circle at center, black, transparent 88%);
	}

	.play-shell__glow {
		position: fixed;
		width: 28rem;
		height: 28rem;
		border-radius: 999px;
		filter: blur(100px);
		pointer-events: none;
		opacity: 0.15;
	}

	.play-shell__glow--mint {
		top: -10rem;
		left: -8rem;
		background: #7df2c9;
	}

	.play-shell__glow--ember {
		right: -10rem;
		top: 4rem;
		background: #ff6f61;
	}

	.play-head {
		position: sticky;
		top: 0;
		z-index: 10;
		display: flex;
		justify-content: space-between;
		gap: 1rem;
		align-items: end;
		padding: 1rem clamp(1.2rem, 4vw, 3rem);
		backdrop-filter: blur(18px);
		background: rgba(6, 12, 22, 0.72);
		border-bottom: 1px solid rgba(255, 255, 255, 0.08);
	}

	.play-head p,
	.play-head__meta span,
	.eyebrow {
		font-family: var(--font-mono);
		font-size: 0.72rem;
		letter-spacing: 0.16em;
		text-transform: uppercase;
		color: rgba(242, 238, 231, 0.62);
	}

	.play-head h1 {
		margin: 0.35rem 0 0;
		font-family: var(--font-display);
		font-size: clamp(2rem, 5vw, 3.8rem);
		font-weight: 500;
		line-height: 0.95;
	}

	.play-head__meta {
		display: flex;
		flex-wrap: wrap;
		gap: 0.6rem;
	}

	.play-head__meta span {
		padding: 0.5rem 0.7rem;
		border: 1px solid rgba(255, 255, 255, 0.08);
		border-radius: 999px;
		background: rgba(255, 255, 255, 0.04);
		color: var(--text-soft);
	}

	main {
		position: relative;
		z-index: 1;
		padding: 1.25rem clamp(1.2rem, 4vw, 3rem) 3rem;
	}

	.empty-state {
		max-width: 44rem;
		padding: 1.4rem;
		border: 1px solid var(--line-soft);
		background:
			radial-gradient(circle at top right, rgba(255, 183, 77, 0.08), transparent 26%),
			linear-gradient(180deg, rgba(255, 255, 255, 0.04), rgba(255, 255, 255, 0.01)),
			var(--surface-2);
		box-shadow: var(--shadow-arcade);
	}

	.empty-state h2 {
		margin: 0.45rem 0 0;
		font-family: var(--font-display);
		font-size: clamp(2.1rem, 5vw, 3.8rem);
		font-weight: 500;
		line-height: 0.95;
	}

	.empty-state p:last-of-type {
		color: var(--text-soft);
		line-height: 1.7;
	}

	.empty-state a {
		display: inline-flex;
		margin-top: 1rem;
		padding: 0.85rem 1rem;
		border: 1px solid rgba(255, 255, 255, 0.12);
		color: var(--text-strong);
		text-decoration: none;
	}

	@media (max-width: 720px) {
		.play-head {
			flex-direction: column;
			align-items: start;
		}
	}
</style>
