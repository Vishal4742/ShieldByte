<script lang="ts">
	import favicon from '$lib/assets/favicon.svg';

	let { children } = $props();
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
	<link rel="preconnect" href="https://fonts.googleapis.com" />
	<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="anonymous" />
	<link
		href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;1,300;1,400;0,500;0,600&family=JetBrains+Mono:wght@100;300;400&display=swap"
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
		--font-mono: 'JetBrains Mono', monospace;
		--surface-0: #000000;
		--surface-1: rgba(246, 240, 231, 0.62);
		--surface-2: rgba(244, 237, 227, 0.74);
		--surface-3: rgba(241, 232, 220, 0.82);
		--line-soft: rgba(22, 38, 50, 0.12);
		--line-strong: rgba(22, 38, 50, 0.28);
		--panel-border: rgba(22, 38, 50, 0.14);
		--text-strong: #14222d;
		--text-soft: rgba(20, 34, 45, 0.82);
		--text-muted: rgba(20, 34, 45, 0.62);
		--text-inverse-strong: rgba(255, 255, 255, 0.92);
		--text-inverse-soft: rgba(255, 255, 255, 0.68);
		--text-inverse-muted: rgba(255, 255, 255, 0.46);
		--accent-gold: #eda167;
		--accent-mint: rgba(255, 255, 255, 0.9);
		--accent-cyan: rgba(255, 255, 255, 0.9);
		--accent-lime: #eda167;
		--accent-hot: #eda167;
		--accent-soft: rgba(255, 255, 255, 0.9);
		--shadow-arcade: none;
		--shadow-hud: none;
	}

	:global(html),
	:global(body) {
		width: 100%;
		min-height: 100%;
		margin: 0;
		background:
			linear-gradient(
				180deg,
				#f0a56e 0%,
				#eda167 24%,
				#e58c56 52%,
				#d46128 78%,
				#b8431d 100%
			);
		color: var(--text-strong);
		font-family: var(--font-body);
		overflow-x: hidden;
		-webkit-font-smoothing: antialiased;
		-moz-osx-font-smoothing: grayscale;
	}

	:global(body)::after {
		content: '';
		position: fixed;
		inset: 0;
		pointer-events: none;
		z-index: 0;
		background:
			radial-gradient(circle at 24% 18%, rgba(255, 255, 255, 0.08) 0 1px, transparent 1px),
			radial-gradient(circle at 68% 28%, rgba(255, 255, 255, 0.06) 0 1px, transparent 1px),
			radial-gradient(circle at 46% 74%, rgba(255, 255, 255, 0.08) 0 1px, transparent 1px),
			radial-gradient(circle at 82% 64%, rgba(255, 255, 255, 0.05) 0 1px, transparent 1px),
			linear-gradient(rgba(255, 255, 255, 0.035), rgba(0, 0, 0, 0.035));
		opacity: 0.28;
	}

	.global-nav {
		position: sticky;
		top: 0;
		z-index: 10;
		display: flex;
		justify-content: space-between;
		align-items: flex-start;
		padding: 1.5rem clamp(1.2rem, 4vw, 3rem) 0;
		background: transparent;
		border-bottom: none;
		box-shadow: none;
	}

	.global-nav__brand {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		text-decoration: none;
		color: var(--text-inverse-strong);
	}

	.global-nav__logo {
		display: inline-grid;
		place-items: center;
		width: 2.6rem;
		height: 2.6rem;
		clip-path: polygon(18% 0, 82% 0, 100% 20%, 100% 80%, 82% 100%, 18% 100%, 0 80%, 0 20%);
		font-size: 0.62rem;
		font-family: var(--font-mono);
		font-weight: 300;
		letter-spacing: 0.12em;
		color: var(--text-inverse-strong);
		background: transparent;
		border: 1px solid var(--panel-border);
		line-height: 1;
		box-shadow: none;
	}

	.global-nav__name {
		display: block;
		font-family: var(--font-display);
		font-size: 0.92rem;
		font-weight: 400;
		letter-spacing: 0.1em;
		text-transform: lowercase;
		color: var(--text-inverse-strong);
	}

	.global-nav__tag {
		display: block;
		margin-top: 0.2rem;
		font-family: var(--font-mono);
		font-size: 0.58rem;
		letter-spacing: 0.14em;
		text-transform: uppercase;
		color: var(--text-inverse-soft);
	}

	.global-nav__links {
		display: flex;
		gap: 2rem;
		margin-top: 0.55rem;
	}

	.global-nav__link {
		font-family: var(--font-mono);
		font-size: 0.62rem;
		font-weight: 300;
		letter-spacing: 0.1em;
		text-transform: uppercase;
		text-decoration: none;
		color: var(--text-inverse-strong);
		padding: 0 0 0.25rem;
		border-radius: 0;
		border: none;
		background: transparent;
		position: relative;
		transition:
			transform 0.2s ease,
			color 0.2s ease;
	}

	.global-nav__link::after {
		content: '';
		position: absolute;
		left: 0;
		bottom: 0;
		width: 0;
		height: 1px;
		background: var(--text-inverse-strong);
		transition: width 0.35s ease;
	}

	.global-nav__link:hover {
		transform: none;
		color: var(--text-inverse-strong);
	}

	.global-nav__link:hover::after {
		width: 100%;
	}

	.global-nav__status {
		display: inline-flex;
		align-items: center;
		gap: 0.55rem;
		padding: 0;
		border: none;
		border-radius: 0;
		background: transparent;
		font-family: var(--font-mono);
		font-size: 0.58rem;
		letter-spacing: 0.1em;
		text-transform: uppercase;
		color: var(--text-inverse-soft);
	}

	.global-nav__dot {
		width: 0.25rem;
		height: 0.25rem;
		border-radius: 999px;
		background: var(--accent-hot);
		box-shadow: 0 0 10px rgba(237, 161, 103, 0.5);
	}

	@media (max-width: 760px) {
		.global-nav {
			flex-direction: column;
			gap: 0.8rem;
			align-items: stretch;
			padding: 1rem 1rem 0;
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
			padding: 0 0 0.35rem;
		}

		.global-nav__status {
			align-self: stretch;
			justify-content: flex-start;
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
