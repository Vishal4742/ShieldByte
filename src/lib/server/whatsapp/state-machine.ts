import { supabase } from '../supabase.js';
import { sendWhatsAppMessage } from './messenger.js';
import { fetchRandomActiveMission } from '../missions.js';
import { recordMissionAttempt } from '../gameplay.js';

type WhatsAppState = 'IDLE' | 'IN_MISSION' | 'WAITING_FOR_FEEDBACK';

interface WhatsAppSession {
	phone_number: string;
	user_id: string | null;
	state: WhatsAppState;
	current_mission_id: number | null;
	clues_found: number;
	wrong_taps: number;
	lives_remaining: number;
	mission_start_time: string | null;
}

async function getSession(phone: string): Promise<WhatsAppSession> {
	let { data, error } = await supabase
		.from('whatsapp_sessions')
		.select('*')
		.eq('phone_number', phone)
		.maybeSingle();

	if (error) {
		console.error('[WhatsApp] DB Error reading session:', error);
	}

	if (!data) {
		const newSession = {
			phone_number: phone,
			state: 'IDLE',
			clues_found: 0,
			wrong_taps: 0,
			lives_remaining: 3
		};
		await supabase.from('whatsapp_sessions').insert(newSession);
		return newSession as WhatsAppSession;
	}

	return data as WhatsAppSession;
}

async function updateSession(phone: string, updates: Partial<WhatsAppSession>) {
	await supabase
		.from('whatsapp_sessions')
		.update({ ...updates, updated_at: new Date().toISOString() })
		.eq('phone_number', phone);
}

export async function handleIncomingMessage(phone: string, text: string) {
	const session = await getSession(phone);
	const normalizedText = text.trim().toLowerCase();

	if (session.state === 'IDLE') {
		if (normalizedText === 'start' || normalizedText === 'play') {
			const mission = await fetchRandomActiveMission();
			if (!mission) {
				await sendWhatsAppMessage(phone, "Sorry, there are no active missions available right now. Try again later.");
				return;
			}

			await updateSession(phone, {
				state: 'IN_MISSION',
				current_mission_id: mission.id,
				clues_found: 0,
				wrong_taps: 0,
				lives_remaining: 3,
				mission_start_time: new Date().toISOString()
			});

			const msg = `🚨 *New Mission Started!* 🚨\n\n*Sender:* ${mission.sender}\n\n*Message:*\n"${mission.messageBody}"\n\nReply with what you think is suspicious (e.g., "link", "urgent", etc.).`;
			await sendWhatsAppMessage(phone, msg);
			return;
		}

		await sendWhatsAppMessage(phone, "Welcome to ShieldByte! 🛡️\nSend *start* or *play* to begin a new threat simulation mission.");
		return;
	}

	if (session.state === 'IN_MISSION') {
		if (normalizedText === 'quit' || normalizedText === 'stop') {
			await updateSession(phone, { state: 'IDLE', current_mission_id: null });
			await sendWhatsAppMessage(phone, "Mission aborted. Send *start* when you're ready again.");
			return;
		}

		// Fetch the mission clues manually from the DB
		const { data: missionData } = await supabase
			.from('missions')
			.select('clues_json')
			.eq('id', session.current_mission_id)
			.single();

		if (!missionData) {
			await sendWhatsAppMessage(phone, "Error loading mission clues. Aborting mission.");
			await updateSession(phone, { state: 'IDLE', current_mission_id: null });
			return;
		}

		const clues: any[] = Array.isArray(missionData.clues_json) ? missionData.clues_json : [];
		const triggerWords = clues.map(c => c.trigger_text.toLowerCase());
		const totalClues = clues.filter(c => c.type === 'signal').length;

		// Check if user's text matches a clue
		// Simple keyword check for MVP bot
		const matchedClue = clues.find(c => normalizedText.includes(c.trigger_text.toLowerCase()));

		if (matchedClue) {
			if (matchedClue.type === 'signal') {
				const newFound = session.clues_found + 1;
				if (newFound >= totalClues) {
					// User won
					await handleMissionEnd(session, 'success', newFound, session.wrong_taps, session.lives_remaining);
				} else {
					await updateSession(phone, { clues_found: newFound });
					await sendWhatsAppMessage(phone, `✅ Nice catch! You found a clue: *${matchedClue.trigger_text}*\n\nExplanation: ${matchedClue.explanation}\n\nKeep looking, there are more clues!`);
				}
			} else if (matchedClue.type === 'decoy') {
				// Decoy counts as wrong tap
				const newWrong = session.wrong_taps + 1;
				const newLives = Math.max(0, session.lives_remaining - 1);
				if (newLives === 0) {
					await handleMissionEnd(session, 'failed', session.clues_found, newWrong, newLives);
				} else {
					await updateSession(phone, { wrong_taps: newWrong, lives_remaining: newLives });
					await sendWhatsAppMessage(phone, `⚠️ Careful! *${matchedClue.trigger_text}* is actually safe.\n\nExplanation: ${matchedClue.explanation}\n\nLives remaining: ${newLives} ❤️`);
				}
			}
		} else {
			// No match = wrong tap
			const newWrong = session.wrong_taps + 1;
			const newLives = Math.max(0, session.lives_remaining - 1);
			if (newLives === 0) {
				await handleMissionEnd(session, 'failed', session.clues_found, newWrong, newLives);
			} else {
				await updateSession(phone, { wrong_taps: newWrong, lives_remaining: newLives });
				await sendWhatsAppMessage(phone, `❌ Incorrect guess. Try looking closer at the message.\n\nLives remaining: ${newLives} ❤️`);
			}
		}
		return;
	}

	if (session.state === 'WAITING_FOR_FEEDBACK') {
		await updateSession(phone, { state: 'IDLE', current_mission_id: null });
		await sendWhatsAppMessage(phone, "Send *start* when you're ready for another mission.");
		return;
	}
}

