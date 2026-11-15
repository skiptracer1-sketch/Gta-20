export type GameView = 'hub' | 'bigred3d' | 'drive3d' | 'campus2d' | 'story' | 'android' | 'media';

export type TouchControlsMode = 'auto' | 'always' | 'off';

export interface VehicleTrim {
  id: string;
  name: string;
  subtitle: string;
  primaryColor: string;
  accentColor: string;
  cost: number;
  topSpeedBonus: number;
}

export interface PlayerProfile {
  credits: number;
  rep: number;
  wantedRecord: number;
  completedChapters: string[];
  unlockedVehicles: string[];
  selectedVehicleId: string;
  highScores: {
    drive3d: number;
    campus2d: number;
    firewall: number;
    drift: number;
  };
  settings: {
    soundEnabled: boolean;
    touchControlsMode: TouchControlsMode;
  };
}

export interface DialogueChoice {
  label: string;
  nextNodeId: string;
  creditsDelta?: number;
  repDelta?: number;
  launchMinigame?: 'firewall' | 'drift';
  launchMode?: GameView;
}

export interface DialogueNode {
  id: string;
  speaker: string;
  role: string;
  line: string;
  choices: DialogueChoice[];
}

export interface StoryChapter {
  id: string;
  number: string;
  title: string;
  district: string;
  summary: string;
  coverImage: string;
  rewardCredits: number;
  rewardRep: number;
  nodes: Record<string, DialogueNode>;
  startNodeId: string;
}
