import { getMission, skillCatalog } from "./catalog";
import type { EngineState, EvaluationResult, SkillState } from "./types";

function ev(label: string, skillIds: string[], score: number, type: "validator" | "incident" | "command" = "validator") {
  return { type, label, skillIds, score } as const;
}

function evaluateDocker(command: string, current: EngineState): EvaluationResult {
  const normalized = command.trim().toLowerCase();
  const validators = { ...current.validators };
  const output: string[] = [];
  let evidence: EvaluationResult["evidence"];
  let coachSignal: EvaluationResult["coachSignal"] = "progress";
  if (normalized === "help") return { validators, output: ["Useful tools: ls, cat, docker build/run/ps/logs/inspect, curl", "Try collecting evidence before asking the coach for the answer."], coachSignal };
  if (normalized === "ls" || normalized === "ls -la") { validators.inspected = true; output.push("Dockerfile  package.json  src/  README.md"); evidence = ev("Inspected workspace before changing state", ["docker-image", "independent-debugging"], .55, "command"); }
  else if (normalized.includes("cat dockerfile")) { validators.inspected = true; output.push("FROM node:22-alpine\nWORKDIR /app\nCOPY . .\nRUN npm ci --omit=dev\nEXPOSE 3000\nCMD [\"node\", \"src/server.js\"]"); evidence = ev("Inspected container build definition", ["docker-image"], .75, "command"); }
  else if (normalized.startsWith("docker build")) { validators.imageBuilt = true; output.push("[+] Building 4.8s (8/8) FINISHED", " => naming to docker.io/library/cpl-api:latest"); evidence = ev("Built application image", ["docker-image"], 1); }
  else if (normalized.startsWith("docker images")) output.push(validators.imageBuilt ? "cpl-api   latest   74c97a15d91a   38.1MB" : "REPOSITORY   TAG   IMAGE ID   SIZE");
  else if (normalized.startsWith("docker run")) {
    if (!validators.imageBuilt) { output.push("Unable to find image 'cpl-api:latest' locally", "docker: Error response from daemon: pull access denied for cpl-api."); coachSignal = "misconception"; }
    else { validators.containerRunning = true; validators.portMapped = normalized.includes("8080:3000"); output.push("6d39c82f4bd1a4b91f84ef31b2c19a92"); if (!validators.portMapped) output.push("Container is running, but no host port is published."); evidence = ev(validators.portMapped ? "Launched runtime with explicit host boundary" : "Launched runtime; networking unresolved", ["container-runtime", "container-networking"], validators.portMapped ? 1 : .5); }
  }
  else if (normalized.startsWith("docker ps")) { output.push(validators.containerRunning ? `CONTAINER ID   IMAGE      STATUS         PORTS\n6d39c82f4bd1   cpl-api    Up 18 seconds   ${validators.portMapped ? "0.0.0.0:8080->3000/tcp" : "3000/tcp"}` : "CONTAINER ID   IMAGE   STATUS   PORTS"); evidence = ev("Inspected runtime state", ["container-runtime", "independent-debugging"], .72, "command"); }
  else if (normalized.startsWith("docker logs")) { output.push(validators.containerRunning ? "CPL API listening on 0.0.0.0:3000\nhealth endpoint: /health" : "Error: No such container"); if (validators.containerRunning) evidence = ev("Used logs to test a runtime hypothesis", ["independent-debugging"], .9, "command"); }
  else if (normalized.startsWith("docker inspect")) { output.push(validators.containerRunning ? `[{"State":{"Status":"running"},"NetworkSettings":{"Ports":{"3000/tcp":${validators.portMapped ? '[{"HostPort":"8080"}]' : "null"}}}}]` : "[]"); evidence = ev("Inspected runtime configuration directly", ["container-runtime", "container-networking", "independent-debugging"], .82, "command"); }
  else if (normalized.startsWith("curl")) { if (validators.containerRunning && validators.portMapped) { validators.healthVerified = true; output.push('{"status":"ok","service":"cpl-api","version":"1.0.0"}'); evidence = ev("Verified service health from host boundary", ["service-health", "container-networking"], 1); coachSignal = "complete"; } else { output.push("curl: (7) Failed to connect to localhost port 8080: Connection refused"); if (validators.containerRunning) { evidence = ev("Detected host/container boundary failure", ["container-networking", "independent-debugging"], .78); coachSignal = "debug"; } } }
  else if (normalized === "inject incident") { validators.portMapped = false; validators.healthVerified = false; current.incidentMode = true; output.push("INCIDENT injected: host port publication removed from runtime"); evidence = ev("Accepted an incident challenge", ["independent-debugging"], .65, "incident"); }
  else if (normalized === "clear") output.push("__CLEAR__");
  else output.push(`bash: ${command.split(" ")[0]}: command not found or unavailable in this sandbox`);
  return { validators, output, evidence, coachSignal };
}

