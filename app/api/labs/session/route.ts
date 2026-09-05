import { NextResponse } from "next/server";
import { getIdentity } from "@/lib/integrations/auth";
import { getMission } from "@/lib/engine/catalog";

function validateMission(id: string | null) {
  if (!id) return null;
  try { return getMission(id); } catch { return null; }
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null) as { missionId?: string } | null;
  const mission = validateMission(body?.missionId || null);
  if (!mission) return NextResponse.json({ error: "valid missionId required" }, { status: 400 });
  const identity = await getIdentity();
  if (!identity.authenticated) return NextResponse.json({ mode: "simulated", ready: true, missionId: mission.id, reason: "real labs require Clerk authentication" });
  if (process.env.CPL_SANDBOX_MODE !== "vercel") return NextResponse.json({ mode: "simulated", ready: true, missionId: mission.id, reason: "CPL_SANDBOX_MODE is not vercel" });
  try {
    const { ensureLab } = await import("@/lib/sandbox/session");
    return NextResponse.json({ mode: "real", ready: true, missionId: mission.id, session: await ensureLab(identity.id, mission.id) });
  } catch (error) {
    return NextResponse.json({ mode: "real", ready: false, error: error instanceof Error ? error.message : "lab session error" }, { status: 502 });
  }
}

export async function DELETE(request: Request) {
  const body = await request.json().catch(() => null) as { missionId?: string } | null;
  const mission = validateMission(body?.missionId || null);
  if (!mission) return NextResponse.json({ error: "valid missionId required" }, { status: 400 });
  const identity = await getIdentity();
  if (!identity.authenticated || process.env.CPL_SANDBOX_MODE !== "vercel") return NextResponse.json({ mode: "simulated", stopped: true });
  try {
    const { stopLab } = await import("@/lib/sandbox/session");
    return NextResponse.json({ mode: "real", stopped: true, session: await stopLab(identity.id, mission.id) });
  } catch (error) {
    return NextResponse.json({ mode: "real", stopped: false, error: error instanceof Error ? error.message : "lab stop error" }, { status: 502 });
  }
}
