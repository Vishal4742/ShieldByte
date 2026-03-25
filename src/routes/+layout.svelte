<script lang="ts">
	import favicon from '$lib/assets/favicon.svg';

	let { children } = $props();
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
	<link rel="preconnect" href="https://fonts.googleapis.com" />
	<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="anonymous" />
	<link
		href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500;600&display=swap"
		rel="stylesheet"
	/>
</svelte:head>

<nav class="global-nav">
	<a href="/" class="global-nav__brand">
		<span class="global-nav__logo">SB</span>
		<span>
			<span class="global-nav__name">ShieldByte</span>
			<span class="global-nav__tag">play to spot scams</span>
		</span>
	</a>

	<div class="global-nav__links">
		<a href="/" class="global-nav__link">Home</a>
		<a href="/play" class="global-nav__link">Play</a>
		<a href="/profile" class="global-nav__link">Profile</a>
	</div>

	<div class="global-nav__status">
		<span class="global-nav__dot"></span>
		<span>live mission board</span>
	</div>
</nav>

{@render children()}

<style>
	:global(html) {
		scroll-behavior: smooth;
	}

	:global(:root) {
		--font-display: 'Cormorant Garamond', serif;
		--font-body: 'Cormorant Garamond', serif;
		--font-mono: 'IBM Plex Mono', monospace;
		--surface-0: #040814;
		--surface-1: rgba(7, 16, 28, 0.86);
		--surface-2: rgba(10, 22, 38, 0.94);
		--surface-3: rgba(18, 31, 51, 0.92);
		--line-soft: rgba(143, 190, 255, 0.16);
		--line-strong: rgba(0, 244, 255, 0.28);
		--panel-border: rgba(104, 164, 255, 0.18);
		--text-strong: rgba(235, 245, 255, 0.96);
		--text-soft: rgba(197, 219, 242, 0.82);
		--text-muted: rgba(160, 185, 214, 0.6);
		--accent-gold: #ffcf5a;
		--accent-mint: #57ffd6;
		--accent-cyan: #42c7ff;
		--accent-lime: #b4ff52;
		--accent-hot: #ff6b6b;
		--accent-soft: #95f3ff;
		--shadow-arcade: 0 24px 80px rgba(0, 0, 0, 0.38);
		--shadow-hud: 0 0 0 1px rgba(84, 157, 255, 0.08), 0 20px 60px rgba(0, 0, 0, 0.35);
	}

	:global(body) {
		margin: 0;
		background:
			radial-gradient(48rem 24rem at 18% 0%, rgba(66, 199, 255, 0.1), transparent 68%),
			radial-gradient(36rem 20rem at 88% 10%, rgba(87, 255, 214, 0.07), transparent 72%),
			radial-gradient(40rem 18rem at 50% 100%, rgba(255, 107, 107, 0.04), transparent 74%),
			linear-gradient(180deg, #081120 0%, #040814 48%, #071528 100%);
		color: var(--text-strong);
		font-family: var(--font-body);
	}

	:global(body)::before {
		content: '';
		position: fixed;
		inset: 0;
		pointer-events: none;
		opacity: 0.14;
		background-image:
			linear-gradient(rgba(114, 184, 255, 0.08) 1px, transparent 1px),
			linear-gradient(90deg, rgba(114, 184, 255, 0.06) 1px, transparent 1px),
			linear-gradient(rgba(255, 255, 255, 0.02) 50%, transparent 50%);
		background-size: 56px 56px, 56px 56px, 100% 4px;
		mask-image: linear-gradient(180deg, rgba(0, 0, 0, 0.8), transparent 94%);
	}

	:global(body)::after {
		content: '';
		position: fixed;
		inset: 0;
		pointer-events: none;
		background:
			radial-gradient(circle at 20% 18%, rgba(255, 255, 255, 0.22) 0 1px, transparent 1px),
			radial-gradient(circle at 72% 32%, rgba(255, 255, 255, 0.15) 0 1px, transparent 1px),
			radial-gradient(circle at 48% 74%, rgba(255, 255, 255, 0.16) 0 1px, transparent 1px),
			radial-gradient(circle at 88% 62%, rgba(255, 255, 255, 0.12) 0 1px, transparent 1px);
		opacity: 0.18;
	}

	.global-nav {
		position: sticky;
		top: 0;
		z-index: 50;
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 0.75rem clamp(1.2rem, 4vw, 3rem);
		backdrop-filter: blur(20px);
		background:
			linear-gradient(180deg, rgba(8, 16, 29, 0.96), rgba(5, 11, 21, 0.82)),
			rgba(4, 6, 11, 0.82);
		border-bottom: 1px solid var(--panel-border);
		box-shadow: var(--shadow-hud);
	}

	.global-nav__brand {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		text-decoration: none;
		color: var(--text-strong);
	}

	.global-nav__logo {
		display: inline-grid;
		place-items: center;
		width: 2.6rem;
		height: 2.6rem;
		clip-path: polygon(18% 0, 82% 0, 100% 20%, 100% 80%, 82% 100%, 18% 100%, 0 80%, 0 20%);
		font-size: 0.72rem;
		font-family: var(--font-mono);
		font-weight: 700;
		letter-spacing: 0.12em;
		color: #041019;
		background: linear-gradient(135deg, var(--accent-cyan), var(--accent-mint));
		line-height: 1;
		box-shadow: 0 0 28px rgba(66, 199, 255, 0.28);
	}

	.global-nav__name {
		display: block;
		font-family: var(--font-display);
		font-size: 0.98rem;
		font-weight: 700;
		letter-spacing: 0.1em;
		text-transform: uppercase;
		color: rgba(236, 246, 255, 0.94);
	}

	.global-nav__tag {
		display: block;
		margin-top: 0.2rem;
		font-family: var(--font-mono);
		font-size: 0.62rem;
		letter-spacing: 0.22em;
		text-transform: uppercase;
		color: var(--text-muted);
	}

	.global-nav__links {
		display: flex;
		gap: 0.35rem;
	}

	.global-nav__link {
		font-family: var(--font-mono);
		font-size: 0.7rem;
		font-weight: 500;
		letter-spacing: 0.14em;
		text-transform: uppercase;
		text-decoration: none;
		color: rgba(236, 230, 219, 0.72);
		padding: 0.6rem 0.9rem;
		border-radius: 0.85rem;
		border: 1px solid rgba(84, 157, 255, 0.14);
		background: linear-gradient(180deg, rgba(255, 255, 255, 0.04), rgba(255, 255, 255, 0.02));
		transition:
			transform 0.2s ease,
			border-color 0.2s ease,
			background-color 0.2s ease,
			color 0.2s ease;
	}

	.global-nav__link:hover {
		transform: translateY(-1px);
		color: var(--text-strong);
		border-color: rgba(87, 255, 214, 0.36);
		background: rgba(87, 255, 214, 0.08);
	}

	.global-nav__status {
		display: inline-flex;
		align-items: center;
		gap: 0.55rem;
		padding: 0.55rem 0.75rem;
		border: 1px solid rgba(87, 255, 214, 0.18);
		border-radius: 0.85rem;
		background: linear-gradient(180deg, rgba(87, 255, 214, 0.08), rgba(66, 199, 255, 0.05));
		font-family: var(--font-mono);
		font-size: 0.64rem;
		letter-spacing: 0.14em;
		text-transform: uppercase;
		color: var(--text-soft);
	}

	.global-nav__dot {
		width: 0.5rem;
		height: 0.5rem;
		border-radius: 999px;
		background: var(--accent-mint);
		box-shadow: 0 0 12px rgba(87, 255, 214, 0.8);
	}

	@media (max-width: 760px) {
		.global-nav {
			flex-direction: column;
			gap: 0.8rem;
			align-items: stretch;
			padding: 0.9rem 1rem;
		}

		.global-nav__brand {
			width: 100%;
		}

		.global-nav__links {
			display: grid;
			grid-template-columns: repeat(3, minmax(0, 1fr));
			width: 100%;
			gap: 0.45rem;
		}

		.global-nav__link {
			justify-content: center;
			padding: 0.8rem 0.7rem;
		}

		.global-nav__status {
			align-self: stretch;
			justify-content: center;
		}
	}

	@media (max-width: 480px) {
		.global-nav__name {
			font-size: 0.88rem;
		}

		.global-nav__tag,
		.global-nav__status,
		.global-nav__link {
			font-size: 0.58rem;
		}

		.global-nav__links {
			grid-template-columns: repeat(3, minmax(0, 1fr));
		}
	}
</style>
