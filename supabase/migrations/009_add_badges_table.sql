-- Phase 5: Gamification System — badge persistence
-- UNIQUE(user_id, badge_id) prevents the same badge from being awarded twice.
create table if not exists user_badges (
	id bigint generated always as identity primary key,
	user_id text not null,
	badge_id text not null,
	earned_at timestamptz not null default now(),
	unique(user_id, badge_id)
);

create index if not exists idx_user_badges_user
	on user_badges (user_id);

-- Badge IDs (SRS Section 4.6):
-- speed_demon, sharpshooter, upi_guardian, kyc_defender,
-- viral_protector, week_warrior, perfect_week, mentor, fraud_hunter
