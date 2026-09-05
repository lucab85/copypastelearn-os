import { randomUUID } from "node:crypto";
import { getDb } from "@/lib/server/db";

export async function upsertLabSession(input: { identityId: string; missionId: string; sandboxName: string; provider: string; status: string }) {
  const sql = getDb();
  if (!sql) return;
  await sql`insert into cpl_users(identity_id) values (${input.identityId}) on conflict(identity_id) do nothing`;
  await sql`
    insert into lab_sessions(identity_id, mission_id, sandbox_name, provider, status)
    values (${input.identityId}, ${input.missionId}, ${input.sandboxName}, ${input.provider}, ${input.status})
    on conflict(identity_id, mission_id) do update set
      sandbox_name = excluded.sandbox_name,
      provider = excluded.provider,
      status = excluded.status,
      last_seen_at = now()
  `;
}

export async function recordLabEvent(input: {
  identityId: string; missionId: string; sandboxName: string; eventType: string;
  command?: string; stdout?: string; stderr?: string; exitCode?: number;
}) {
  const sql = getDb();
  if (!sql) return;
  await sql`
    insert into lab_events(id, identity_id, mission_id, sandbox_name, event_type, command_redacted, stdout_redacted, stderr_redacted, exit_code)
    values (${randomUUID()}, ${input.identityId}, ${input.missionId}, ${input.sandboxName}, ${input.eventType}, ${input.command || null}, ${input.stdout || null}, ${input.stderr || null}, ${input.exitCode ?? null})
  `;
}
