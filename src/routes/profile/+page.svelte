<script lang="ts">
	import { browser } from '$app/environment';
	import { goto } from '$app/navigation';
	import type { PageData } from './$types.js';

	let { data }: { data: PageData } = $props();
	let profile = $derived(data.profile);
	let userId = $derived(data.userId);

	const badgeEmoji: Record<string, string> = {
		speed_demon: '[SPD]',
		sharpshooter: '[AIM]',
		upi_guardian: '[UPI]',
		kyc_defender: '[KYC]',
		viral_protector: '[SOC]',
		week_warrior: '[7D]',
		perfect_week: '[MAX]',
		mentor: '[EDU]',
		fraud_hunter: '[TOP]'
	};

	const rankColors: Record<string, string> = {
		Rookie: 'rgba(255, 255, 255, 0.42)',
		'Alert Analyst': 'rgba(255, 255, 255, 0.56)',
		'Threat Specialist': 'rgba(255, 255, 255, 0.72)',
		'Cyber Commander': 'rgba(255, 255, 255, 0.86)',
		'Shield Master': '#eda167'
	};

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
		return 'Timed out';
	}

	function outcomeClass(outcome: string): string {
		if (outcome === 'success') return 'outcome--success';
		if (outcome === 'failed') return 'outcome--failed';
		return 'outcome--timeout';
	}

	function judgmentLabel(choice: string | null, correct: boolean | null): string {
		if (!choice) return 'N/A';
		return correct ? `${choice} / correct` : `${choice} / wrong`;
	}
</script>

<svelte:head>
	<title>ShieldByte | Profile</title>
</svelte:head>

