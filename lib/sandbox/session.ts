import { createHash } from "node:crypto";
import { VercelSandboxProvider } from "./vercel";
import { redactSecrets } from "./redact";
import { recordLabEvent, upsertLabSession } from "@/lib/server/lab-store";

function sandboxName(identityId: string, missionId: string) {
  const digest = createHash("sha256").update(`${identityId}:${missionId}`).digest("hex").slice(0, 24);
  return `cpl-${digest}`;
}

export function realLabsEnabled() { return process.env.CPL_SANDBOX_MODE === "vercel"; }

export async function ensureLab(identityId: string, missionId: string) {
  const name = sandboxName(identityId, missionId);
  const provider = new VercelSandboxProvider();
  const session = await provider.ensure(name);
  await upsertLabSession({ identityId, missionId, sandboxName: name, provider: session.provider, status: session.status });
  await recordLabEvent({ identityId, missionId, sandboxName: name, eventType: "lab.session.ready" });
  return session;
}

export async function executeLab(identityId: string, missionId: string, command: string) {
  const name = sandboxName(identityId, missionId);
  const provider = new VercelSandboxProvider();
  const result = await provider.execute(name, command);
  const redacted = {
    ...result,
    stdout: redactSecrets(result.stdout),
    stderr: redactSecrets(result.stderr),
  };
  await upsertLabSession({ identityId, missionId, sandboxName: name, provider: result.provider, status: "ready" });
  await recordLabEvent({ identityId, missionId, sandboxName: name, eventType: "lab.command.executed", command: redactSecrets(command, 2_000), stdout: redacted.stdout, stderr: redacted.stderr, exitCode: result.exitCode });
  return redacted;
}

export async function stopLab(identityId: string, missionId: string) {
  const name = sandboxName(identityId, missionId);
  const provider = new VercelSandboxProvider();
  const session = await provider.stop(name);
  await upsertLabSession({ identityId, missionId, sandboxName: name, provider: session.provider, status: session.status });
  await recordLabEvent({ identityId, missionId, sandboxName: name, eventType: "lab.session.stopped" });
  return session;
}
