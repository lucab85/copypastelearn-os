# CopyPasteLearn OS architecture

## Product-owned core

1. Skill Graph — prerequisites, mastery, confidence and later skill decay.
2. Evidence Engine — deterministic execution evidence plus scored explanations.
3. Sandbox Telemetry — redacted execution events from durable isolated learner environments.
4. Adaptive Planner — constrained next-best-action selection.
5. Context / Knowledge — goal + mission + skill state + evidence + curated CPL material.

```text
Clerk identity ───────────────┐
Medusa commerce ──────────────┼────> CPL Entitlements
                              │             │
                              ▼             ▼
                     PostgreSQL CPL Core ─────────────┐
                    /        │        \               │
             Evidence    Skill Graph   Mission Runs   │
                │            │             │           │
                └────────────┼─────────────┘           │
                             ▼                         │
                       Adaptive Planner                │
                        /            \                 │
                 AI Coach          LabSession <────────┘
                                      │
                                      ▼
                            Named Vercel Sandbox
                            + redacted telemetry
```

## Durable LabSession

A LabSession is keyed by `(identity_id, mission_id)`. CPL derives an opaque named sandbox, resumes it across HTTP requests, and stores only redacted telemetry. Provider lifecycle is separate from the learning evaluator.

Current real sandbox API:

- `POST /api/labs/session` — create/resume
- `POST /api/labs/exec` — execute in the named session
- `DELETE /api/labs/session` — stop/snapshot according to provider policy

Alpha 4 keeps mission grading deterministic because a generic Linux sandbox is not automatically equivalent to a Docker daemon, Kubernetes cluster or Terraform cloud environment. The next lab slice installs mission-specific images/snapshots and server-side validators, then routes validated real-lab evidence into the same Evidence Engine.

## Commerce boundary

CPL storefront uses Medusa's Store API. Clerk identity is written into **line-item metadata**, which survives onto order items. A Medusa `order.placed` subscriber reads order-item identity + product entitlement metadata and sends a signed idempotent event to CPL Core.

## Non-negotiable rules

- Identity never owns learning state.
- Commerce never owns learning state.
- LLMs never write mastery or entitlements.
- Sandbox stdout is never persisted before redaction.
- Deterministic validators remain the source of grading truth.
