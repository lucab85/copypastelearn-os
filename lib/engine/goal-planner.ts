import { missions, skillCatalog } from "./catalog";

export type GoalPlanInput = {
  goal: string;
  role?: string;
  experience?: "new" | "hands-on" | "production";
  mastery?: Record<string, number>;
  completedMissions?: string[];
};

export type GoalPlan = {
  missionId: string;
  confidence: number;
  entryMode: "guided" | "challenge";
  rationale: string;
  skillGaps: Array<{ id: string; label: string; current: number; target: number; gap: number }>;
  missingPrerequisites: Array<{ id: string; label: string; current: number }>;
  alternatives: Array<{ missionId: string; title: string; score: number }>;
};

const domainTerms: Record<string, string[]> = {
  linux: ["linux","systemd","service","permissions","chmod","logs","shell","server","operations","sysadmin"],
  docker: ["docker","container","containers","image","images","containerize","containerise"],
  kubernetes: ["kubernetes","k8s","cluster","helm","pod","pods","service mesh","platform engineer","platform engineering"],
  terraform: ["terraform","iac","infrastructure as code","drift","state","hcl","cloud infrastructure"],
};

const roleBias: Record<string, Record<string, number>> = {
  "platform engineer": { linux: .45, kubernetes: 1.2, docker: .7, terraform: .8 },
  sre: { linux: .8, kubernetes: 1, docker: .5, terraform: .55 },
  devops: { linux: .65, docker: .8, kubernetes: .75, terraform: .75 },
  "cloud engineer": { linux: .4, terraform: 1.1, kubernetes: .55, docker: .4 },
  "backend engineer": { linux: .7, docker: .7, kubernetes: .35, terraform: .2 },
};

function uniqueSkills(missionId: string) {
  const mission = missions.find(m=>m.id===missionId)!;
  return Array.from(new Set(mission.steps.flatMap(step=>step.skillIds)));
}

export function planGoal(input: GoalPlanInput): GoalPlan {
  const text = `${input.goal} ${input.role || ""}`.toLowerCase();
  const mastery = input.mastery || {};
  const completed = new Set(input.completedMissions || []);
  const scored = missions.map(mission => {
    const required = uniqueSkills(mission.id);
    const gaps = required.map(id => {
      const skill = skillCatalog.find(s=>s.id===id)!;
      const current = mastery[id] ?? skill.mastery;
      return Math.max(0, skill.target - current);
    });
    const gapSignal = gaps.reduce((a,b)=>a+b,0) / Math.max(1,gaps.length);
    const lexical = (domainTerms[mission.domain] || []).reduce((score,term)=>score + (text.includes(term) ? 1 : 0),0);
    const role = roleBias[(input.role || "").toLowerCase()]?.[mission.domain] || 0;
    const completionPenalty = completed.has(mission.id) ? 2 : 0;
    const foundationBonus = mission.domain === "linux" ? .18 : mission.domain === "docker" ? .14 : 0;
    return { mission, score: lexical * 1.6 + role + gapSignal + foundationBonus - completionPenalty };
  }).sort((a,b)=>b.score-a.score);

  const winner = scored[0].mission;
  const required = uniqueSkills(winner.id);
  const skillGaps = required.map(id=>{
    const skill=skillCatalog.find(s=>s.id===id)!; const current=mastery[id]??skill.mastery;
    return {id,label:skill.label,current,target:skill.target,gap:Math.max(0,skill.target-current)};
  }).sort((a,b)=>b.gap-a.gap);
  const prereqIds = Array.from(new Set(required.flatMap(id=>skillCatalog.find(s=>s.id===id)?.prerequisites||[])));
  const missingPrerequisites = prereqIds.map(id=>{const skill=skillCatalog.find(s=>s.id===id)!;return{id,label:skill.label,current:mastery[id]??skill.mastery};}).filter(x=>x.current<.55);
  const lead = scored[0].score - (scored[1]?.score ?? 0);
  const confidence = Math.min(.97, .55 + Math.max(0, lead) * .08 + (text.length>18?.08:0));
  const entryMode = input.experience === "production" && missingPrerequisites.length === 0 ? "challenge" : "guided";
  const topGap = skillGaps[0];
  const rationale = missingPrerequisites.length
    ? `Your goal points to ${winner.domain}, but the graph shows ${missingPrerequisites.length} prerequisite gap${missingPrerequisites.length===1?"":"s"}. Start with ${winner.shortTitle}; the planner will remediate prerequisites as evidence comes in.`
    : `Best next proof for this goal: ${winner.shortTitle}. Your largest current gap is ${topGap?.label || "mission execution"}, so the plan starts there instead of replaying mastered material.`;
  return { missionId:winner.id, confidence, entryMode, rationale, skillGaps, missingPrerequisites, alternatives:scored.slice(1,3).map(x=>({missionId:x.mission.id,title:x.mission.title,score:Math.max(0,x.score)})) };
}
