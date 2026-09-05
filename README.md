# CopyPasteLearn OS

AI-native technical learning: goals become missions, execution becomes evidence, and evidence updates a durable skill graph.

## Alpha 5

- Wow landing, Command Center, mission catalog, skill graph and entitlement-aware library
- Docker, Kubernetes and Terraform mission engine with deterministic validators
- **First real validated mission:** `linux-service-recovery` runs in a durable Vercel Sandbox, injects real config drift, and grades the actual filesystem state with a server-side validator
- Live Linux evidence flows into the same mission timeline, mastery calculation and shared skill graph as simulator evidence
- Local-first progress plus optional PostgreSQL cloud sync
- **Normalized learning records:** `user_skills`, `skill_evidence`, and `mission_runs` are materialized on sync, not only stored as a JSON blob
- Clerk identity with demo fallback and protected application routes when configured
- Medusa Store API products, real cart/add-item/complete endpoints, and an `order.placed` entitlement bridge
- Medusa line-item metadata carries the Clerk identity into the order item so the bridge is explicit and idempotent
- AI SDK `ToolLoopAgent` for Coach / Reviewer / Incident with read-only learning tools
- Curated CPL knowledge retrieval tool
- **Durable LabSession:** named persistent Vercel Sandbox per Clerk user + mission, start/resume/exec/stop APIs, redacted telemetry, and a Live Lab drawer in the workspace
- Goal intake now understands Linux alongside Docker, Kubernetes and Terraform and ranks missions from goal + role + mastery + prerequisites
- Strict mission-ID validation on real lab APIs
- CI typecheck + production Next build

## Run

```bash
npm install
npm run dev
```

No integration is mandatory. Without credentials the app deliberately falls back to demo identity, localStorage, local catalog, deterministic coaching, and simulated mission environments.

## PostgreSQL

```bash
psql "$DATABASE_URL" -f db/schema.sql
```

Set `DATABASE_URL`. CPL then syncs the local-first progress snapshot and separately materializes normalized mastery, evidence, mission-run, entitlement, lab-session and lab-event records.

## Clerk

Set `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` and `CLERK_SECRET_KEY`. `proxy.ts` protects `/dashboard`, `/workspace`, and `/skills` only when Clerk is configured.

## Medusa v2

Set:

```env
MEDUSA_BACKEND_URL=
NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY=
MEDUSA_REGION_ID=
MEDUSA_WEBHOOK_SECRET=
```

Copy `medusa-extension/src/subscribers/order-placed.ts` into your Medusa backend. Product metadata `cpl_entitlement` determines what is granted. CPL adds `cpl_identity_id` to line-item metadata. When Medusa places the order, the subscriber normalizes the purchase into an idempotent CPL entitlement event.

The current storefront supports product loading, cart creation, line-item insertion and cart completion. Shipping/payment UI remains provider-specific and is the next commerce UI slice; Medusa returns the missing checkout requirement if completion isn't yet possible.

## AI Coach

Set `AI_GATEWAY_API_KEY`; `AI_MODEL` defaults to `openai/gpt-5.6-luna`. AI runs only for authenticated Clerk users. The agent can inspect mission, skills, evidence, planner state and CPL knowledge. It cannot mutate mastery, entitlements or mission completion.

## Durable Vercel labs

Set `CPL_SANDBOX_MODE=vercel`. On Vercel, Sandbox authenticates using the platform identity/OIDC path. CPL derives one opaque named sandbox from `Clerk identity + mission`, resumes it across requests, and records only redacted command/output telemetry.

The **Recover a broken Linux service config** mission is the first end-to-end live grading path. Starting its Live Lab creates an idempotent incident fixture under `/vercel/sandbox/cpl-mission` with `desired.env`, a drifted `runtime.env`, `service.log`, and `validate.sh`. The learner repairs the actual files and permissions. `POST /api/labs/validate` runs the deterministic validator inside the same sandbox; only a passing validator emits score-1 live evidence and can complete the mission.

Other missions still use the deterministic simulators for grading while their real Docker/Kubernetes/Terraform environment contracts are being added.

## Architectural rule

**Clerk identifies. Medusa sells. CPL Core decides access, evidence, mastery and the next learning action. AI coaches but does not grade. Sandboxes execute but do not decide learning outcomes.**
