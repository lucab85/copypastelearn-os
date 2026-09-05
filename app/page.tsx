import Link from "next/link";
import { Brand } from "@/components/Brand";
import { GoalComposer } from "@/components/GoalComposer";
import { LandingTerminal } from "@/components/LandingTerminal";
import { AuthControls } from "@/components/auth/AuthBoundary";

export default function Home() {
  return (
    <main className="site-shell">
      <div className="ambient ambient-one" />
      <div className="ambient ambient-two" />
      <div className="grid-field" />
      <nav className="topnav">
        <Brand />
        <div className="nav-center">
          <a href="#engine">Engine</a><a href="#missions">Missions</a><a href="#teams">Teams</a>
        </div>
        <div className="nav-actions"><AuthControls enabled={Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY)}/><Link href="/workspace" className="nav-cta">Enter OS <span>↗</span></Link></div>
      </nav>

      <section className="hero">
        <div className="hero-copy">
          <div className="eyebrow"><i /> LEARNING, RECOMPILED.</div>
          <h1>Stop studying<br/><span>infrastructure.</span><br/>Start operating it.</h1>
          <p className="hero-lede">CopyPasteLearn turns your goal into a live engineering mission. Real systems. Adaptive challenges. Evidence-based skill mastery.</p>
          <GoalComposer />
          <div className="proof-strip">
            <div><strong>∞</strong><span>adaptive<br/>paths</span></div>
            <div><strong>LIVE</strong><span>Linux<br/>workspaces</span></div>
            <div><strong>01</strong><span>AI engineering<br/>team</span></div>
          </div>
        </div>
        <div className="hero-product">
          <div className="orbit-label orbit-a"><i/> observe</div>
          <div className="orbit-label orbit-b"><i/> validate</div>
          <LandingTerminal />
          <div className="skill-float glass-panel">
            <div className="float-head"><span>SKILL GRAPH</span><b>live</b></div>
            <div className="skill-row"><span>Containers</span><i style={{"--p":"94%"} as React.CSSProperties}/><b>94</b></div>
            <div className="skill-row"><span>K8s runtime</span><i style={{"--p":"72%"} as React.CSSProperties}/><b>72</b></div>
            <div className="skill-row"><span>Debugging</span><i style={{"--p":"81%"} as React.CSSProperties}/><b>81</b></div>
          </div>
        </div>
      </section>

      <section className="signal-bar">
        <span>COPYPASTELEARN OS / 2026</span><div /><span>GOAL → EXECUTION → EVIDENCE → MASTERY</span><div/><span>STATUS: ONLINE</span>
      </section>

      <section id="engine" className="engine-section section-pad">
        <div className="section-kicker">THE ENGINE</div>
        <div className="engine-title"><h2>It doesn’t track<br/><span>completion.</span></h2><p>It tracks proof. Every command, validator and independent recovery becomes evidence in your skill graph.</p></div>
        <div className="engine-grid">
          <article><span className="card-num">01</span><div className="node-visual"><i/><i/><i/><i/></div><h3>Skill Graph</h3><p>A living model of what you can actually do — including prerequisites, confidence and decay.</p></article>
          <article><span className="card-num">02</span><div className="evidence-visual"><b>PASS</b><code>curl :8080/health</code><small>+0.17 mastery</small></div><h3>Evidence Engine</h3><p>Deterministic validators first. AI interpretation second. No “watched video = learned skill”.</p></article>
          <article><span className="card-num">03</span><div className="planner-visual"><span>GOAL</span><i>→</i><span className="hot">NEXT</span><i>→</i><span>PROOF</span></div><h3>Adaptive Planner</h3><p>The engine chooses the next best action: explain, challenge, break, review, remediate or advance.</p></article>
        </div>
      </section>

      <section id="missions" className="mission-banner section-pad">
        <div className="mission-copy"><div className="section-kicker">FIRST MISSION READY</div><h2>Ship a production<br/>container.</h2><p>Four skills. One live workspace. Zero passive completion.</p><Link href="/workspace" className="big-arrow-link">Launch the mission <span>→</span></Link></div>
        <div className="mission-rail">
          {[["01","Inspect","Understand the repo"],["02","Build","Create a lean image"],["03","Expose","Cross the network boundary"],["04","Prove","Validate production health"]].map(([n,t,d],i)=><div className={i===0?"active":""} key={n}><b>{n}</b><span><strong>{t}</strong><small>{d}</small></span><em>{i===0?"●":"○"}</em></div>)}
        </div>
      </section>

      <footer><Brand/><p>Technical learning for people who build real systems.</p><span>Prototype · CPL OS</span></footer>
    </main>
  );
}
