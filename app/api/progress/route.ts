import { NextResponse } from "next/server";
import { getIdentity } from "@/lib/integrations/auth";
import { listEntitlements, loadProgress, saveProgress } from "@/lib/server/progress-store";
import type { UserProgress } from "@/lib/engine/types";

export async function GET() {
  const identity = await getIdentity();
  const [progress, entitlements] = await Promise.all([loadProgress(identity.id), listEntitlements(identity.id)]);
  return NextResponse.json({ identity, progress, entitlements, persistence: Boolean(process.env.DATABASE_URL) });
}

export async function PUT(request: Request) {
  const identity = await getIdentity();
  const progress = await request.json() as UserProgress;
  if (!progress || typeof progress !== "object" || !progress.skillMastery || !progress.missionStates) {
    return NextResponse.json({ error: "invalid progress payload" }, { status: 400 });
  }
  const result = await saveProgress(identity.id, progress);
  return NextResponse.json({ ok: true, ...result });
}
