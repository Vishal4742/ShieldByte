export interface MissionClue {
	id: number;
	triggerText: string;
	type: string;
	difficulty: string;
	explanation: string;
}

export interface ThreatMission {
	id: number;
	articleId: number | null;
	fraudType: string;
	simulationType: string;
	sender: string;
	messageBody: string;
	difficulty: string;
	tip: string;
	variant: number;
	clues: MissionClue[];
}
