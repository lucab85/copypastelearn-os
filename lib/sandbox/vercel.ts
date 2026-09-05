import { Sandbox } from "@vercel/sandbox";
import type { SandboxExecution, SandboxProvider, SandboxSession } from "./provider";

const SNAPSHOT_TTL = 7 * 24 * 60 * 60 * 1000;

export class VercelSandboxProvider implements SandboxProvider {
  async ensure(name: string): Promise<SandboxSession> {
    try {
      await Sandbox.get({ name });
    } catch {
      await Sandbox.create({ name, snapshotExpiration: SNAPSHOT_TTL, timeout: 45 * 60 * 1000 });
    }
    return { name, provider: "vercel-sandbox", status: "ready" };
  }

  async execute(name: string, command: string): Promise<SandboxExecution> {
    await this.ensure(name);
    const sandbox = await Sandbox.get({ name });
    const result = await sandbox.runCommand("sh", ["-lc", command]);
    return { stdout: await result.stdout(), stderr: await result.stderr(), exitCode: result.exitCode, provider: "vercel-sandbox" };
  }

  async stop(name: string): Promise<SandboxSession> {
    const sandbox = await Sandbox.get({ name });
    await sandbox.stop();
    return { name, provider: "vercel-sandbox", status: "stopped" };
  }
}
