export interface ThreatClue {
	clueText: string;
	type: string;
	explanation: string;
}

export interface ThreatExtractionField {
	label: string;
	value: string | string[];
}

export interface ThreatArticle {
	id: number;
	source: string;
	title: string;
	body: string;
	url: string;
	publishedAt: string | null;
	category: string;
	confidence: number | null;
	channel: string;
	scenarioSummary: string;
	victimProfile: string;
	clues: ThreatClue[];
	redFlags: string[];
	tip: string;
	rawExtractionFields: ThreatExtractionField[];
}
