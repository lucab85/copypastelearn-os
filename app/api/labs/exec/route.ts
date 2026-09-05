import { NextResponse } from "next/server";
import { getIdentity } from "@/lib/integrations/auth";
import { findMission } from "@/lib/engine/catalog";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null) as { missionId?: string; command?: string } | null;
  if (!body?.missionId || !body.command?.trim()) return NextResponse.json({ error: "missionId and command required" }, { status: 400 });
  if (body.command.length > 2_000 || body.command.includes("\0")) return NextResponse.json({ error: "command rejected" }, { status: 400 });
  const mission = findMission(body.missionId);
  if (!mission) return NextResponse.json({ error: "unknown mission" }, { status: 400 });
  const identity = await getIdentity();
  if (!identity.authenticated) return NextResponse.json({ error: "real lab execution requires Clerk authentication" }, { status: 401 });
  if (process.env.CPL_SANDBOX_MODE !== "vercel") return NextResponse.json({ mode: "simulated", executed: false, message: "Enable CPL_SANDBOX_MODE=vercel for durable isolated execution." });
  try {
    const { executeLab } = await import("@/lib/sandbox/session");
    return NextResponse.json({ mode: "real", executed: true, missionId: mission.id, result: await executeLab(identity.id, mission.id, body.command) });
  } catch (error) {
    return NextResponse.json({ mode: "real", executed: false, error: error instanceof Error ? error.message : "lab execution error" }, { status: 502 });
  }
}
