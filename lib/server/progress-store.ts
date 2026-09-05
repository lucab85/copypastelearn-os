import type { UserProgress } from "@/lib/engine/types";
import { getDb } from "@/lib/server/db";

export async function loadProgress(identityId: string): Promise<UserProgress | null> {
  const sql = getDb();
  if (!sql) return null;
  const rows = await sql<{ payload: UserProgress }[]>`
    select payload from user_progress where identity_id = ${identityId} limit 1
  `;
  return rows[0]?.payload ?? null;
}

export async function saveProgress(identityId: string, progress: UserProgress) {
  const sql = getDb();
  if (!sql) return { persisted: false as const };

  const evidenceCounts: Record<string, number> = {};
  for (const state of Object.values(progress.missionStates)) {
    for (const item of state.evidence) {
      for (const skillId of item.skillIds) evidenceCounts[skillId] = (evidenceCounts[skillId] || 0) + 1;
    }
  }

  await sql.begin(async (tx) => {
    await tx`
      insert into cpl_users(identity_id) values (${identityId})
      on conflict(identity_id) do update set updated_at = now()
    `;
    await tx`
      insert into user_progress(identity_id, payload) values (${identityId}, ${tx.json(progress)})
      on conflict(identity_id) do update set payload = excluded.payload, updated_at = now()
    `;

    for (const [skillId, mastery] of Object.entries(progress.skillMastery)) {
      const count = evidenceCounts[skillId] || 0;
      const confidence = Math.min(1, 0.3 + count * 0.18);
      await tx`
        insert into user_skills(identity_id, skill_id, mastery, confidence, evidence_count, last_proven_at)
        values (${identityId}, ${skillId}, ${mastery}, ${confidence}, ${count}, ${count ? new Date() : null})
        on conflict(identity_id, skill_id) do update set
          mastery = greatest(user_skills.mastery, excluded.mastery),
          confidence = excluded.confidence,
          evidence_count = excluded.evidence_count,
          last_proven_at = coalesce(excluded.last_proven_at, user_skills.last_proven_at),
          updated_at = now()
      `;
    }

    for (const [missionId, state] of Object.entries(progress.missionStates)) {
      const complete = progress.completedMissions.includes(missionId);
      await tx`
        insert into mission_runs(identity_id, mission_id, state, completed_at)
        values (${identityId}, ${missionId}, ${tx.json(state)}, ${complete ? new Date() : null})
        on conflict(identity_id, mission_id) do update set
          state = excluded.state,
          completed_at = coalesce(mission_runs.completed_at, excluded.completed_at),
          updated_at = now()
      `;
      for (const item of state.evidence) {
        await tx`
          insert into skill_evidence(id, identity_id, mission_id, skill_ids, evidence_type, label, score, metadata, created_at)
          values (${item.id}, ${identityId}, ${missionId}, ${item.skillIds}, ${item.type}, ${item.label}, ${item.score}, ${tx.json(item.metadata || {})}, ${new Date(item.timestamp)})
          on conflict(id) do nothing
        `;
      }
    }
  });
  return { persisted: true as const };
}

export async function listEntitlements(identityId: string): Promise<string[]> {
  const sql = getDb();
  if (!sql) return [];
  const rows = await sql<{ entitlement_key: string }[]>`
    select entitlement_key from entitlements where identity_id = ${identityId} order by granted_at asc
  `;
  return rows.map((row) => row.entitlement_key);
}

export async function grantEntitlements(input: {
  identityId: string;
  keys: string[];
  source: string;
  externalId?: string;
}) {
  const sql = getDb();
  if (!sql) return { persisted: false as const, granted: input.keys };
  await sql.begin(async (tx) => {
    await tx`insert into cpl_users(identity_id) values (${input.identityId}) on conflict(identity_id) do nothing`;
    for (const key of input.keys) {
      await tx`
        insert into entitlements(identity_id, entitlement_key, source, external_id)
        values (${input.identityId}, ${key}, ${input.source}, ${input.externalId ?? null})
        on conflict(identity_id, entitlement_key) do nothing
      `;
    }
  });
  return { persisted: true as const, granted: input.keys };
}
