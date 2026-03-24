create table if not exists user_stats (
	user_id text primary key,
	total_xp integer not null default 0,
	streak_days integer not null default 0,
	rank text not null default 'Rookie Agent',
	last_mission_at timestamptz,
	created_at timestamptz not null default now(),
	updated_at timestamptz not null default now()
);

create table if not exists mission_attempts (
	id bigint generated always as identity primary key,
	user_id text not null,
	mission_id bigint not null references missions(id) on delete cascade,
	xp_earned integer not null default 0,
	clues_found integer not null default 0,
	clues_missed integer not null default 0,
	wrong_taps integer not null default 0,
	lives_remaining integer not null default 0,
	time_taken integer not null default 0,
	outcome text not null default 'success' check (outcome in ('success', 'timeout', 'failed')),
	result_json jsonb not null default '{}'::jsonb,
	completed_at timestamptz not null default now()
);

create table if not exists xp_transactions (
	id bigint generated always as identity primary key,
	user_id text not null,
	mission_attempt_id bigint references mission_attempts(id) on delete set null,
	event_type text not null,
	base_xp integer not null default 0,
	multiplier numeric(6,2) not null default 1,
	final_xp integer not null default 0,
	metadata jsonb not null default '{}'::jsonb,
	created_at timestamptz not null default now()
);

create index if not exists idx_mission_attempts_user_completed
	on mission_attempts (user_id, completed_at desc);

create index if not exists idx_mission_attempts_mission
	on mission_attempts (mission_id);

create index if not exists idx_xp_transactions_user_created
	on xp_transactions (user_id, created_at desc);
