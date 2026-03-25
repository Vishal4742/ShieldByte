<script lang="ts">
	import Hero from '$lib/components/home/Hero.svelte';
	import SwipeDeck from '$lib/components/home/SwipeDeck.svelte';
	import TrainingDeck from '$lib/components/home/TrainingDeck.svelte';
	import ThreatCard from '$lib/components/home/ThreatCard.svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
</script>

<svelte:head>
	<title>ShieldByte | Scam Defense Arcade</title>
	<meta
		name="description"
		content="ShieldByte turns real scam cases into game-like practice rounds so new users can learn fast and keep playing."
	/>
</svelte:head>

<div class="shell">
	<div class="shell__grain"></div>
	<div class="shell__glow shell__glow--left"></div>
	<div class="shell__glow shell__glow--right"></div>

	<main>
		<Hero articles={data.articles} />

		<section class="start-strip">
			<article>
				<span>Choose dossier</span>
				<p>Pick a mission from the queue and read the setup like a pre-round briefing.</p>
			</article>
			<article>
				<span>Read the board</span>
				<p>Study the live signals, pressure cues, and scam pattern before you deploy.</p>
			</article>
			<article>
				<span>Clear the run</span>
				<p>Enter Scam Hunt, protect your shields, and finish the round clean.</p>
			</article>
		</section>

		<SwipeDeck articles={data.articles} />

		<section class="feed-panel" id="feed">
			<div class="section-heading section-heading--row">
				<div>
					<p>Mission archive</p>
					<h2>Playable dossier board</h2>
				</div>
				<span class="feed-panel__hint">Each dossier is a real scam pattern translated into a playable run. Start simple, then move into messy live cases.</span>
			</div>

			{#if data.articles.length > 0}
				<div class="feed-grid">
					{#each data.articles as article, index}
						<ThreatCard {article} {index} />
					{/each}
				</div>
			{:else}
				<div class="empty-state">
					<p>No classified articles yet.</p>
					<span>Run the ingestion and classification cron endpoints to populate the case queue.</span>
				</div>
			{/if}
		</section>

		<TrainingDeck article={data.featuredArticle} mission={data.featuredMission} />
	</main>
</div>

<style>
	.shell {
		position: relative;
		min-height: 100vh;
		overflow: clip;
	}

	.shell__grain {
		position: fixed;
		inset: 0;
		pointer-events: none;
		opacity: 0.15;
		background-image:
			linear-gradient(rgba(255, 255, 255, 0.04) 1px, transparent 1px),
			linear-gradient(90deg, rgba(255, 255, 255, 0.03) 1px, transparent 1px);
		background-size: 52px 52px;
		mask-image: radial-gradient(circle at center, black, transparent 88%);
	}

	.shell__glow {
		position: fixed;
		width: 32rem;
		height: 32rem;
		border-radius: 999px;
		filter: blur(90px);
		pointer-events: none;
		opacity: 0.12;
	}

	.shell__glow--left {
		top: -8rem;
		left: -8rem;
		background: #f2ab5a;
	}

	.shell__glow--right {
		top: 8rem;
		right: -12rem;
		background: #5c7fd8;
	}

	.start-strip span,
	.section-heading p,
	.feed-panel__hint,
	.empty-state span {
		font-family: var(--font-mono);
		font-size: 0.72rem;
		text-transform: uppercase;
		letter-spacing: 0.18em;
		color: var(--text-muted);
	}

	main {
		position: relative;
		z-index: 1;
		padding: 0 clamp(1.2rem, 4vw, 3rem) 4rem;
	}

	.start-strip,
	.feed-panel,
	.empty-state {
		padding: 1.2rem;
		border: 1px solid var(--line-soft);
		background:
			radial-gradient(circle at top right, rgba(114, 255, 214, 0.07), transparent 24%),
			linear-gradient(180deg, rgba(255, 255, 255, 0.04), rgba(255, 255, 255, 0.01)),
			var(--surface-1);
		box-shadow: var(--shadow-arcade);
	}

	.start-strip {
		display: grid;
		grid-template-columns: repeat(3, minmax(0, 1fr));
		gap: 0.9rem;
		margin-top: 0.8rem;
	}

	.start-strip article {
		padding: 1rem;
		border: 1px solid rgba(255, 255, 255, 0.1);
		background: rgba(255, 255, 255, 0.04);
	}

	.start-strip p {
		margin: 0.55rem 0 0;
		color: var(--text-strong);
		line-height: 1.6;
	}

	.start-strip article:first-child {
		border-color: rgba(255, 183, 77, 0.24);
	}

	.start-strip article:nth-child(2) {
		border-color: rgba(114, 255, 214, 0.2);
	}

	.start-strip article:nth-child(3) {
		border-color: rgba(255, 103, 77, 0.18);
	}

	.feed-panel {
		margin-top: 1rem;
	}

	.section-heading h2 {
		margin: 0.35rem 0 0;
		font-family: var(--font-display);
		font-size: clamp(2.2rem, 5vw, 3.9rem);
		font-weight: 500;
		line-height: 0.94;
	}

	.section-heading--row {
		display: flex;
		justify-content: space-between;
		gap: 1rem;
		align-items: end;
	}

	.feed-panel__hint {
		max-width: 16rem;
		line-height: 1.7;
	}

	.feed-grid {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: 1rem;
		margin-top: 1rem;
	}

	.empty-state {
		color: var(--text-soft);
		margin-top: 1rem;
	}

	.empty-state p {
		margin: 0 0 0.45rem;
		font-family: var(--font-display);
		font-size: 2rem;
	}

	@media (max-width: 1100px) {
		.start-strip,
		.feed-grid {
			grid-template-columns: 1fr;
		}

		.section-heading--row {
			flex-direction: column;
			align-items: flex-start;
		}
	}

	@media (max-width: 720px) {
	}

	@media (prefers-reduced-motion: reduce) {
		:global(html) {
			scroll-behavior: auto;
		}
	}
</style>
