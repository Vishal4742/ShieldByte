<script lang="ts">
	import { browser } from '$app/environment';
	import { onMount } from 'svelte';
	import type { ThreatArticle } from '$lib/types/threat.js';

	let { articles }: { articles: ThreatArticle[] } = $props();

	const categoryLabels: Record<string, string> = {
		UPI_fraud: 'UPI Fraud',
		KYC_fraud: 'KYC Fraud',
		lottery_fraud: 'Lottery Fraud',
		job_scam: 'Job Scam',
		investment_fraud: 'Investment Fraud',
		customer_support_scam: 'Support Scam'
	};

	const featuredQueue = $derived(articles);
	const missionCount = $derived(articles.length);
	const totalFlags = $derived(articles.reduce((sum, article) => sum + article.redFlags.length, 0));
	const averageConfidence = $derived.by(() => {
		if (articles.length === 0) return 0;
		return Math.round(
			(articles.reduce((sum, article) => sum + (article.confidence ?? 0.72), 0) / articles.length) * 100
		);
	});

	function threatBand(value: number | null): string {
		if (value === null) return 'Tracked';
		if (value >= 0.88) return 'Boss';
		if (value >= 0.72) return 'Live';
		return 'Warm-up';
	}

	let railElement = $state<HTMLDivElement | null>(null);
	let currentIndex = $state(0);

	const currentLabel = $derived.by(() => {
		if (featuredQueue.length === 0) return '00 / 00';
		return `${String(currentIndex + 1).padStart(2, '0')} / ${String(featuredQueue.length).padStart(2, '0')}`;
	});

	function syncCurrentIndex() {
		if (!railElement || featuredQueue.length === 0) return;

		const cards = Array.from(railElement.querySelectorAll<HTMLElement>('.mission-card'));
		if (cards.length === 0) return;

		const railLeft = railElement.getBoundingClientRect().left;
		let bestIndex = 0;
		let bestDistance = Number.POSITIVE_INFINITY;

		cards.forEach((card, index) => {
			const distance = Math.abs(card.getBoundingClientRect().left - railLeft);
			if (distance < bestDistance) {
				bestDistance = distance;
				bestIndex = index;
			}
		});

		currentIndex = bestIndex;
	}

	function scrollToCard(index: number) {
		if (!railElement) return;
		const cards = Array.from(railElement.querySelectorAll<HTMLElement>('.mission-card'));
		const safeIndex = Math.max(0, Math.min(index, cards.length - 1));
		const target = cards[safeIndex];
		if (!target) return;

		target.scrollIntoView({
			behavior: 'smooth',
			inline: 'start',
			block: 'nearest'
		});

		currentIndex = safeIndex;
	}

	function scrollPrevious() {
		scrollToCard(currentIndex - 1);
	}

	function scrollNext() {
		scrollToCard(currentIndex + 1);
	}

	function handleRailScroll() {
		syncCurrentIndex();
	}

	function handleWheelScroll(event: WheelEvent) {
		if (!railElement) return;
		if (Math.abs(event.deltaY) <= Math.abs(event.deltaX)) return;

		const maxScrollLeft = railElement.scrollWidth - railElement.clientWidth;
		const isScrollingForward = event.deltaY > 0;
		const isAtStart = railElement.scrollLeft <= 2;
		const isAtEnd = railElement.scrollLeft >= maxScrollLeft - 2;

		if ((isScrollingForward && isAtEnd) || (!isScrollingForward && isAtStart)) {
			return;
		}

		event.preventDefault();
		railElement.scrollBy({
			left: event.deltaY,
			behavior: 'smooth'
		});
	}

	onMount(() => {
		if (!browser || !railElement) return;

		const resizeObserver = new ResizeObserver(() => {
			syncCurrentIndex();
		});

		resizeObserver.observe(railElement);
		syncCurrentIndex();

		return () => {
			resizeObserver.disconnect();
		};
	});
</script>