function evaluateKubernetes(command: string, current: EngineState): EvaluationResult {
  const c = command.trim().toLowerCase(); const validators = { ...current.validators }; const output: string[] = []; let evidence: EvaluationResult["evidence"]; let coachSignal: EvaluationResult["coachSignal"] = "progress";
  if (c === "help") return { validators, output: ["Useful tools: kubectl get/describe/logs/patch, curl", "The deployment is healthy. Traffic is not."], coachSignal };
  if (c.startsWith("kubectl get pods")) { validators.podsInspected = true; output.push("NAME                       READY   STATUS    RESTARTS\ncheckout-7d9f6f78d9-k2l8p   1/1     Running   0\ncheckout-7d9f6f78d9-rm4cx   1/1     Running   0"); evidence = ev("Checked workload health before mutation", ["k8s-workloads", "k8s-observability", "independent-debugging"], .9, "command"); }
  else if (c.startsWith("kubectl get svc") || c.startsWith("kubectl get service")) { validators.serviceInspected = true; output.push("NAME       TYPE        CLUSTER-IP     PORT(S)\ncheckout   ClusterIP   10.96.81.22    80/TCP"); evidence = ev("Inspected service boundary", ["k8s-services", "k8s-observability"], .8, "command"); }
  else if (c.includes("get endpoints") || c.includes("get ep")) { validators.endpointsInspected = true; output.push(validators.selectorFixed ? "checkout   10.244.1.17:8080,10.244.2.11:8080" : "checkout   <none>"); evidence = ev(validators.selectorFixed ? "Confirmed endpoints recovered" : "Found Service with zero endpoints", ["k8s-services", "independent-debugging"], 1); coachSignal = validators.selectorFixed ? "progress" : "debug"; }
  else if (c.startsWith("kubectl describe svc") || c.startsWith("kubectl describe service")) { validators.selectorInspected = true; output.push("Name: checkout\nSelector: app=checkot\nPort: 80/TCP\nTargetPort: 8080/TCP\nEndpoints: <none>"); evidence = ev("Located selector mismatch", ["k8s-services", "k8s-observability", "independent-debugging"], 1); coachSignal = "debug"; }
  else if (c.startsWith("kubectl logs")) { output.push("server ready on :8080\nGET /health 200"); evidence = ev("Ruled out application failure using logs", ["k8s-observability", "independent-debugging"], .88, "command"); }
  else if ((c.startsWith("kubectl patch") || c.startsWith("kubectl edit")) && (c.includes("checkout") || c.includes("checkot"))) { if (!validators.selectorInspected && !validators.endpointsInspected) { output.push("service/checkout patched", "CPL note: change succeeded, but evidence quality is low because no hypothesis was established first."); evidence = ev("Repaired service before establishing evidence", ["k8s-services"], .55); } else { output.push("service/checkout patched"); evidence = ev("Repaired confirmed selector mismatch", ["k8s-services", "independent-debugging"], 1); } validators.selectorFixed = true; }
  else if (c.startsWith("curl")) { if (validators.selectorFixed) { validators.trafficVerified = true; output.push('{"status":"ok","service":"checkout"}'); evidence = ev("Verified traffic after repair", ["k8s-services", "service-health"], 1); coachSignal = "complete"; } else { output.push("curl: (7) Failed to connect to checkout:80"); coachSignal = "debug"; } }
  else if (c === "clear") output.push("__CLEAR__"); else output.push(`bash: ${command.split(" ")[0]}: command not found or unavailable in this cluster lab`);
  return { validators, output, evidence, coachSignal };
}

function evaluateTerraform(command: string, current: EngineState): EvaluationResult {
  const c = command.trim().toLowerCase(); const validators = { ...current.validators }; const output: string[] = []; let evidence: EvaluationResult["evidence"]; let coachSignal: EvaluationResult["coachSignal"] = "progress";
  if (c === "help") return { validators, output: ["Useful tools: ls, cat main.tf, terraform plan/show/state/apply", "Understand the proposed change before applying."], coachSignal };
  if (c === "ls" || c === "ls -la") { output.push("main.tf  variables.tf  outputs.tf  terraform.tfstate"); evidence = ev("Inspected IaC workspace", ["terraform-config", "independent-debugging"], .55, "command"); }
  else if (c.includes("cat main.tf")) { validators.configInspected = true; output.push('resource "aws_security_group_rule" "api_https" {\n  type = "ingress"\n  from_port = 443\n  to_port = 443\n  cidr_blocks = ["10.0.0.0/8"]\n}'); evidence = ev("Read declared security posture", ["terraform-config"], .9, "command"); }
  else if (c.startsWith("terraform plan")) { validators.planGenerated = true; output.push("Terraform will perform the following actions:\n  ~ aws_security_group_rule.api_https\n      cidr_blocks: [\"0.0.0.0/0\"] -> [\"10.0.0.0/8\"]\n\nPlan: 0 to add, 1 to change, 0 to destroy."); evidence = ev("Generated plan exposing external drift", ["terraform-plan", "terraform-state"], 1); coachSignal = "debug"; }
  else if (c.startsWith("terraform state show")) { validators.stateInspected = true; output.push('cidr_blocks = ["0.0.0.0/0"]\nfrom_port = 443\nto_port = 443'); evidence = ev("Confirmed state drift against declaration", ["terraform-state", "independent-debugging"], 1); }
  else if (c.startsWith("terraform show")) { validators.stateInspected = true; output.push("# aws_security_group_rule.api_https:\ncidr_blocks = [\"0.0.0.0/0\"]"); evidence = ev("Inspected recorded infrastructure state", ["terraform-state"], .85, "command"); }
  else if (c.startsWith("terraform apply")) { if (!validators.planGenerated) { output.push("CPL GUARD: apply blocked — no reviewed plan evidence in this mission."); evidence = ev("Attempted unreviewed production apply", ["terraform-plan"], .2); coachSignal = "misconception"; } else { validators.driftReconciled = true; output.push("Apply complete! Resources: 0 added, 1 changed, 0 destroyed.", "api_https cidr restored to 10.0.0.0/8"); evidence = ev("Reconciled confirmed drift", ["terraform-state", "terraform-plan"], 1); coachSignal = "complete"; } }
  else if (c === "clear") output.push("__CLEAR__"); else output.push(`bash: ${command.split(" ")[0]}: command not found or unavailable in this IaC lab`);
  return { validators, output, evidence, coachSignal };
}

