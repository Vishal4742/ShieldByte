<script lang="ts">
	import Hero from '$lib/components/home/Hero.svelte';
	import TrainingDeck from '$lib/components/home/TrainingDeck.svelte';
	import ThreatCard from '$lib/components/home/ThreatCard.svelte';
	import type { ThreatArticle } from '$lib/types/threat.js';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
	const categoryLabels: Record<string, string> = {
		UPI_fraud: 'UPI Fraud',
		KYC_fraud: 'KYC Fraud',
		lottery_fraud: 'Lottery Fraud',
		job_scam: 'Job Scam',
		investment_fraud: 'Investment Fraud',
		customer_support_scam: 'Support Scam'
	};

	const categoryBreakdown = $derived.by(
		(): Array<[string, number]> =>
			Array.from(
				data.articles.reduce((counts: Map<string, number>, article: ThreatArticle) => {
					const label = categoryLabels[article.category] ?? article.category;
					counts.set(label, (counts.get(label) ?? 0) + 1);
					return counts;
				}, new Map<string, number>())
			)
	);
</script>

<svelte:head>
	<title>ShieldByte | Live Scam Intelligence</title>
	<meta
		name="description"
		content="ShieldByte transforms live cyber fraud reporting into scam intelligence and training-ready threat signals."
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

	<header class="masthead">
		<div>
			<p class="masthead__label">ShieldByte</p>
			<span class="masthead__meta">Threat intelligence dashboard</span>
		</div>

		<nav>
			<a href="#feed">Threat Feed</a>
			<a href="#mission">Training Console</a>
			<a href="/api/cron/ingest">Ingest API</a>
		</nav>
	</header>

	<main>
		<Hero articles={data.articles} />

		<section class="band">
			<p>Pipeline state</p>
			<div>
				<span>News ingestion active</span>
				<span>AI classification active</span>
				<span>Supabase-backed case archive</span>
			</div>
		</section>

		<section class="overview">
			<article>
				<p class="overview__label">Product direction</p>
				<h2>From fraud reporting to practical scam intelligence.</h2>
				<p>
					The interface borrows its atmosphere from the reference posters in the repo root: editorial
					type, mono metadata, bold contrast, and layered motion. Underneath the styling, the page is
					still wired to the real ShieldByte ingestion and classification pipeline.
				</p>
			</article>

			<div class="overview__grid">
				<div>
					<span>Core categories</span>
					<strong>6</strong>
				</div>
				<div>
					<span>Frontend source</span>
					<strong>Supabase</strong>
				</div>
				<div>
					<span>Primary mode</span>
					<strong>Signal review</strong>
				</div>
			</div>
		</section>

		<section class="content-grid">
			<section class="feed" id="feed">
				<div class="section-heading">
					<p>Recent classified cases</p>
					<h2>Threat feed</h2>
				</div>

				{#if data.articles.length > 0}
					<div class="feed__grid">
						{#each data.articles as article, index}
							<ThreatCard {article} {index} />
						{/each}
					</div>
				{:else}
					<div class="empty-state">
						<p>No classified articles yet.</p>
						<span>
							Run the ingestion and classification cron endpoints to populate the frontend feed.
						</span>
					</div>
				{/if}
			</section>

			<aside class="rail">
				<section class="section-heading rail__stack">
					<p>Category density</p>
					<h2>Current mix</h2>

					{#if categoryBreakdown.length > 0}
						<div class="category-list">
							{#each categoryBreakdown as [label, count]}
								<div>
									<span>{label}</span>
									<strong>{String(count).padStart(2, '0')}</strong>
								</div>
							{/each}
						</div>
					{:else}
						<div class="category-list category-list--empty">
							No category data available yet.
						</div>
					{/if}
				</section>
			</aside>
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
			radial-gradient(circle at top, rgba(242, 171, 90, 0.16), transparent 28%),
			radial-gradient(circle at right, rgba(70, 90, 140, 0.16), transparent 24%),
			#05070b;
		color: #f6f1e8;
		font-family: 'Cormorant Garamond', serif;
	}

	.shell {
		--font-display: 'Cormorant Garamond', serif;
		--font-mono: 'IBM Plex Mono', monospace;
		--surface-strong: #0b0d12;
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
		opacity: 0.18;
		background-image:
			linear-gradient(rgba(255, 255, 255, 0.05) 1px, transparent 1px),
			linear-gradient(90deg, rgba(255, 255, 255, 0.04) 1px, transparent 1px);
		background-size: 48px 48px;
		mask-image: radial-gradient(circle at center, black, transparent 90%);
	}

	.masthead {
		position: sticky;
		top: 0;
		z-index: 20;
		display: flex;
		justify-content: space-between;
		gap: 1rem;
		align-items: center;
		padding: 1rem clamp(1.2rem, 4vw, 3rem);
		backdrop-filter: blur(18px);
		background: rgba(5, 7, 11, 0.72);
		border-bottom: 1px solid rgba(255, 255, 255, 0.06);
	}

	.masthead__label,
	.masthead__meta,
	nav a,
	.band p,
	.band span,
	.overview__label,
	.overview__grid span,
	.section-heading p,
	.category-list span {
		font-family: var(--font-mono);
		font-size: 0.72rem;
		text-transform: uppercase;
		letter-spacing: 0.18em;
		color: var(--text-muted);
	}

	.masthead__meta {
		display: block;
		margin-top: 0.35rem;
	}

	nav {
		display: flex;
		flex-wrap: wrap;
		gap: 1rem;
	}

	nav a {
		color: var(--text-strong);
		text-decoration: none;
	}

	main {
		padding: 0 clamp(1.2rem, 4vw, 3rem) 4rem;
	}

	.band {
		display: flex;
		justify-content: space-between;
		gap: 1rem;
		padding: 1rem 0;
		border-top: 1px solid var(--line-soft);
		border-bottom: 1px solid var(--line-soft);
	}

	.band div {
		display: flex;
		flex-wrap: wrap;
		gap: 1rem;
		justify-content: flex-end;
	}

	.overview,
	.content-grid {
		display: grid;
		grid-template-columns: minmax(0, 1.2fr) minmax(18rem, 0.8fr);
		gap: 2rem;
		margin-top: 2rem;
	}

	.overview h2,
	.section-heading h2 {
		margin: 0.35rem 0 0.8rem;
		font-family: var(--font-display);
		font-size: clamp(2.2rem, 5vw, 3.7rem);
		font-weight: 500;
		line-height: 0.95;
	}

	.overview article p:last-child {
		max-width: 42rem;
		color: var(--text-soft);
		line-height: 1.75;
	}

	.overview__grid {
		display: grid;
		grid-template-columns: repeat(3, minmax(0, 1fr));
		gap: 1rem;
		align-self: end;
	}

	.overview__grid div,
	.category-list div,
	.empty-state,
	.category-list--empty {
		padding: 1rem;
		border: 1px solid var(--line-soft);
		background: rgba(255, 255, 255, 0.03);
	}

	.overview__grid strong,
	.category-list strong {
		display: block;
		margin-top: 0.5rem;
		font-family: var(--font-display);
		font-size: 1.8rem;
		font-weight: 600;
	}

	.feed,
	.rail {
		display: grid;
		gap: 1.2rem;
		align-content: start;
	}

	.feed__grid {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: 1rem;
	}

	.rail__stack {
		display: grid;
		gap: 1rem;
	}

	.category-list {
		display: grid;
		gap: 0.75rem;
	}

	.empty-state {
		color: var(--text-soft);
	}

	.empty-state p {
		margin: 0 0 0.45rem;
		font-family: var(--font-display);
		font-size: 2rem;
	}

	@media (max-width: 1100px) {
		.overview,
		.content-grid {
			grid-template-columns: 1fr;
		}

		.feed__grid,
		.overview__grid {
			grid-template-columns: 1fr;
		}
	}

	@media (max-width: 720px) {
		.masthead,
		.band {
			flex-direction: column;
			align-items: flex-start;
		}

		nav,
		.band div {
			justify-content: flex-start;
		}

		.feed__grid {
			grid-template-columns: 1fr;
		}
	}

	@media (prefers-reduced-motion: reduce) {
		:global(html) {
			scroll-behavior: auto;
		}
	}
</style>
