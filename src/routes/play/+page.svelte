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
			<p>{data.selectionMode === 'swipe_deck' ? 'Case selected from mission board' : 'Scam judgment round'}</p>
			<h1>Scam Hunt</h1>
		</div>
		<div class="play-head__meta">
			{#if data.selectionMode === 'swipe_deck'}
				<span>direct deploy</span>
			{/if}
			{#if data.requestedFraudType}
				<span>{data.requestedFraudType.replaceAll('_', ' ')}</span>
			{/if}
			<span>60 second round</span>
			<span>3 shields</span>
			<span>spot the scam</span>
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
		opacity: 0.08;
		background-image:
			linear-gradient(rgba(114, 255, 214, 0.12) 1px, transparent 1px),
			linear-gradient(90deg, rgba(114, 255, 214, 0.08) 1px, transparent 1px);
		background-size: 88px 88px;
	}

	.play-shell__glow {
		position: fixed;
		width: 18rem;
		height: 18rem;
		border-radius: 999px;
		filter: blur(120px);
		pointer-events: none;
		opacity: 0.08;
	}

	.play-shell__glow--mint {
		top: -12rem;
		left: -10rem;
		background: #7df2c9;
	}

	.play-shell__glow--ember {
		right: -12rem;
		top: 2rem;
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
		padding: 1rem clamp(1.2rem, 4vw, 3rem) 0.9rem;
		backdrop-filter: blur(18px);
		background: linear-gradient(180deg, rgba(7, 14, 24, 0.9), rgba(7, 14, 24, 0.58));
		border-bottom: 1px solid rgba(130, 191, 255, 0.08);
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
		font-size: clamp(2.15rem, 5vw, 3.6rem);
		font-weight: 600;
		line-height: 0.98;
	}

	.play-head__meta {
		display: flex;
		flex-wrap: wrap;
		gap: 0.6rem;
	}

	.play-head__meta span {
		padding: 0.5rem 0.7rem;
		border: 1px solid rgba(130, 191, 255, 0.1);
		border-radius: 999px;
		background: rgba(255, 255, 255, 0.025);
		color: var(--text-soft);
	}

	main {
		position: relative;
		z-index: 1;
		padding: 1rem clamp(1.2rem, 4vw, 3rem) 3rem;
	}

	.empty-state {
		max-width: 44rem;
		padding: 1.4rem;
		border: 1px solid rgba(130, 191, 255, 0.12);
		border-radius: 1.25rem;
		background:
			radial-gradient(circle at top right, rgba(66, 199, 255, 0.08), transparent 26%),
			linear-gradient(180deg, rgba(255, 255, 255, 0.04), rgba(255, 255, 255, 0.01)),
			var(--surface-2);
		box-shadow: var(--shadow-hud);
	}

	.empty-state h2 {
		margin: 0.45rem 0 0;
		font-family: var(--font-display);
		font-size: clamp(2.1rem, 5vw, 3.8rem);
		font-weight: 600;
		line-height: 0.98;
	}

	.empty-state p:last-of-type {
		color: var(--text-soft);
		line-height: 1.7;
	}

	.empty-state a {
		display: inline-flex;
		margin-top: 1rem;
		padding: 0.85rem 1rem;
		border: 1px solid rgba(130, 191, 255, 0.12);
		border-radius: 999px;
		color: var(--text-strong);
		text-decoration: none;
	}

	@media (max-width: 720px) {
		.play-head {
			flex-direction: column;
			align-items: start;
			padding: 0.85rem 0.9rem;
		}

		.play-head h1 {
			font-size: clamp(1.85rem, 10vw, 2.8rem);
		}

		.play-head__meta {
			width: 100%;
			gap: 0.45rem;
		}

		.play-head__meta span {
			padding: 0.45rem 0.6rem;
			font-size: 0.62rem;
			letter-spacing: 0.12em;
		}

		main {
			padding: 0.9rem 0.9rem 2.5rem;
		}

		.empty-state {
			padding: 1rem;
			border-radius: 1rem;
		}
	}

	@media (max-width: 480px) {
		.play-head p,
		.eyebrow {
			font-size: 0.62rem;
			letter-spacing: 0.12em;
		}

		.play-head__meta span {
			width: calc(50% - 0.25rem);
			box-sizing: border-box;
		}
	}
</style>
