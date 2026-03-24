<script lang="ts">
	import Hero from '$lib/components/home/Hero.svelte';
	import TrainingDeck from '$lib/components/home/TrainingDeck.svelte';
	import ThreatCard from '$lib/components/home/ThreatCard.svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
</script>

<svelte:head>
	<title>ShieldByte | Threat Training Console</title>
	<meta
		name="description"
		content="ShieldByte helps people review scam cases and practice spotting fraud signals through a simple training console."
	/>
	<link rel="preconnect" href="https://fonts.googleapis.com" />
	<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="anonymous" />
	<link
		href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500;600&display=swap"
		rel="stylesheet"
	/>
</svelte:head>

<div class="shell">
	<div class="shell__grain"></div>
	<div class="shell__glow shell__glow--left"></div>
	<div class="shell__glow shell__glow--right"></div>

	<!-- Nav is now in +layout.svelte -->

	<main>
		<Hero articles={data.articles} />

		<section class="start-strip">
			<article>
				<span>Step 1</span>
				<p>Pick a case from the feed.</p>
			</article>
			<article>
				<span>Step 2</span>
				<p>Read the fraud clues.</p>
			</article>
			<article>
				<span>Step 3</span>
				<p>Practice in the mission board.</p>
			</article>
		</section>

		<section class="feed-panel" id="feed">
			<div class="section-heading section-heading--row">
				<div>
					<p>Recent cases</p>
					<h2>Threat feed</h2>
				</div>
				<span class="feed-panel__hint">Start with any case below.</span>
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
	:global(html) {
		scroll-behavior: smooth;
	}

	:global(body) {
		margin: 0;
		background:
			radial-gradient(circle at top left, rgba(242, 171, 90, 0.13), transparent 22%),
			radial-gradient(circle at 80% 12%, rgba(126, 170, 255, 0.09), transparent 18%),
			#04060b;
		color: #f6f1e8;
		font-family: 'Cormorant Garamond', serif;
	}

	.shell {
		--font-display: 'Cormorant Garamond', serif;
		--font-mono: 'IBM Plex Mono', monospace;
		--surface-strong: #090d14;
		--line-soft: rgba(255, 255, 255, 0.12);
		--line-strong: rgba(255, 255, 255, 0.22);
		--text-strong: rgba(250, 247, 241, 0.96);
		--text-soft: rgba(235, 226, 212, 0.78);
		--text-muted: rgba(235, 226, 212, 0.5);
		--accent: #f2ab5a;
		--accent-soft: #ffd79b;
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
			linear-gradient(180deg, rgba(255, 255, 255, 0.04), rgba(255, 255, 255, 0.01)),
			rgba(8, 11, 18, 0.82);
	}

	.start-strip {
		display: grid;
		grid-template-columns: repeat(3, minmax(0, 1fr));
		gap: 0.9rem;
		margin-top: 0.8rem;
	}

	.start-strip article {
		padding: 1rem;
		border: 1px solid rgba(255, 255, 255, 0.08);
		background: rgba(255, 255, 255, 0.03);
	}

	.start-strip p {
		margin: 0.55rem 0 0;
		color: var(--text-strong);
		line-height: 1.6;
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
