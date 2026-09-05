export type KnowledgeUnit = { id: string; skillIds: string[]; title: string; body: string };

export const knowledgeUnits: KnowledgeUnit[] = [
  { id:"docker-networking-01", skillIds:["docker.networking","debugging.boundaries"], title:"Container port publishing", body:"A process listening inside a container is not automatically reachable from the host. Prove the process is listening, then prove the container port is published to the intended host port, then verify the HTTP boundary independently." },
  { id:"docker-image-01", skillIds:["docker.images"], title:"Build evidence before runtime", body:"A successful image build proves the Dockerfile can produce an image, not that the application is healthy. Treat image creation, container runtime state, network publication, and application health as separate evidence gates." },
  { id:"k8s-debug-01", skillIds:["k8s.troubleshooting","debugging.boundaries"], title:"Kubernetes diagnostic order", body:"Prefer inspection before mutation. Establish pod state, events, logs, service selectors/endpoints and network boundaries. A narrow falsifiable hypothesis produces stronger evidence than random restarts or edits." },
  { id:"terraform-drift-01", skillIds:["terraform.state","terraform.plan"], title:"Terraform drift reasoning", body:"State describes Terraform's last known mapping, while refresh/plan compares configuration, state and remote reality. Inspect state and plan before changing resources so remediation is based on evidence rather than assumption." },
];

export function searchKnowledge(query: string, skillIds: string[] = []) {
  const terms = query.toLowerCase().split(/\s+/).filter(Boolean);
  return knowledgeUnits
    .map(unit => ({ unit, score: unit.skillIds.filter(id=>skillIds.includes(id)).length * 3 + terms.filter(t => `${unit.title} ${unit.body}`.toLowerCase().includes(t)).length }))
    .filter(x=>x.score>0).sort((a,b)=>b.score-a.score).slice(0,4).map(x=>x.unit);
}
