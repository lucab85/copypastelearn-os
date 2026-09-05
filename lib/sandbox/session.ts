import { createHash } from "node:crypto";
import { VercelSandboxProvider } from "./vercel";
import { redactSecrets } from "./redact";
import { missionFixtureCommand, missionWorkdir } from "./mission-fixtures";
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
  const fixture = missionFixtureCommand(missionId);
  if (fixture) {
    const initialized = await provider.execute(name, fixture);
    if (initialized.stdout.includes("fixture:initialized")) {
      await recordLabEvent({ identityId, missionId, sandboxName: name, eventType: "lab.fixture.initialized", stdout: redactSecrets(initialized.stdout), stderr: redactSecrets(initialized.stderr), exitCode: initialized.exitCode });
    }
  }
  await upsertLabSession({ identityId, missionId, sandboxName: name, provider: session.provider, status: session.status });
  await recordLabEvent({ identityId, missionId, sandboxName: name, eventType: "lab.session.ready" });
  return session;
}

export async function executeLab(identityId: string, missionId: string, command: string) {
  const name = sandboxName(identityId, missionId);
  const provider = new VercelSandboxProvider();
  await ensureLab(identityId, missionId);
  const workdir = missionWorkdir(missionId);
  const executable = workdir ? `cd ${workdir} && (${command})` : command;
  const result = await provider.execute(name, executable);
  const redacted = {
    ...result,
    stdout: redactSecrets(result.stdout),
    stderr: redactSecrets(result.stderr),
  };
  await upsertLabSession({ identityId, missionId, sandboxName: name, provider: result.provider, status: "ready" });
  await recordLabEvent({ identityId, missionId, sandboxName: name, eventType: "lab.command.executed", command: redactSecrets(command, 2_000), stdout: redacted.stdout, stderr: redacted.stderr, exitCode: result.exitCode });
  return redacted;
}

export async function validateLab(identityId: string, missionId: string) {
  const name = sandboxName(identityId, missionId);
  const workdir = missionWorkdir(missionId);
  if (!workdir) throw new Error("mission does not expose a live validator");
  const provider = new VercelSandboxProvider();
  await ensureLab(identityId, missionId);
  const result = await provider.execute(name, `cd ${workdir} && ./validate.sh`);
  const redacted = { ...result, stdout: redactSecrets(result.stdout), stderr: redactSecrets(result.stderr) };
  await recordLabEvent({ identityId, missionId, sandboxName: name, eventType: "lab.validator.completed", stdout: redacted.stdout, stderr: redacted.stderr, exitCode: redacted.exitCode });
  return redacted;
}

export async function resetLab(identityId: string, missionId: string) {
  const name = sandboxName(identityId, missionId);
  const workdir = missionWorkdir(missionId);
  if (!workdir) throw new Error("mission does not expose a resettable fixture");
  const provider = new VercelSandboxProvider();
  await provider.ensure(name);
  await provider.execute(name, `rm -rf ${workdir}`);
  const session = await ensureLab(identityId, missionId);
  await recordLabEvent({ identityId, missionId, sandboxName: name, eventType: "lab.fixture.reset" });
  return session;
}

export async function stopLab(identityId: string, missionId: string) {
  const name = sandboxName(identityId, missionId);
  const provider = new VercelSandboxProvider();
  const session = await provider.stop(name);
  await upsertLabSession({ identityId, missionId, sandboxName: name, provider: session.provider, status: session.status });
  await recordLabEvent({ identityId, missionId, sandboxName: name, eventType: "lab.session.stopped" });
  return session;
}
