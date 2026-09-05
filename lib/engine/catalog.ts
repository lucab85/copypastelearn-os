import type { MissionDefinition, SkillState } from "./types";

export const skillCatalog: SkillState[] = [
  { id: "docker-image", label: "Image construction", domain: "docker", mastery: 0.42, target: 0.8, evidence: 0, status: "learning" },
  { id: "container-runtime", label: "Container runtime", domain: "docker", mastery: 0.31, target: 0.8, evidence: 0, status: "learning", prerequisites: ["docker-image"] },
  { id: "container-networking", label: "Port & network model", domain: "docker", mastery: 0.22, target: 0.8, evidence: 0, status: "learning", prerequisites: ["container-runtime"] },
  { id: "service-health", label: "Production health checks", domain: "debugging", mastery: 0.18, target: 0.8, evidence: 0, status: "learning" },
  { id: "independent-debugging", label: "Independent debugging", domain: "debugging", mastery: 0.25, target: 0.8, evidence: 0, status: "learning" },
  { id: "k8s-workloads", label: "Kubernetes workloads", domain: "kubernetes", mastery: 0.28, target: 0.8, evidence: 0, status: "learning", prerequisites: ["container-runtime"] },
  { id: "k8s-services", label: "Kubernetes Services", domain: "kubernetes", mastery: 0.16, target: 0.8, evidence: 0, status: "learning", prerequisites: ["k8s-workloads", "container-networking"] },
  { id: "k8s-observability", label: "Kubernetes diagnosis", domain: "kubernetes", mastery: 0.12, target: 0.8, evidence: 0, status: "learning", prerequisites: ["k8s-workloads"] },
  { id: "terraform-config", label: "Terraform configuration", domain: "terraform", mastery: 0.36, target: 0.8, evidence: 0, status: "learning" },
  { id: "terraform-plan", label: "Plan reasoning", domain: "terraform", mastery: 0.2, target: 0.8, evidence: 0, status: "learning", prerequisites: ["terraform-config"] },
  { id: "terraform-state", label: "State & drift", domain: "terraform", mastery: 0.1, target: 0.8, evidence: 0, status: "learning", prerequisites: ["terraform-plan"] },
];

export const missions: MissionDefinition[] = [
  {
    id: "docker-production", slug: "docker-production", shortTitle: "Ship a container", title: "Ship a production container",
    description: "Build, run, expose and validate a real service path without passive checkboxes.",
    outcome: "Prove image → runtime → host boundary → health.", domain: "docker", difficulty: "Foundation", duration: "25 min", requiredEntitlement: "mission:docker-production", accent: "#c7ff54",
    starterLines: ["CPL workspace · node22 · docker27 · ready", "Target: make the API reachable at localhost:8080", "The engine grades evidence, not typed commands."],
    steps: [
      { id: "inspect", title: "Inspect", eyebrow: "01 / ORIENT", description: "Understand the repo and build contract.", skillIds: ["docker-image"] },
      { id: "build", title: "Build", eyebrow: "02 / ARTIFACT", description: "Create the application image.", skillIds: ["docker-image"] },
      { id: "run", title: "Run", eyebrow: "03 / RUNTIME", description: "Launch the service independently.", skillIds: ["container-runtime"] },
      { id: "expose", title: "Expose", eyebrow: "04 / BOUNDARY", description: "Publish the service to localhost:8080.", skillIds: ["container-networking"] },
      { id: "prove", title: "Prove", eyebrow: "05 / EVIDENCE", description: "Verify /health from outside the container.", skillIds: ["service-health", "independent-debugging"] },
    ],
  },
  {
    id: "k8s-recovery", slug: "k8s-recovery", shortTitle: "Recover Kubernetes", title: "Recover a broken Kubernetes service",
    description: "Diagnose a healthy-looking deployment that users still cannot reach.",
    outcome: "Find the broken selector, repair the Service and validate traffic.", domain: "kubernetes", difficulty: "Intermediate", duration: "35 min", requiredEntitlement: "mission:k8s-recovery", accent: "#72a7ff",
    starterLines: ["CPL cluster · kind · 3 nodes · incident injected", "Incident: checkout deployment is healthy, public traffic is failing", "Do not mutate before collecting evidence."],
    steps: [
      { id: "triage", title: "Triage", eyebrow: "01 / SIGNAL", description: "Inspect workloads and services.", skillIds: ["k8s-workloads", "k8s-observability"] },
      { id: "hypothesis", title: "Hypothesis", eyebrow: "02 / REASON", description: "Identify the traffic break.", skillIds: ["k8s-services", "independent-debugging"] },
      { id: "repair", title: "Repair", eyebrow: "03 / CHANGE", description: "Correct the service selector.", skillIds: ["k8s-services"] },
      { id: "verify", title: "Verify", eyebrow: "04 / PROVE", description: "Prove endpoints and HTTP traffic recover.", skillIds: ["k8s-services", "service-health"] },
    ],
  },
  {
    id: "terraform-drift", slug: "terraform-drift", shortTitle: "Resolve drift", title: "Detect and resolve Terraform drift",
    description: "A production security group changed outside Terraform. Understand the plan before applying anything.",
    outcome: "Detect drift, explain impact and restore declared state.", domain: "terraform", difficulty: "Production", duration: "30 min", requiredEntitlement: "mission:terraform-drift", accent: "#bd8cff",
    starterLines: ["CPL IaC workspace · Terraform 1.13 · AWS sandbox", "Signal: production security group differs from code", "Your first job is understanding, not applying."],
    steps: [
      { id: "inspect", title: "Inspect", eyebrow: "01 / CONFIG", description: "Read declared infrastructure.", skillIds: ["terraform-config"] },
      { id: "plan", title: "Plan", eyebrow: "02 / DIFF", description: "Generate and interpret the execution plan.", skillIds: ["terraform-plan"] },
      { id: "state", title: "State", eyebrow: "03 / EVIDENCE", description: "Confirm actual state and drift source.", skillIds: ["terraform-state", "independent-debugging"] },
      { id: "repair", title: "Reconcile", eyebrow: "04 / APPLY", description: "Restore the declared security posture.", skillIds: ["terraform-state"] },
    ],
  },
];

export function getMission(id?: string | null) {
  return missions.find((mission) => mission.id === id || mission.slug === id) ?? missions[0];
}
