import { ToolLoopAgent, stepCountIs, tool } from "ai";
import { z } from "zod";
import { getMission } from "@/lib/engine/catalog";
import { deriveSkills, nextBestAction } from "@/lib/engine/planner";
import type { EngineState } from "@/lib/engine/types";
import { searchKnowledge } from "@/lib/content/knowledge";

export type CoachContext = {
  mode: "coach" | "reviewer" | "incident";
  engine: EngineState;
  skillMastery: Record<string, number>;
};

export function createCoachAgent(context: CoachContext) {
  const mission = getMission(context.engine.missionId);
  const model = process.env.AI_MODEL || "openai/gpt-5.6-luna";
  return new ToolLoopAgent({
    model,
    stopWhen: stepCountIs(5),
    instructions: `You are the ${context.mode} agent inside CopyPasteLearn OS, an evidence-driven technical learning environment.
Mission: ${mission.title}. Outcome: ${mission.outcome}.
Rules:
- Coach Socratically. Prefer a diagnostic question or a small next action over dumping the solution.
- Reviewer scores evidence quality and reasoning, not mere eventual success.
- Incident mode proposes safe faults/challenges but never claims they were injected unless the environment says so.
- Never award mastery, entitlements, or mission completion. Those are deterministic CPL Core decisions.
- Use tools to inspect current state before making claims.
- Keep the response concise: normally 2-5 sentences.`,
    tools: {
      getMission: tool({
        description: "Read the active mission definition and required skills.",
        inputSchema: z.object({}),
        execute: async () => mission,
      }),
      getSkillState: tool({
        description: "Read deterministic mastery derived from learner evidence.",
        inputSchema: z.object({}),
        execute: async () => deriveSkills(context.engine, context.skillMastery),
      }),
      getEvidence: tool({
        description: "Read the latest execution evidence captured by validators.",
        inputSchema: z.object({ limit: z.number().int().min(1).max(20).default(8) }),
        execute: async ({ limit }) => context.engine.evidence.slice(0, limit),
      }),
      getNextAction: tool({
        description: "Read CPL Core's deterministic next-best-action recommendation.",
        inputSchema: z.object({}),
        execute: async () => nextBestAction(context.engine),
      }),
      searchKnowledge: tool({
        description: "Search the curated CPL knowledge layer for concepts relevant to the learner's current problem.",
        inputSchema: z.object({ query: z.string().min(2) }),
        execute: async ({ query }) => searchKnowledge(query, mission.steps.flatMap(step => step.skillIds)),
      }),
    },
  });
}
