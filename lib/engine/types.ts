export type SkillStatus = "mastered" | "learning" | "locked";

export type SkillState = {
  id: string;
  label: string;
  domain: "docker" | "kubernetes" | "terraform" | "linux" | "debugging";
  mastery: number;
  target: number;
  evidence: number;
  status: SkillStatus;
  prerequisites?: string[];
};

export type MissionStep = {
  id: string;
  title: string;
  eyebrow: string;
  description: string;
  skillIds: string[];
  status?: "done" | "active" | "queued";
};

export type MissionDefinition = {
  id: string;
  slug: string;
  title: string;
  shortTitle: string;
  description: string;
  outcome: string;
  domain: "docker" | "kubernetes" | "terraform";
  difficulty: "Foundation" | "Intermediate" | "Production";
  duration: string;
  requiredEntitlement: string;
  accent: string;
  steps: MissionStep[];
  starterLines: string[];
};

export type EvidenceEvent = {
  id: string;
  missionId: string;
  skillIds: string[];
  type: "command" | "validator" | "coach" | "incident" | "explanation";
  label: string;
  score: number;
  timestamp: string;
  metadata?: Record<string, string | number | boolean>;
};

export type EngineState = {
  missionId: string;
  goal: string;
  commands: string[];
  validators: Record<string, boolean>;
  hintCount: number;
  incidentMode: boolean;
  evidence: EvidenceEvent[];
};

export type EvaluationResult = {
  validators: Record<string, boolean>;
  output: string[];
  evidence?: Omit<EvidenceEvent, "id" | "missionId" | "timestamp">;
  coachSignal?: "progress" | "debug" | "misconception" | "complete";
};

export type UserProgress = {
  skillMastery: Record<string, number>;
  completedMissions: string[];
  missionStates: Record<string, EngineState>;
  entitlements: string[];
};
