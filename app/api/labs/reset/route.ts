import { NextResponse } from "next/server";
import { findMission } from "@/lib/engine/catalog";
import { getIdentity } from "@/lib/integrations/auth";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null) as { missionId?: string } | null;
  const mission = findMission(body?.missionId || null);
  if (!mission) return NextResponse.json({ error: "valid missionId required" }, { status: 400 });
  if (!mission.liveValidator) return NextResponse.json({ error: "mission has no resettable live fixture" }, { status: 400 });
  const identity = await getIdentity();
  if (!identity.authenticated) return NextResponse.json({ error: "live reset requires Clerk authentication" }, { status: 401 });
  if (process.env.CPL_SANDBOX_MODE !== "vercel") return NextResponse.json({ error: "live reset requires CPL_SANDBOX_MODE=vercel" }, { status: 409 });
  try {
    const { resetLab } = await import("@/lib/sandbox/session");
    return NextResponse.json({ reset: true, missionId: mission.id, session: await resetLab(identity.id, mission.id) });
  } catch (error) {
    return NextResponse.json({ reset: false, error: error instanceof Error ? error.message : "live reset failed" }, { status: 502 });
  }
}
