import { NextResponse } from "next/server";
import { grantEntitlements } from "@/lib/server/progress-store";
import { getDb } from "@/lib/server/db";

export async function POST(request: Request) {
  const expected = process.env.MEDUSA_WEBHOOK_SECRET;
  if (!expected) return NextResponse.json({ error: "MEDUSA_WEBHOOK_SECRET not configured" }, { status: 503 });
  const supplied = request.headers.get("x-cpl-webhook-secret") || request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (supplied !== expected) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const body = await request.json() as { event_id: string; event_type?: string; order_id: string; identity_id: string; entitlements: string[] };
  if (!body.event_id || !body.order_id || !body.identity_id || !Array.isArray(body.entitlements)) return NextResponse.json({ error: "invalid event" }, { status: 400 });
  const sql = getDb();
  if (sql) {
    const duplicate = await sql<{ event_id: string }[]>`select event_id from commerce_events where event_id=${body.event_id} limit 1`;
    if (duplicate.length) return NextResponse.json({ ok: true, duplicate: true });
  }
  const grant = await grantEntitlements({ identityId: body.identity_id, keys: body.entitlements, source: "medusa", externalId: body.order_id });
  if (sql) await sql`insert into commerce_events(event_id,event_type,payload) values (${body.event_id}, ${body.event_type || "order.placed"}, ${sql.json(body)}) on conflict(event_id) do nothing`;
  return NextResponse.json({ ok: true, ...grant });
}