async function handleMissionEnd(session: WhatsAppSession, outcome: 'success' | 'failed' | 'timeout', cluesFound: number, wrongTaps: number, livesRemaining: number) {
	// Record outcome
	let xp = 0;
	if (outcome === 'success') {
		xp = 50 + (livesRemaining * 10);
	}

	const timeTaken = session.mission_start_time ? Math.min(60, Math.floor((new Date().getTime() - new Date(session.mission_start_time).getTime()) / 1000)) : 30;

	// In the MVP, WhatsApp users do not earn permanent persistent XP unless linked to web user.
	// But we try recording it if user_id exists. If it's a guest, user_id is null.
	// We will fake user_id as phone number for now if missing so guest plays track via recordMissionAttempt?
	// recordMissionAttempt requires a valid user_id (UUID) matching auth.users.
	// Since we don't have that via pure anonymous WA, we only record if session.user_id is set.
	if (session.user_id) {
		try {
			await recordMissionAttempt({
				user_id: session.user_id,
				mission_id: session.current_mission_id!,
				outcome,
				xp_earned: xp,
				base_xp: outcome === 'success' ? 50 : 0,
				clues_found: cluesFound,
				clues_missed: 0, // Simplified for bot
				wrong_taps: wrongTaps,
				lives_remaining: livesRemaining,
				time_taken: timeTaken,
				perfect_multiplier: wrongTaps === 0 ? 1.5 : 1,
				streak_multiplier: 1,
				speed_bonus: 0,
				seconds_remaining: Math.max(0, 60 - timeTaken)
			});
		} catch (err) {
			console.error('[WhatsApp] Error recording stats:', err);
		}
	}

	await updateSession(session.phone_number, {
		state: 'WAITING_FOR_FEEDBACK',
		current_mission_id: null
	});

	if (outcome === 'success') {
		await sendWhatsAppMessage(session.phone_number, `🎉 *Mission Success!* 🎉\n\nYou successfully identified the threat!\nXP Earned: ${xp}\n\nReply anything to return to menu.`);
	} else {
		await sendWhatsAppMessage(session.phone_number, `🛑 *Mission Failed!* 🛑\n\nYou ran out of lives. Stay sharp next time!\n\nReply anything to return to menu.`);
	}
}