export function evaluateCommand(command: string, current: EngineState): EvaluationResult {
  const mission = getMission(current.missionId);
  if (mission.domain === "kubernetes") return evaluateKubernetes(command, current);
  if (mission.domain === "terraform") return evaluateTerraform(command, current);
  return evaluateDocker(command, current);
}

export function isMissionComplete(state: EngineState) {
  const mission = getMission(state.missionId);
  if (mission.domain === "docker") return !!state.validators.healthVerified;
  if (mission.domain === "kubernetes") return !!state.validators.trafficVerified;
  return !!state.validators.driftReconciled;
}

export function deriveSkills(state: EngineState, persisted: Record<string, number> = {}): SkillState[] {
  const evidence = state.evidence;
  return skillCatalog.map((skill) => {
    const relevant = evidence.filter((item) => item.skillIds.includes(skill.id));
    const strongest = relevant.reduce((best, item) => Math.max(best, item.score), 0);
    const cumulative = Math.min(.32, relevant.reduce((sum, item) => sum + item.score * .07, 0));
    const base = Math.max(skill.mastery, persisted[skill.id] ?? 0);
    const mastery = Math.min(.98, Math.max(base, strongest ? .42 + strongest * .42 + cumulative : base));
    const prereqs = skill.prerequisites ?? [];
    const locked = prereqs.some((id) => (persisted[id] ?? skillCatalog.find((s) => s.id === id)?.mastery ?? 0) < .45);
    return { ...skill, mastery, evidence: relevant.length, status: locked ? "locked" : mastery >= skill.target ? "mastered" : "learning" };
  });
}

export function nextBestAction(state: EngineState) {
  const mission = getMission(state.missionId); const v = state.validators;
  if (mission.domain === "docker") {
    if (!v.inspected && !v.imageBuilt) return { step: "inspect", title: "Orient before acting", detail: "Inspect the repository or Dockerfile and establish the build contract." };
    if (!v.imageBuilt) return { step: "build", title: "Create the artifact", detail: "Build an image named cpl-api from the repository." };
    if (!v.containerRunning) return { step: "run", title: "Launch the service", detail: "Turn the image into a running process." };
    if (!v.portMapped) return { step: "expose", title: "Cross the boundary", detail: "Make container port 3000 reachable at localhost:8080." };
    if (!v.healthVerified) return { step: "prove", title: "Prove it works", detail: "Validate /health from outside the container." };
  }
  if (mission.domain === "kubernetes") {
    if (!v.podsInspected || !v.serviceInspected) return { step: "triage", title: "Collect signals", detail: "Inspect workloads and the Service before changing anything." };
    if (!v.selectorInspected && !v.endpointsInspected) return { step: "hypothesis", title: "Trace the traffic path", detail: "Find why the healthy workload has no reachable backend." };
    if (!v.selectorFixed) return { step: "repair", title: "Repair the confirmed fault", detail: "Correct the checkout Service selector." };
    if (!v.trafficVerified) return { step: "verify", title: "Prove recovery", detail: "Verify endpoints, then probe the checkout service." };
  }
  if (mission.domain === "terraform") {
    if (!v.configInspected) return { step: "inspect", title: "Read declared state", detail: "Inspect main.tf before looking at proposed mutations." };
    if (!v.planGenerated) return { step: "plan", title: "Make drift visible", detail: "Generate a Terraform plan and understand the delta." };
    if (!v.stateInspected) return { step: "state", title: "Confirm the source of truth", detail: "Inspect the recorded state to confirm the drift." };
    if (!v.driftReconciled) return { step: "repair", title: "Reconcile deliberately", detail: "Apply the reviewed plan to restore the declared posture." };
  }
  return { step: "complete", title: "Mission validated", detail: "Evidence is committed. The planner can now recommend your next skill gap." };
}

export function suggestedNextMission(completed: string[]) {
  if (!completed.includes("docker-production")) return getMission("docker-production");
  if (!completed.includes("k8s-recovery")) return getMission("k8s-recovery");
  return getMission("terraform-drift");
}
