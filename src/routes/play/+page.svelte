<script lang="ts">
	import GameplayEngine from '$lib/components/gameplay/GameplayEngine.svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
</script>

<svelte:head>
	<title>ShieldByte | Live Mission</title>
	<meta
		name="description"
		content="Play a live ShieldByte mission with a timer, shield lives, tap detection, and result breakdown."
	/>
	<link rel="preconnect" href="https://fonts.googleapis.com" />
	<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="anonymous" />
	<link
		href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500;600&display=swap"
		rel="stylesheet"
	/>
</svelte:head>

<div class="play-shell">
	<div class="play-shell__glow play-shell__glow--mint"></div>
	<div class="play-shell__glow play-shell__glow--ember"></div>

	<header class="play-head">
		<div>
			<p>ShieldByte Academy</p>
			<h1>Scam Hunt</h1>
		</div>
		<nav>
			<a href="/">Home</a>
			<a href="/#feed">Practice Cases</a>
		</nav>
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
	:global(body) {
		margin: 0;
		background:
			radial-gradient(circle at top left, rgba(125, 242, 201, 0.08), transparent 22%),
			radial-gradient(circle at 82% 12%, rgba(255, 111, 97, 0.08), transparent 20%),
			#040a10;
		color: #f2eee7;
		font-family: 'Cormorant Garamond', serif;
	}

	.play-shell {
		--font-display: 'Cormorant Garamond', serif;
		--font-mono: 'IBM Plex Mono', monospace;
		position: relative;
		min-height: 100vh;
		overflow: clip;
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
		background: rgba(4, 10, 16, 0.72);
		border-bottom: 1px solid rgba(255, 255, 255, 0.06);
	}

	.play-head p,
	.play-head nav a,
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

	.play-head nav {
		display: flex;
		flex-wrap: wrap;
		gap: 1rem;
	}

	.play-head nav a,
	.empty-state a {
		color: #f2eee7;
		text-decoration: none;
	}

	main {
		position: relative;
		z-index: 1;
		padding: 1.25rem clamp(1.2rem, 4vw, 3rem) 3rem;
	}

	.empty-state {
		max-width: 44rem;
		padding: 1.4rem;
		border: 1px solid rgba(255, 255, 255, 0.12);
		background:
			linear-gradient(180deg, rgba(255, 255, 255, 0.04), rgba(255, 255, 255, 0.01)),
			rgba(8, 15, 24, 0.86);
	}

	.empty-state h2 {
		margin: 0.45rem 0 0;
		font-family: var(--font-display);
		font-size: clamp(2.1rem, 5vw, 3.8rem);
		font-weight: 500;
		line-height: 0.95;
	}

	.empty-state p:last-of-type {
		color: rgba(242, 238, 231, 0.72);
		line-height: 1.7;
	}

	.empty-state a {
		display: inline-flex;
		margin-top: 1rem;
		padding: 0.85rem 1rem;
		border: 1px solid rgba(255, 255, 255, 0.12);
	}

	@media (max-width: 720px) {
		.play-head {
			flex-direction: column;
			align-items: start;
		}
	}
</style>
