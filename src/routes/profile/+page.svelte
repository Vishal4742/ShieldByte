<script lang="ts">
	import { browser } from '$app/environment';
	import { goto } from '$app/navigation';
	import type { PageData } from './$types.js';

	let { data }: { data: PageData } = $props();
	let profile = $derived(data.profile);
	let userId = $derived(data.userId);

	// Badge emoji mapping
	const badgeEmoji: Record<string, string> = {
		speed_demon: '⚡',
		sharpshooter: '🎯',
		upi_guardian: '🛡️',
		kyc_defender: '🔒',
		viral_protector: '📢',
		week_warrior: '🔥',
		perfect_week: '💎',
		mentor: '🎓',
		fraud_hunter: '🏆'
	};

	// Rank colors
	const rankColors: Record<string, string> = {
		'Rookie': '#94a3b8',
		'Alert Analyst': '#60a5fa',
		'Threat Specialist': '#a78bfa',
		'Cyber Commander': '#f59e0b',
		'Shield Master': '#7df2c9'
	};

	// If no userId, try to load from localStorage
	$effect(() => {
		if (browser && !userId) {
			const storedId = localStorage.getItem('shieldbyte:player-id');
			if (storedId) {
				goto(`/profile?user_id=${encodeURIComponent(storedId)}`, { replaceState: true });
			}
		}
	});

	function formatDate(dateStr: string | null): string {
		if (!dateStr) return 'N/A';
		return new Date(dateStr).toLocaleDateString('en-IN', {
			year: 'numeric',
			month: 'short',
			day: 'numeric'
		});
	}

	function outcomeLabel(outcome: string): string {
		if (outcome === 'success') return 'Cleared';
		if (outcome === 'failed') return 'Breached';
		return 'Timed Out';
	}

	function outcomeClass(outcome: string): string {
		if (outcome === 'success') return 'outcome--success';
		if (outcome === 'failed') return 'outcome--failed';
		return 'outcome--timeout';
	}
</script>

<svelte:head>
	<title>ShieldByte | Agent Profile</title>
</svelte:head>

