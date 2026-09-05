import { NextResponse } from "next/server";
import { findMission } from "@/lib/engine/catalog";
import { getIdentity } from "@/lib/integrations/auth";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null) as { missionId?: string } | null;
  const mission = findMission(body?.missionId || null);
  if (!mission) return NextResponse.json({ error: "valid missionId required" }, { status: 400 });
  if (!mission.liveValidator) return NextResponse.json({ error: "mission has no live validator" }, { status: 400 });
  const identity = await getIdentity();
  if (!identity.authenticated) return NextResponse.json({ error: "live validation requires Clerk authentication" }, { status: 401 });
  if (process.env.CPL_SANDBOX_MODE !== "vercel") return NextResponse.json({ error: "live validation requires CPL_SANDBOX_MODE=vercel" }, { status: 409 });
  try {
    const { validateLab } = await import("@/lib/sandbox/session");
    const result = await validateLab(identity.id, mission.id);
    const configMatched = result.stdout.includes("config:pass");
    const permissionsSecure = result.stdout.includes("permissions:pass");
    const validated = result.exitCode === 0 && result.stdout.includes("CPL_VALIDATED");
    return NextResponse.json({
      validated,
      result,
      validators: { liveConfigMatched: configMatched, livePermissionsSecure: permissionsSecure, liveValidated: validated, configFixed: configMatched, permissionsFixed: permissionsSecure },
      evidence: validated ? {
        type: "validator",
        label: "Validated real Linux service recovery",
        skillIds: ["linux-service-config", "linux-permissions", "linux-observability", "independent-debugging"],
        score: 1,
        metadata: { live: true, provider: result.provider, validator: mission.liveValidator },
      } : null,
    });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "live validation failed" }, { status: 502 });
  }
}
