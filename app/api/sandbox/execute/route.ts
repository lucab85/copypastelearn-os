import { NextResponse } from "next/server";
import { getIdentity } from "@/lib/integrations/auth";

/** @deprecated Prefer /api/labs/session + /api/labs/exec. Kept for alpha-3 compatibility. */
export async function POST(request: Request) {
  const body = await request.json().catch(() => null) as { command?: string; missionId?: string } | null;
  if (!body?.command) return NextResponse.json({ error: "command required" }, { status: 400 });
  if (process.env.CPL_SANDBOX_MODE !== "vercel") return NextResponse.json({ mode: "simulated", executed: false, message: "Set CPL_SANDBOX_MODE=vercel to enable isolated execution." });
  const identity = await getIdentity();
  if (!identity.authenticated) return NextResponse.json({ error: "real sandbox execution requires an authenticated Clerk user" }, { status: 401 });
  try {
    const { executeLab } = await import("@/lib/sandbox/session");
    const missionId = body.missionId || "docker-production";
    return NextResponse.json({ mode: "real", executed: true, ...(await executeLab(identity.id, missionId, body.command)) });
  } catch (error) {
    return NextResponse.json({ mode: "real", executed: false, error: error instanceof Error ? error.message : "sandbox error" }, { status: 502 });
  }
}
