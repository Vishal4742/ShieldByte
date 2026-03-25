alter table missions
	add column if not exists expected_verdict text not null default 'scam'
	check (expected_verdict in ('scam', 'safe'));

alter table mission_attempts
	add column if not exists judgment_choice text
	check (judgment_choice in ('scam', 'safe'));

alter table mission_attempts
	add column if not exists judgment_correct boolean;

update missions
set expected_verdict = 'scam'
where expected_verdict is null;
