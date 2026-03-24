-- Migration: Add WhatsApp Sessions table
create type whatsapp_state as enum ('IDLE', 'IN_MISSION', 'WAITING_FOR_FEEDBACK');

create table if not exists whatsapp_sessions (
  phone_number text primary key,
  user_id text references auth.users(id),
  state whatsapp_state not null default 'IDLE',
  current_mission_id bigint references missions(id),
  clues_found integer default 0,
  wrong_taps integer default 0,
  lives_remaining integer default 3,
  mission_start_time timestamptz,
  updated_at timestamptz default now()
);

-- Enable RLS and add basic policies (though this is mostly interacted with via server API)
alter table whatsapp_sessions enable row level security;

create policy "Service role can manage all whatsapp sessions"
  on whatsapp_sessions
  for all
  using (true)
  with check (true);
