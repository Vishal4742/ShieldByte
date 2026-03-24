-- Migration: Add Referral Tracking
create table if not exists referral_links (
    code text primary key, -- The unique short code, e.g. "x7y9Z2"
    user_id uuid references auth.users(id) not null,
    mission_id bigint references missions(id) not null,
    clicks integer default 0,
    successful_recruits integer default 0,
    created_at timestamptz default now()
);

create table if not exists referral_claims (
    id bigint primary key generated always as identity,
    code text references referral_links(code) not null,
    recruit_user_id uuid references auth.users(id) not null,
    status text not null default 'claimed',
    claimed_at timestamptz default now(),
    unique(code, recruit_user_id) -- A user can only be successfully recruited by a specific link once
);

-- Enable RLS
alter table referral_links enable row level security;
alter table referral_claims enable row level security;

create policy "Users can see their own referral links"
    on referral_links
    for select
    using (auth.uid() = user_id);

create policy "Service role can manage all referral links"
    on referral_links
    for all
    using (true)
    with check (true);

create policy "Service role can manage all referral claims"
    on referral_claims
    for all
    using (true)
    with check (true);
