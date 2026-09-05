export type SandboxSession = { name: string; provider: string; status: "ready" | "stopped" };
export type SandboxExecution = { stdout: string; stderr: string; exitCode: number; provider: string };

export interface SandboxProvider {
  ensure(name: string): Promise<SandboxSession>;
  execute(name: string, command: string): Promise<SandboxExecution>;
  stop(name: string): Promise<SandboxSession>;
}
