<script lang="ts">
	import { page } from '$app/stores';
</script>

<svelte:head>
	<title>{$page.status} | ShieldByte</title>
</svelte:head>

<div class="error-shell">
	<div class="error-content">
		<p class="mono-label">Error {$page.status}</p>
		<h1>{$page.error?.message ?? 'Page Not Found'}</h1>
		<p class="error-copy">
			The case file you're looking for doesn't exist, has been redacted, or you lack the clearance to
			view it.
		</p>
		<a href="/" class="cta-button">Return to HQ</a>
	</div>
</div>

<style>
	.error-shell {
		display: flex;
		align-items: center;
		justify-content: center;
		min-height: calc(100vh - 100px);
		padding: 2rem;
		text-align: center;
	}

	.error-content {
		max-width: 400px;
		padding: 3rem 2rem;
		border: 1px solid rgba(10, 10, 10, 0.1);
		border-radius: 1.25rem;
		background:
			radial-gradient(circle at top right, rgba(230, 57, 70, 0.06), transparent 24%),
			linear-gradient(180deg, rgba(255, 255, 255, 0.28), rgba(255, 255, 255, 0.12)),
			var(--surface-1);
		box-shadow: var(--shadow-hud);
	}

	.mono-label {
		display: block;
		margin-bottom: 0.5rem;
		font-family: var(--font-mono);
		font-size: 0.75rem;
		letter-spacing: 0.2em;
		text-transform: uppercase;
		color: var(--accent-hot);
		font-weight: 600;
	}

	.error-content h1 {
		margin: 0;
		font-family: var(--font-display);
		font-size: clamp(2.5rem, 5vw, 3.5rem);
		line-height: 1.1;
	}

	.error-copy {
		margin: 1rem 0 2rem;
		color: var(--text-soft);
		line-height: 1.6;
	}

	.cta-button {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		min-height: 3rem;
		padding: 0 1.5rem;
		border-radius: 999px;
		background: linear-gradient(135deg, var(--accent-cyan), var(--accent-hot));
		color: #f4f4f2;
		font-family: var(--font-mono);
		font-size: 0.75rem;
		font-weight: 600;
		letter-spacing: 0.15em;
		text-transform: uppercase;
		text-decoration: none;
		border: none;
		cursor: pointer;
	}
</style>
