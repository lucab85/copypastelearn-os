import { NextResponse } from "next/server";
import { createCoachAgent, type CoachContext } from "@/lib/ai/coach-agent";
import { getMission } from "@/lib/engine/catalog";
import { nextBestAction } from "@/lib/engine/planner";
import { getIdentity } from "@/lib/integrations/auth";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null) as (CoachContext & { prompt?: string }) | null;
  if (!body?.engine?.missionId) return NextResponse.json({ error: "engine context required" }, { status: 400 });
  const identity = await getIdentity();
  if (!process.env.AI_GATEWAY_API_KEY || !identity.authenticated) {
    const mission = getMission(body.engine.missionId);
    const next = nextBestAction(body.engine);
    return NextResponse.json({
      mode: "deterministic-fallback",
      model: null,
      text: body.mode === "reviewer"
        ? `Reviewer: ${body.engine.evidence.length} evidence signals captured. Strong evidence is inspection → hypothesis → repair → verification; the deterministic planner recommends “${next.title}”.`
        : body.mode === "incident"
          ? `Incident agent is armed but no real fault was injected. Complete the safety gates for ${mission.shortTitle}, then request an environment mutation.`
          : `Coach: ${next.title}. ${next.detail}`,
    });
  }
  const agent = createCoachAgent(body);
  const result = await agent.generate({ prompt: body.prompt || "Inspect my current learning state and coach the next move." });
  return NextResponse.json({ mode: "agent", model: process.env.AI_MODEL || "openai/gpt-5.6-luna", text: result.text, steps: result.steps.length });
}
