<script lang="ts">
	import Hero from '$lib/components/home/Hero.svelte';
	import SwipeDeck from '$lib/components/home/SwipeDeck.svelte';
	import ThreatCard from '$lib/components/home/ThreatCard.svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
</script>

<svelte:head>
	<title>ShieldByte | Scam Defense Arcade</title>
	<meta
		name="description"
		content="ShieldByte turns real scam cases into short game rounds where users decide scam or not and learn the warning signs."
	/>
</svelte:head>

<div class="shell">
	<div class="shell__grain"></div>
	<div class="shell__stars"></div>

	<main>
		<Hero articles={data.articles} />

		<section id="queue">
			<SwipeDeck articles={data.articles} />
		</section>

		<section class="feed-panel" id="feed">
			<div class="section-heading section-heading--row">
				<div>
					<p>Case archive</p>
					<h2>Study real scam patterns</h2>
				</div>
				<span class="feed-panel__hint">Open any dossier to see the source case, the warning signs, and the mission generated from it.</span>
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
	</main>
</div>

<style>
	.shell {
		position: relative;
		min-height: 100vh;
		overflow: clip;
	}

	.shell__grain {
		display: none;
	}

	.shell__stars {
		display: none;
	}

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

	.feed-panel,
	.empty-state {
		padding: 1.25rem;
		border: 1px solid var(--panel-border);
		border-radius: 1.35rem;
		background:
			radial-gradient(circle at top right, rgba(255, 255, 255, 0.16), transparent 24%),
			linear-gradient(180deg, rgba(255, 255, 255, 0.18), rgba(255, 255, 255, 0.08)),
			var(--surface-1);
		box-shadow: 0 18px 42px rgba(0, 0, 0, 0.18);
	}

	.feed-panel {
		margin-top: 1.25rem;
	}

	.section-heading h2 {
		margin: 0.35rem 0 0;
		font-family: var(--font-display);
		font-size: clamp(1.35rem, 2.6vw, 2rem);
		font-weight: 700;
		line-height: 1.05;
		text-transform: none;
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
		.feed-grid {
			grid-template-columns: 1fr;
		}

		.section-heading--row {
			flex-direction: column;
			align-items: flex-start;
		}
	}

	@media (max-width: 720px) {
		main {
			padding: 0 0.85rem 3rem;
		}

		.feed-panel,
		.empty-state {
			padding: 1rem;
			border-radius: 1rem;
		}

		.section-heading p,
		.feed-panel__hint,
		.empty-state span {
			font-size: 0.62rem;
			letter-spacing: 0.14em;
		}

		.section-heading h2 {
			font-size: clamp(1.15rem, 5.5vw, 1.45rem);
		}

		.feed-panel__hint {
			max-width: none;
		}
	}

	@media (max-width: 480px) {
		.empty-state p {
			font-size: 1.6rem;
		}
	}

	@media (prefers-reduced-motion: reduce) {
		:global(html) {
			scroll-behavior: auto;
		}
	}
</style>