<div class="profile-shell">
	<div class="profile-shell__grain"></div>

	<main class="profile-main">
		<section class="profile-hero">
			<div class="profile-hero__identity">
				<p class="mono-label">Operator profile</p>
				<h1>Progress, rank, and mission history.</h1>
				<p class="profile-hero__copy">
					Track how many scam rounds you cleared, which badges you unlocked, and how your judgment is improving over time.
				</p>
			</div>

			<div class="profile-rank-card">
				<p class="mono-label">Current rank</p>
				<h2 style="color: {rankColors[profile.stats.rank] ?? '#7df2c9'}">{profile.stats.rank}</h2>
				<div class="profile-rank-card__bar">
					<div
						class="profile-rank-card__fill"
						style="width: {Math.min((profile.stats.total_xp % 2000) / 20, 100)}%"
					></div>
				</div>
				<p class="profile-rank-card__meta">{profile.stats.total_xp} XP total</p>
			</div>
		</section>

		<section class="stats-strip">
			<article>
				<span class="mono-label">Missions</span>
				<strong>{profile.stats.missions_completed ?? 0}</strong>
				<p>completed</p>
			</article>
			<article>
				<span class="mono-label">Streak</span>
				<strong>{profile.stats.streak_days ?? 0}</strong>
				<p>day{(profile.stats.streak_days ?? 0) === 1 ? '' : 's'}</p>
			</article>
			<article>
				<span class="mono-label">Badges</span>
				<strong>{profile.badges.filter((b: { earned: boolean }) => b.earned).length}/{profile.badges.length}</strong>
				<p>earned</p>
			</article>
			<article>
				<span class="mono-label">Last active</span>
				<strong>{formatDate(profile.stats.last_mission_at)}</strong>
				<p>latest mission</p>
			</article>
		</section>

		<section class="page-section">
			<div class="section-header">
				<div>
					<p class="mono-label">Achievement vault</p>
					<h2>Badge cabinet</h2>
				</div>
			</div>

			<div class="badges-gallery">
				{#each profile.badges as badge}
					<article class:badge-tile--earned={badge.earned} class="badge-tile">
						<div class="badge-tile__icon">{badgeEmoji[badge.id] ?? '[BADGE]'}</div>
						<div class="badge-tile__info">
							<h3>{badge.name}</h3>
							<p>{badge.description}</p>
							{#if badge.earned && badge.earnedAt}
								<span class="badge-tile__meta">Earned {formatDate(badge.earnedAt)}</span>
							{:else}
								<span class="badge-tile__meta">Locked</span>
							{/if}
						</div>
					</article>
				{/each}
			</div>
		</section>

		<section class="page-section">
			<div class="section-header">
				<div>
					<p class="mono-label">Mission log</p>
					<h2>Recent attempts</h2>
				</div>
			</div>

			{#if profile.recentAttempts.length === 0}
				<div class="empty-state">
					<p>No missions attempted yet.</p>
					<a href="/play" class="cta-button">Play first mission</a>
				</div>
			{:else}
				<div class="history-table">
					<div class="history-table__header">
						<span>Mission</span>
						<span>Outcome</span>
						<span>Judgment</span>
						<span>XP</span>
						<span>Clues</span>
						<span>Time</span>
						<span>Date</span>
					</div>
					{#each profile.recentAttempts as attempt}
						<div class="history-row">
							<span class="history-row__mission">#{attempt.mission_id}</span>
							<span class="history-row__outcome {outcomeClass(attempt.outcome)}">
								{outcomeLabel(attempt.outcome)}
							</span>
							<span>{judgmentLabel(attempt.judgment_choice, attempt.judgment_correct)}</span>
							<span class="history-row__xp">+{attempt.xp_earned}</span>
							<span>{attempt.clues_found}/{attempt.clues_found + attempt.clues_missed}</span>
							<span>{attempt.time_taken}s</span>
							<span class="history-row__date">{formatDate(attempt.completed_at)}</span>
						</div>
					{/each}
				</div>
			{/if}
		</section>

		<section class="quick-links">
			<a href="/play" class="cta-button">Play a mission</a>
		</section>
	</main>
</div>

<style>
	.profile-shell {
		position: relative;
		min-height: 100vh;
	}

	.profile-shell__grain {
		position: fixed;
		inset: 0;
		pointer-events: none;
		opacity: 0.08;
		background-image:
			linear-gradient(rgba(255, 255, 255, 0.04) 1px, transparent 1px),
			linear-gradient(90deg, rgba(255, 255, 255, 0.03) 1px, transparent 1px);
		background-size: 52px 52px;
	}

	.profile-main {
		position: relative;
		z-index: 1;
		max-width: 1100px;
		margin: 0 auto;
		padding: 1.5rem clamp(1rem, 4vw, 3rem) 4rem;
		display: grid;
		gap: 1.25rem;
	}

	.mono-label {
		margin: 0;
		font-family: var(--font-mono);
		font-size: 0.68rem;
		letter-spacing: 0.18em;
		text-transform: uppercase;
		color: var(--text-muted);
	}

	.profile-hero {
		display: grid;
		grid-template-columns: minmax(0, 1.2fr) minmax(18rem, 0.8fr);
		gap: 1rem;
	}

	.profile-hero__identity,
	.profile-rank-card,
	.stats-strip article,
	.page-section,
	.badge-tile,
	.history-table,
	.empty-state {
		border: 1px solid rgba(10, 10, 10, 0.1);
		border-radius: 1.2rem;
		background:
			radial-gradient(circle at top right, rgba(230, 57, 70, 0.06), transparent 24%),
			linear-gradient(180deg, rgba(255, 255, 255, 0.28), rgba(255, 255, 255, 0.12)),
			var(--surface-1);
		box-shadow: var(--shadow-hud);
	}

	.profile-hero__identity,
	.profile-rank-card,
	.page-section,
	.empty-state {
		padding: 1.25rem;
	}

	.profile-hero__identity h1,
	.section-header h2,
	.profile-rank-card h2 {
		margin: 0.45rem 0 0;
		font-family: var(--font-display);
		line-height: 0.98;
		font-weight: 600;
	}

	.profile-hero__identity h1 {
		font-size: clamp(2.35rem, 5vw, 4.2rem);
		max-width: 14ch;
	}

	.profile-hero__copy {
		max-width: 34rem;
		margin: 0.85rem 0 0;
		color: var(--text-soft);
		line-height: 1.75;
	}

	.profile-rank-card h2 {
		font-size: clamp(2.2rem, 4vw, 3.5rem);
	}

	.profile-rank-card__bar {
		width: 100%;
		height: 0.45rem;
		margin-top: 1rem;
		border-radius: 999px;
		background: rgba(255, 255, 255, 0.06);
		overflow: hidden;
	}

	.profile-rank-card__fill {
		height: 100%;
		background: linear-gradient(90deg, var(--accent-cyan), var(--accent-hot));
	}

	.profile-rank-card__meta {
		margin: 0.6rem 0 0;
		font-family: var(--font-mono);
		font-size: 0.72rem;
		color: var(--text-muted);
	}

	.stats-strip {
		display: grid;
		grid-template-columns: repeat(4, minmax(0, 1fr));
		gap: 0.85rem;
	}

	.stats-strip article {
		padding: 1rem;
	}

	.stats-strip strong {
		display: block;
		margin-top: 0.4rem;
		font-family: var(--font-display);
		font-size: 1.85rem;
		font-weight: 600;
		line-height: 1;
	}

	.stats-strip p,
	.badge-tile__info p,
	.empty-state p {
		margin: 0.45rem 0 0;
		color: var(--text-soft);
		line-height: 1.6;
	}

	.section-header {
		margin-bottom: 1rem;
	}

	.section-header h2 {
		font-size: clamp(1.9rem, 4vw, 2.8rem);
	}

	.badges-gallery {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
		gap: 0.85rem;
	}

	.badge-tile {
		display: flex;
		gap: 0.9rem;
		padding: 1rem;
	}

	.badge-tile--earned {
		border-color: rgba(230, 57, 70, 0.16);
		background:
			radial-gradient(circle at left, rgba(230, 57, 70, 0.06), transparent 60%),
			linear-gradient(180deg, rgba(255, 255, 255, 0.28), rgba(255, 255, 255, 0.12)),
			var(--surface-1);
	}

	.badge-tile__icon {
		flex-shrink: 0;
		display: inline-grid;
		place-items: center;
		width: 3.15rem;
		height: 3.15rem;
		border-radius: 999px;
		border: 1px solid rgba(10, 10, 10, 0.1);
		background: rgba(255, 255, 255, 0.18);
		font-family: var(--font-mono);
		font-size: 0.7rem;
		letter-spacing: 0.08em;
	}

	.badge-tile__info h3 {
		margin: 0;
		font-family: var(--font-display);
		font-size: 1.35rem;
		font-weight: 600;
		line-height: 1.1;
	}

	.badge-tile__meta {
		display: inline-block;
		margin-top: 0.55rem;
		font-family: var(--font-mono);
		font-size: 0.62rem;
		letter-spacing: 0.14em;
		text-transform: uppercase;
		color: var(--text-muted);
	}

	.history-table {
		overflow: hidden;
	}

	.history-table__header,
	.history-row {
		display: grid;
		grid-template-columns: 80px 110px 140px 80px 80px 70px 1fr;
		gap: 0.8rem;
		padding: 0.9rem 1rem;
		align-items: center;
	}

	.history-table__header {
		border-bottom: 1px solid rgba(10, 10, 10, 0.08);
		font-family: var(--font-mono);
		font-size: 0.64rem;
		letter-spacing: 0.16em;
		text-transform: uppercase;
		color: var(--text-muted);
	}

	.history-row {
		border-bottom: 1px solid rgba(255, 255, 255, 0.04);
		color: var(--text-soft);
	}

	.history-row:last-child {
		border-bottom: none;
	}

	.history-row__mission,
	.history-row__xp {
		font-family: var(--font-mono);
	}

	.history-row__xp {
		color: var(--accent-hot);
	}

	.history-row__outcome {
		font-family: var(--font-mono);
		font-size: 0.68rem;
		letter-spacing: 0.12em;
		text-transform: uppercase;
	}

	.outcome--success {
		color: var(--accent-mint);
	}

	.outcome--failed {
		color: var(--accent-hot);
	}

	.outcome--timeout {
		color: var(--accent-gold);
	}

	.history-row__date {
		color: var(--text-muted);
		font-size: 0.76rem;
	}

	.quick-links {
		display: flex;
		gap: 0.9rem;
		justify-content: center;
	}

	.cta-button {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		min-height: 3rem;
		padding: 0 1.35rem;
		border-radius: 999px;
		background: linear-gradient(135deg, var(--accent-cyan), var(--accent-hot));
		color: #f4f4f2;
		font-family: var(--font-mono);
		font-size: 0.7rem;
		font-weight: 600;
		letter-spacing: 0.16em;
		text-transform: uppercase;
		text-decoration: none;
	}

	.cta-button--ghost {
		background: transparent;
		border: 1px solid rgba(10, 10, 10, 0.12);
		color: var(--text-strong);
	}

	.empty-state {
		text-align: center;
	}

	@media (max-width: 900px) {
		.profile-hero,
		.stats-strip {
			grid-template-columns: 1fr;
		}
	}

	@media (max-width: 720px) {
		.profile-main {
			padding: 1rem 0.9rem 3rem;
		}

		.profile-hero__identity,
		.profile-rank-card,
		.page-section,
		.empty-state {
			padding: 1rem;
			border-radius: 1rem;
		}

		.badges-gallery {
			grid-template-columns: 1fr;
		}

		.history-table {
			overflow-x: auto;
			-webkit-overflow-scrolling: touch;
			margin: 0 -1rem;
		}

		.history-table__header,
		.history-row {
			min-width: 44rem;
			padding-left: 1rem;
			padding-right: 1rem;
		}

		.quick-links {
			flex-direction: column;
		}
	}
</style>