<section class="mission-queue" aria-label="Mission queue">
	<div class="mission-queue__header">
		<div class="mission-queue__heading">
			<p class="mission-queue__eyebrow">Mission queue</p>
			<h2>Choose a case and play the judgment round.</h2>
			<p class="mission-queue__intro">
				Each card is a playable case. Scroll sideways, open one dossier, and step into the same slot for the next round.
			</p>
		</div>
		<div class="mission-queue__scoreboard">
			<article>
				<span>Queue size</span>
				<strong>{String(missionCount).padStart(2, '0')}</strong>
			</article>
			<article>
				<span>Signals live</span>
				<strong>{String(totalFlags).padStart(2, '0')}</strong>
			</article>
			<article>
				<span>Board heat</span>
				<strong>{String(averageConfidence).padStart(2, '0')}%</strong>
			</article>
		</div>
	</div>

	{#if featuredQueue.length > 0}
		<div class="mission-queue__toolbar">
			<div class="mission-queue__position">
				<span>Current card</span>
				<strong>{currentLabel}</strong>
			</div>

			<div class="mission-queue__controls">
				<button type="button" class="mission-queue__control" onclick={scrollPrevious} disabled={currentIndex === 0}>
					Prev
				</button>
				<button
					type="button"
					class="mission-queue__control mission-queue__control--primary"
					onclick={scrollNext}
					disabled={currentIndex >= featuredQueue.length - 1}
				>
					Next
				</button>
			</div>
		</div>

		<div
			class="mission-queue__grid"
			role="list"
			bind:this={railElement}
			onscroll={handleRailScroll}
			onwheel={handleWheelScroll}
		>
			{#each featuredQueue as article, index}
				<article class="mission-card" role="listitem">
					<div class="mission-card__top">
						<div>
							<span>Mission {String(index + 1).padStart(2, '0')}</span>
							<strong>{categoryLabels[article.category] ?? article.category}</strong>
						</div>
						<div class="mission-card__threat">
							<span>Threat band</span>
							<strong>{threatBand(article.confidence)}</strong>
						</div>
					</div>

					<h3>{article.title}</h3>
					<p>{article.scenarioSummary}</p>

					<div class="mission-card__stats">
						<div>
							<span>Channel</span>
							<strong>{article.channel}</strong>
						</div>
						<div>
							<span>Signals</span>
							<strong>{String(article.redFlags.length).padStart(2, '0')}</strong>
						</div>
						<div>
							<span>Source</span>
							<strong>{article.source}</strong>
						</div>
					</div>

					<div class="mission-card__flags">
						{#each article.redFlags.slice(0, 3) as flag}
							<span>{flag}</span>
						{/each}
					</div>

					<div class="mission-card__actions">
						<a href={`/play?article=${article.id}&type=${encodeURIComponent(article.category)}`}>
							Deploy mission
						</a>
						<a href={`/articles/${article.id}`} class="mission-card__secondary">Open dossier</a>
					</div>
				</article>
			{/each}
		</div>
	{:else}
		<div class="mission-queue__empty">No active cases are loaded yet.</div>
	{/if}
</section>

<style>
	.mission-queue {
		position: relative;
		margin-top: 1rem;
		padding: 1.35rem;
		border: 1px solid var(--panel-border);
		border-radius: 1.35rem;
		background:
			radial-gradient(circle at top right, rgba(66, 199, 255, 0.08), transparent 22%),
			radial-gradient(circle at bottom left, rgba(87, 255, 214, 0.05), transparent 18%),
			linear-gradient(180deg, rgba(255, 255, 255, 0.04), rgba(255, 255, 255, 0.01)),
			var(--surface-1);
		box-shadow: var(--shadow-hud);
		overflow: hidden;
	}

	.mission-queue__header,
	.mission-queue__scoreboard,
	.mission-queue__toolbar,
	.mission-card__top,
	.mission-card__stats,
	.mission-card__actions {
		display: flex;
		justify-content: space-between;
		gap: 0.9rem;
		align-items: center;
	}

	.mission-queue__eyebrow,
	.mission-queue__scoreboard span,
	.mission-queue__position span,
	.mission-card__top span,
	.mission-card__stats span {
		font-family: var(--font-mono);
		font-size: 0.7rem;
		letter-spacing: 0.16em;
		text-transform: uppercase;
		color: var(--text-muted);
	}

	.mission-queue__header h2 {
		max-width: 18ch;
		margin: 0.35rem 0 0;
		font-family: var(--font-display);
		font-size: clamp(1.9rem, 4vw, 3rem);
		line-height: 0.96;
		font-weight: 700;
		text-transform: uppercase;
	}

	.mission-queue__heading {
		max-width: 38rem;
	}

	.mission-queue__intro {
		max-width: 32rem;
		margin: 0.85rem 0 0;
		color: var(--text-soft);
		line-height: 1.7;
		font-size: 0.98rem;
	}

	.mission-queue__scoreboard {
		display: grid;
		grid-template-columns: repeat(3, minmax(8rem, 1fr));
		gap: 0.65rem;
		align-self: start;
	}

	.mission-queue__scoreboard article {
		min-width: 0;
		padding: 0.7rem 0.8rem 0.8rem;
		border: 1px solid rgba(130, 191, 255, 0.1);
		border-radius: 0.95rem;
		background: rgba(255, 255, 255, 0.025);
	}

	.mission-queue__scoreboard strong {
		display: block;
		margin-top: 0.45rem;
		font-family: var(--font-display);
		font-size: 1.55rem;
		line-height: 1;
	}

	.mission-queue__toolbar {
		margin-top: 1.2rem;
		padding-top: 1rem;
		border-top: 1px solid rgba(130, 191, 255, 0.08);
	}

	.mission-queue__position strong {
		display: block;
		margin-top: 0.35rem;
		font-family: var(--font-display);
		font-size: 1.4rem;
		line-height: 1;
	}

	.mission-queue__controls {
		display: flex;
		gap: 0.65rem;
	}

	.mission-queue__control {
		min-height: 2.8rem;
		padding: 0 1rem;
		border: 1px solid rgba(130, 191, 255, 0.12);
		border-radius: 0.9rem;
		background: rgba(255, 255, 255, 0.03);
		color: var(--text-strong);
		font-family: var(--font-mono);
		font-size: 0.68rem;
		letter-spacing: 0.16em;
		text-transform: uppercase;
		cursor: pointer;
	}

	.mission-queue__control:disabled {
		opacity: 0.42;
		cursor: default;
	}

	.mission-queue__control--primary {
		background: linear-gradient(135deg, var(--accent-cyan), var(--accent-mint));
		color: #091018;
		border-color: transparent;
	}

	.mission-queue__grid {
		display: grid;
		grid-auto-flow: column;
		grid-auto-columns: minmax(22rem, 31rem);
		gap: 1rem;
		margin-top: 1rem;
		overflow-x: auto;
		overflow-y: hidden;
		scroll-snap-type: x mandatory;
		scroll-padding-inline: 0;
		padding-bottom: 0.35rem;
		scrollbar-width: thin;
		overscroll-behavior-x: contain;
		mask-image: linear-gradient(to right, transparent, black 2rem, black calc(100% - 2rem), transparent);
	}

	.mission-card {
		display: grid;
		gap: 1rem;
		align-content: start;
		min-height: 24.5rem;
		padding: 1.15rem;
		border: 1px solid rgba(130, 191, 255, 0.12);
		border-radius: 1.15rem;
		background:
			linear-gradient(145deg, rgba(66, 199, 255, 0.04), rgba(255, 255, 255, 0.01)),
			var(--surface-2);
		box-shadow: var(--shadow-hud);
		scroll-snap-align: start;
	}

	.mission-card__top strong,
	.mission-card__stats strong {
		display: block;
		margin-top: 0.35rem;
		color: var(--text-strong);
	}

	.mission-card__threat {
		text-align: right;
	}

	.mission-card h3 {
		margin: 0;
		font-family: var(--font-display);
		font-size: clamp(1.75rem, 3vw, 2.35rem);
		line-height: 1;
		font-weight: 700;
		text-transform: uppercase;
		display: -webkit-box;
		line-clamp: 5;
		-webkit-line-clamp: 5;
		-webkit-box-orient: vertical;
		overflow: hidden;
	}

	.mission-card p {
		margin: 0;
		color: var(--text-soft);
		line-height: 1.7;
		display: -webkit-box;
		line-clamp: 4;
		-webkit-line-clamp: 4;
		-webkit-box-orient: vertical;
		overflow: hidden;
	}

	.mission-card__stats {
		display: grid;
		grid-template-columns: repeat(3, minmax(0, 1fr));
		align-items: start;
	}

	.mission-card__flags {
		display: flex;
		flex-wrap: wrap;
		gap: 0.6rem;
	}

	.mission-card__flags span {
		padding: 0.4rem 0.68rem;
		border: 1px solid rgba(130, 191, 255, 0.12);
		border-radius: 999px;
		background: rgba(66, 199, 255, 0.08);
		color: var(--text-strong);
		font-size: 0.74rem;
	}

	.mission-card__actions a {
		flex: 1;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		min-height: 3rem;
		text-decoration: none;
		font-family: var(--font-mono);
		font-size: 0.72rem;
		letter-spacing: 0.16em;
		text-transform: uppercase;
		border: 1px solid rgba(130, 191, 255, 0.12);
		border-radius: 0.9rem;
	}

	.mission-card__actions a:first-child {
		border-color: transparent;
		background: linear-gradient(135deg, var(--accent-cyan), var(--accent-mint));
		color: #091018;
	}

	.mission-card__secondary {
		background: rgba(255, 255, 255, 0.03);
		color: var(--text-strong);
	}

	.mission-queue__empty {
		padding: 1.2rem;
		color: var(--text-soft);
	}

	.mission-queue__grid::-webkit-scrollbar {
		height: 0.55rem;
	}

	.mission-queue__grid::-webkit-scrollbar-track {
		background: rgba(255, 255, 255, 0.04);
		border-radius: 999px;
	}

	.mission-queue__grid::-webkit-scrollbar-thumb {
		background: rgba(130, 191, 255, 0.24);
		border-radius: 999px;
	}

	@media (max-width: 1080px) {
		.mission-queue__header,
		.mission-queue__toolbar,
		.mission-queue__scoreboard {
			flex-direction: column;
			align-items: flex-start;
		}

		.mission-queue__scoreboard {
			grid-template-columns: repeat(3, minmax(0, 1fr));
			width: 100%;
		}
	}

	@media (max-width: 720px) {
		.mission-queue {
			padding: 1rem;
			border-radius: 1rem;
		}

		.mission-queue__eyebrow,
		.mission-queue__scoreboard span,
		.mission-queue__position span,
		.mission-card__top span,
		.mission-card__stats span {
			font-size: 0.62rem;
			letter-spacing: 0.14em;
		}

		.mission-queue__header h2 {
			font-size: clamp(1.9rem, 8vw, 2.55rem);
		}

		.mission-queue__intro {
			font-size: 0.92rem;
			line-height: 1.6;
		}

		.mission-queue__scoreboard {
			width: 100%;
			display: grid;
			grid-template-columns: 1fr;
		}

		.mission-queue__toolbar {
			width: 100%;
			align-items: stretch;
		}

		.mission-queue__controls {
			width: 100%;
		}

		.mission-queue__control {
			flex: 1;
		}

		.mission-queue__scoreboard article {
			width: 100%;
		}

		.mission-queue__grid {
			grid-auto-columns: minmax(17.5rem, 88vw);
			gap: 0.8rem;
			mask-image: none;
		}

		.mission-card {
			min-height: 24rem;
			padding: 1rem;
			border-radius: 1rem;
		}

		.mission-card__top,
		.mission-card__actions {
			flex-direction: column;
			align-items: flex-start;
		}

		.mission-card__stats {
			grid-template-columns: 1fr;
			gap: 0.75rem;
		}

		.mission-card__actions a {
			width: 100%;
		}
	}

	@media (max-width: 480px) {
		.mission-card h3 {
			font-size: 1.8rem;
		}

		.mission-card__flags {
			gap: 0.45rem;
		}

		.mission-card__flags span {
			font-size: 0.74rem;
		}
	}
</style>
