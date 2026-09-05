"use client";
import Link from "next/link";
import { AppNav } from "@/components/app/AppNav";
import { missions, skillCatalog } from "@/lib/engine/catalog";
import { suggestedNextMission } from "@/lib/engine/planner";
import { useProgress } from "@/lib/client/progress";
import { SystemStatus } from "@/components/app/SystemStatus";

export default function DashboardPage(){
 const {progress,hydrated,reset}=useProgress(); const next=suggestedNextMission(progress.completedMissions); const values=skillCatalog.map(s=>progress.skillMastery[s.id]??s.mastery); const avg=Math.round(values.reduce((a,b)=>a+b,0)/values.length*100); const mastered=values.filter(v=>v>=.8).length;
 return <main className="app-shell"><AppNav/><section className="command-page"><div className="command-hero"><div><span className="section-kicker">LEARNING COMMAND CENTER</span><h1>Your skills are a<br/><em>live system.</em></h1><p>The planner reads evidence across missions and chooses the next gap worth proving.</p></div><div className="command-score"><small>OPERATOR READINESS</small><strong>{hydrated?avg:"—"}<sup>%</sup></strong><span>{mastered} skills above target</span></div></div>
 <div className="command-grid"><article className="next-mission-card"><div className="card-label"><span>NEXT BEST MISSION</span><b>planner</b></div><p className="mission-domain">{next.domain} · {next.difficulty} · {next.duration}</p><h2>{next.title}</h2><p>{next.description}</p><div className="mission-outcome"><small>OUTCOME</small><span>{next.outcome}</span></div><Link href={`/workspace?mission=${next.id}`} className="launch-solid">Launch workspace <span>→</span></Link></article>
 <article className="command-panel"><div className="card-label"><span>ACTIVE SYSTEM</span><b>live</b></div><div className="system-row"><span>Skill graph</span><strong>{skillCatalog.length} nodes</strong></div><div className="system-row"><span>Evidence store</span><strong>{Object.values(progress.missionStates).reduce((n,s)=>n+s.evidence.length,0)} signals</strong></div><div className="system-row"><span>Missions</span><strong>{progress.completedMissions.length}/{missions.length} validated</strong></div><div className="system-row"><span>Entitlements</span><strong>{progress.entitlements.length} active</strong></div><button className="text-button" onClick={reset}>Reset demo state</button><SystemStatus/></article>
 <article className="command-panel span-two"><div className="card-label"><span>RECENT SKILL STATE</span><Link href="/skills">Open graph ↗</Link></div><div className="dashboard-skills">{skillCatalog.slice(0,8).map(s=>{const v=progress.skillMastery[s.id]??s.mastery;return <div key={s.id}><span>{s.label}</span><i><em style={{width:`${Math.round(v*100)}%`}}/></i><b>{Math.round(v*100)}</b></div>})}</div></article></div></section></main>
}