<div class="profile-shell">
	<div class="profile-shell__grain"></div>

	<main class="profile-main">
		<!-- ─── Hero Stats Section ─── -->
		<section class="hero-stats">
			<div class="hero-stats__rank-card">
				<p class="mono-label">Current Rank</p>
				<h1 class="hero-stats__rank" style="color: {rankColors[profile.stats.rank] ?? '#7df2c9'}">
					{profile.stats.rank}
				</h1>
				<div class="hero-stats__xp-bar">
					<div class="hero-stats__xp-fill" style="width: {Math.min((profile.stats.total_xp % 2000) / 20, 100)}%"></div>
				</div>
				<p class="hero-stats__xp-label">{profile.stats.total_xp} XP total</p>
			</div>

			<div class="stats-grid">
				<article class="stat-card">
					<span class="mono-label">Missions</span>
					<strong>{profile.stats.missions_completed ?? 0}</strong>
					<p>completed</p>
				</article>
				<article class="stat-card">
					<span class="mono-label">Streak</span>
					<strong>{profile.stats.streak_days ?? 0}</strong>
					<p>day{(profile.stats.streak_days ?? 0) === 1 ? '' : 's'}</p>
				</article>
				<article class="stat-card stat-card--accent">
					<span class="mono-label">Badges</span>
					<strong>{profile.badges.filter((b: { earned: boolean }) => b.earned).length}/{profile.badges.length}</strong>
					<p>earned</p>
				</article>
				<article class="stat-card">
					<span class="mono-label">Last active</span>
					<strong class="stat-card__date">{formatDate(profile.stats.last_mission_date)}</strong>
					<p>last mission</p>
				</article>
			</div>
		</section>

		<!-- ─── Badges Gallery ─── -->
		<section class="badges-section">
			<div class="section-header">
				<p class="mono-label">Achievement vault</p>
				<h2>Badges</h2>
			</div>

			<div class="badges-gallery">
				{#each profile.badges as badge}
					<article class="badge-tile" class:badge-tile--earned={badge.earned} class:badge-tile--locked={!badge.earned}>
						<div class="badge-tile__icon">
							{badgeEmoji[badge.id] ?? '🏅'}
						</div>
						<div class="badge-tile__info">
							<h3>{badge.name}</h3>
							<p>{badge.description}</p>
							{#if badge.earned && badge.earnedAt}
								<span class="badge-tile__date">Earned {formatDate(badge.earnedAt)}</span>
							{:else}
								<span class="badge-tile__locked-label">Locked</span>
							{/if}
						</div>
					</article>
				{/each}
			</div>
		</section>

		<!-- ─── Mission History ─── -->
		<section class="history-section">
			<div class="section-header">
				<p class="mono-label">Mission log</p>
				<h2>Recent Attempts</h2>
			</div>

			{#if profile.recentAttempts.length === 0}
				<div class="empty-state">
					<p>No missions attempted yet.</p>
					<a href="/play" class="cta-button">Start your first mission →</a>
				</div>
			{:else}
				<div class="history-table">
					<div class="history-table__header">
						<span>Mission</span>
						<span>Outcome</span>
						<span>XP</span>
						<span>Clues</span>
						<span>Time</span>
						<span>Date</span>
					</div>
					{#each profile.recentAttempts as attempt, i}
						<div class="history-row" style="animation-delay: {i * 40}ms">
							<span class="history-row__mission">#{attempt.mission_id}</span>
							<span class="history-row__outcome {outcomeClass(attempt.outcome)}">
								{outcomeLabel(attempt.outcome)}
							</span>
							<span class="history-row__xp">+{attempt.xp_earned}</span>
							<span>{attempt.clues_found}/{attempt.clues_found + attempt.clues_missed}</span>
							<span>{attempt.time_taken}s</span>
							<span class="history-row__date">{formatDate(attempt.completed_at)}</span>
						</div>
					{/each}
				</div>
			{/if}
		</section>

		<!-- ─── Quick Links ─── -->
		<section class="quick-links">
			<a href="/play" class="cta-button">Play a Mission</a>
			<a href="/profile/referrals" class="cta-button cta-button--ghost">View Referrals</a>
		</section>
	</main>
</div>

<style>
	.profile-shell {
		--font-display: 'Cormorant Garamond', serif;
		--font-mono: 'IBM Plex Mono', monospace;
		--bg: #04060b;
		--panel: rgba(8, 15, 24, 0.88);
		--panel-strong: rgba(11, 20, 32, 0.94);
		--line: rgba(138, 190, 214, 0.14);
		--text: #f2eee7;
		--muted: rgba(236, 230, 219, 0.55);
		--mint: #7df2c9;
		--amber: #f5c46c;
		position: relative;
		min-height: 100vh;
		color: var(--text);
	}

	.profile-shell__grain {
		position: fixed;
		inset: 0;
		pointer-events: none;
		opacity: 0.1;
		background-image:
			linear-gradient(rgba(255, 255, 255, 0.04) 1px, transparent 1px),
			linear-gradient(90deg, rgba(255, 255, 255, 0.03) 1px, transparent 1px);
		background-size: 52px 52px;
		mask-image: radial-gradient(circle at center, black, transparent 88%);
	}

	.profile-main {
		max-width: 960px;
		margin: 0 auto;
		padding: 2rem clamp(1rem, 4vw, 3rem) 4rem;
		display: grid;
		gap: 2rem;
	}

	.mono-label {
		font-family: var(--font-mono);
		font-size: 0.68rem;
		letter-spacing: 0.18em;
		text-transform: uppercase;
		color: var(--muted);
		margin: 0;
	}

	.section-header {
		margin-bottom: 1rem;
	}

	.section-header h2 {
		font-family: var(--font-display);
		font-size: clamp(2rem, 4vw, 3rem);
		font-weight: 500;
		line-height: 0.95;
		margin: 0.3rem 0 0;
	}

	/* ─── Hero Stats ─── */
	.hero-stats {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 1.5rem;
	}

	.hero-stats__rank-card {
		padding: 2rem;
		border: 1px solid var(--line);
		background:
			radial-gradient(circle at top left, rgba(125, 242, 201, 0.1), transparent 40%),
			var(--panel);
		display: flex;
		flex-direction: column;
		justify-content: center;
	}

	.hero-stats__rank {
		font-family: var(--font-display);
		font-size: clamp(2.5rem, 5vw, 4rem);
		font-weight: 600;
		line-height: 1;
		margin: 0.5rem 0;
	}

	.hero-stats__xp-bar {
		width: 100%;
		height: 6px;
		background: rgba(255, 255, 255, 0.06);
		border-radius: 3px;
		margin-top: 1rem;
		overflow: hidden;
	}

	.hero-stats__xp-fill {
		height: 100%;
		background: linear-gradient(90deg, var(--mint), var(--amber));
		border-radius: 3px;
		transition: width 0.6s ease;
	}

	.hero-stats__xp-label {
		font-family: var(--font-mono);
		font-size: 0.72rem;
		color: var(--muted);
		margin: 0.5rem 0 0;
	}

	.stats-grid {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 0.8rem;
	}

	.stat-card {
		padding: 1.2rem;
		border: 1px solid var(--line);
		background: var(--panel);
		text-align: center;
	}

	.stat-card strong {
		display: block;
		font-family: var(--font-display);
		font-size: 2.2rem;
		font-weight: 600;
		margin: 0.4rem 0 0.2rem;
		color: var(--text);
	}

	.stat-card__date {
		font-size: 1.1rem !important;
	}

	.stat-card p {
		margin: 0;
		color: var(--muted);
		font-size: 0.85rem;
	}

	.stat-card--accent {
		background:
			radial-gradient(circle at bottom right, rgba(125, 242, 201, 0.12), transparent 50%),
			var(--panel);
		border-color: rgba(125, 242, 201, 0.25);
	}

	.stat-card--accent strong {
		color: var(--mint);
	}

	/* ─── Badges Gallery ─── */
	.badges-gallery {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
		gap: 0.8rem;
	}

	.badge-tile {
		display: flex;
		align-items: center;
		gap: 1rem;
		padding: 1rem 1.2rem;
		border: 1px solid var(--line);
		background: var(--panel);
		transition: all 0.25s ease;
	}

	.badge-tile--earned {
		border-color: rgba(125, 242, 201, 0.3);
		background:
			radial-gradient(circle at left, rgba(125, 242, 201, 0.08), transparent 60%),
			var(--panel);
	}

	.badge-tile--locked {
		opacity: 0.5;
	}

	.badge-tile--locked:hover {
		opacity: 0.7;
	}

	.badge-tile__icon {
		font-size: 2rem;
		flex-shrink: 0;
		width: 3rem;
		height: 3rem;
		display: flex;
		align-items: center;
		justify-content: center;
		border-radius: 10px;
		background: rgba(255, 255, 255, 0.04);
	}

	.badge-tile--earned .badge-tile__icon {
		background: rgba(125, 242, 201, 0.12);
	}

	.badge-tile__info h3 {
		margin: 0;
		font-family: var(--font-display);
		font-size: 1.15rem;
		font-weight: 600;
	}

	.badge-tile__info p {
		margin: 0.2rem 0 0;
		font-size: 0.78rem;
		color: var(--muted);
		line-height: 1.4;
	}

	.badge-tile__date {
		font-family: var(--font-mono);
		font-size: 0.62rem;
		letter-spacing: 0.12em;
		color: var(--mint);
		text-transform: uppercase;
	}

	.badge-tile__locked-label {
		font-family: var(--font-mono);
		font-size: 0.62rem;
		letter-spacing: 0.12em;
		text-transform: uppercase;
		color: var(--muted);
	}

	/* ─── Mission History ─── */
	.history-table {
		border: 1px solid var(--line);
		background: var(--panel);
		overflow-x: auto;
	}

	.history-table__header,
	.history-row {
		display: grid;
		grid-template-columns: 80px 100px 70px 70px 60px 1fr;
		gap: 1rem;
		padding: 0.8rem 1.2rem;
		align-items: center;
	}

	.history-table__header {
		font-family: var(--font-mono);
		font-size: 0.65rem;
		letter-spacing: 0.14em;
		text-transform: uppercase;
		color: var(--muted);
		border-bottom: 1px solid var(--line);
	}

	.history-row {
		font-size: 0.88rem;
		border-bottom: 1px solid rgba(255, 255, 255, 0.03);
		animation: fadeSlideIn 0.3s ease forwards;
		opacity: 0;
	}

	@keyframes fadeSlideIn {
		from {
			opacity: 0;
			transform: translateY(4px);
		}
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}

	.history-row__mission {
		font-family: var(--font-mono);
		font-weight: 600;
		color: var(--text);
	}

	.history-row__outcome {
		font-family: var(--font-mono);
		font-size: 0.72rem;
		font-weight: 600;
		letter-spacing: 0.1em;
		text-transform: uppercase;
	}

	.outcome--success { color: var(--mint); }
	.outcome--failed { color: #ff6f61; }
	.outcome--timeout { color: var(--amber); }

	.history-row__xp {
		color: var(--mint);
		font-weight: 600;
	}

	.history-row__date {
		font-size: 0.75rem;
		color: var(--muted);
	}

	/* ─── Quick Links ─── */
	.quick-links {
		display: flex;
		gap: 1rem;
		justify-content: center;
		padding: 1rem 0;
	}

	.cta-button {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		min-height: 3rem;
		padding: 0 1.6rem;
		font-family: var(--font-mono);
		font-size: 0.72rem;
		font-weight: 600;
		letter-spacing: 0.14em;
		text-transform: uppercase;
		text-decoration: none;
		cursor: pointer;
		border: none;
		background: var(--mint);
		color: #052018;
		transition: all 0.2s ease;
	}

	.cta-button:hover {
		filter: brightness(1.12);
		transform: translateY(-1px);
	}

	.cta-button--ghost {
		background: transparent;
		border: 1px solid var(--line);
		color: var(--text);
	}

	.cta-button--ghost:hover {
		border-color: var(--mint);
		color: var(--mint);
	}

	.empty-state {
		text-align: center;
		padding: 3rem 1rem;
		border: 1px solid var(--line);
		background: var(--panel);
	}

	.empty-state p {
		font-family: var(--font-display);
		font-size: 1.5rem;
		margin: 0 0 1rem;
		color: var(--muted);
	}

	@media (max-width: 720px) {
		.hero-stats {
			grid-template-columns: 1fr;
		}

		.stats-grid {
			grid-template-columns: 1fr 1fr;
		}

		.badges-gallery {
			grid-template-columns: 1fr;
		}

		.history-table__header,
		.history-row {
			grid-template-columns: 60px 80px 50px 50px 50px 1fr;
			gap: 0.5rem;
			font-size: 0.76rem;
		}

		.quick-links {
			flex-direction: column;
			align-items: stretch;
		}
	}
</style>
