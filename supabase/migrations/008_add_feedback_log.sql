-- Phase 4: AI Feedback Engine — feedback persistence
create table if not exists feedback_log (
	id bigint generated always as identity primary key,
	user_id text not null,
	mission_id bigint not null references missions(id) on delete cascade,
	mission_attempt_id bigint references mission_attempts(id) on delete set null,
	feedback_text text not null,
	pattern_identified text,
	actionable_tip text,
	encouragement text,
	metadata jsonb not null default '{}'::jsonb,
	created_at timestamptz not null default now()
);

create index if not exists idx_feedback_log_user
	on feedback_log (user_id, created_at desc);

create index if not exists idx_feedback_log_attempt
	on feedback_log (mission_attempt_id);
