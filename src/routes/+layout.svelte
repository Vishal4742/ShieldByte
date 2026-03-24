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
		<span class="global-nav__logo">◈</span>
		<span class="global-nav__name">ShieldByte</span>
	</a>

	<div class="global-nav__links">
		<a href="/" class="global-nav__link">Home</a>
		<a href="/play" class="global-nav__link">Play</a>
		<a href="/profile" class="global-nav__link">Profile</a>
		<a href="/profile/referrals" class="global-nav__link">Referrals</a>
	</div>
</nav>

{@render children()}

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

	.global-nav {
		position: sticky;
		top: 0;
		z-index: 50;
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 0.75rem clamp(1.2rem, 4vw, 3rem);
		backdrop-filter: blur(20px);
		background: rgba(4, 6, 11, 0.82);
		border-bottom: 1px solid rgba(255, 255, 255, 0.06);
	}

	.global-nav__brand {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		text-decoration: none;
		color: #f6f1e8;
	}

	.global-nav__logo {
		font-size: 1.6rem;
		color: #7df2c9;
		line-height: 1;
	}

	.global-nav__name {
		font-family: 'IBM Plex Mono', monospace;
		font-size: 0.78rem;
		font-weight: 600;
		letter-spacing: 0.18em;
		text-transform: uppercase;
		color: rgba(246, 241, 232, 0.9);
	}

	.global-nav__links {
		display: flex;
		gap: 0.2rem;
	}

	.global-nav__link {
		font-family: 'IBM Plex Mono', monospace;
		font-size: 0.7rem;
		font-weight: 500;
		letter-spacing: 0.14em;
		text-transform: uppercase;
		text-decoration: none;
		color: rgba(236, 230, 219, 0.55);
		padding: 0.5rem 0.8rem;
		border-radius: 6px;
		transition: all 0.2s ease;
	}

	.global-nav__link:hover {
		color: #7df2c9;
		background: rgba(125, 242, 201, 0.08);
	}

	@media (max-width: 600px) {
		.global-nav {
			flex-direction: column;
			gap: 0.5rem;
			align-items: flex-start;
		}

		.global-nav__links {
			flex-wrap: wrap;
		}
	}
</style>
