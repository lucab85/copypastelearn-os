"use client";

import Link from "next/link";
import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Brand } from "@/components/Brand";
import { LiveLabDrawer } from "@/components/labs/LiveLabDrawer";
import { useProgress } from "@/lib/client/progress";
import { getMission, missions } from "@/lib/engine/catalog";
import { deriveSkills, evaluateCommand, isMissionComplete, nextBestAction } from "@/lib/engine/planner";
import type { EngineState, EvidenceEvent } from "@/lib/engine/types";

function missionFromGoal(goal: string) {
  const g = goal.toLowerCase();
  if (g.includes("linux") || g.includes("systemd") || g.includes("permissions") || g.includes("service config")) return "linux-service-recovery";
  if (g.includes("kubernetes") || g.includes("k8s")) return "k8s-recovery";
  if (g.includes("terraform") || g.includes("iac")) return "terraform-drift";
  return "docker-production";
}

function newState(missionId: string, goal: string): EngineState {
  return { missionId, goal, commands: [], validators: {}, hintCount: 0, incidentMode: false, evidence: [] };
}

function formatPct(n: number) {
  return `${Math.round(n * 100)}%`;
}

type LiveValidationPayload = {
  validated: boolean;
  validators: Record<string, boolean>;
  evidence: Omit<EvidenceEvent, "id" | "missionId" | "timestamp"> | null;
};

function WorkspaceContent() {
  const params = useSearchParams();
  const requestedGoal = params.get("goal") || "Become production-ready with infrastructure";
  const requestedMission = params.get("mission") || missionFromGoal(requestedGoal);
  const { progress, hydrated, syncState, saveMissionState, completeMission, resetMission } = useProgress();
  const mission = getMission(requestedMission);
  const sessionKey = `${mission.id}::${requestedGoal}`;

  const [engine, setEngine] = useState<EngineState>(() => newState(mission.id, requestedGoal));
  const [input, setInput] = useState("");
  const [lines, setLines] = useState<{ type: string; text: string }[]>(
    mission.starterLines.map((text, i) => ({ type: i < 2 ? "system" : "output", text })),
  );
  const [coachMode, setCoachMode] = useState<"coach" | "reviewer" | "incident">("coach");
  const [coach, setCoach] = useState("I’m observing your execution path. Establish evidence before mutating state; I’ll intervene when the signal is useful.");
  const [coachOpen, setCoachOpen] = useState(true);
  const [agentBusy, setAgentBusy] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);
  const terminalRef = useRef<HTMLDivElement>(null);
  const initializedSessionRef = useRef<string | null>(null);

  // Hydrate a mission only when the user actually enters/switches that mission.
  // Progress persistence changes on every command; re-running initialization on those
  // changes used to wipe the freshly rendered command output from the terminal.
  useEffect(() => {
    if (!hydrated || initializedSessionRef.current === sessionKey) return;
    initializedSessionRef.current = sessionKey;

    const saved = progress.missionStates[mission.id];
    const state = saved ? { ...saved, goal: requestedGoal || saved.goal } : newState(mission.id, requestedGoal);
    setEngine(state);
    setInput("");
    setLines([
      ...mission.starterLines.map((text, i) => ({ type: i < 2 ? "system" : "output", text })),
      ...state.commands.slice(-8).map((command) => ({ type: "system", text: `history · $ ${command}` })),
    ]);
    requestAnimationFrame(() => inputRef.current?.focus());
  }, [hydrated, sessionKey, mission.id, mission.starterLines, progress.missionStates, requestedGoal]);

  useEffect(() => {
    const terminal = terminalRef.current;
    if (!terminal) return;
    terminal.scrollTop = terminal.scrollHeight;
  }, [lines, engine.evidence.length]);

  const skills = useMemo(() => deriveSkills(engine, progress.skillMastery), [engine, progress.skillMastery]);
  const next = useMemo(() => nextBestAction(engine), [engine]);
  const relevantSkills = skills.filter((skill) => mission.steps.some((step) => step.skillIds.includes(skill.id)));
  const mastered = relevantSkills.filter((skill) => skill.status === "mastered").length;
  const overall = relevantSkills.length
    ? Math.round((relevantSkills.reduce((sum, skill) => sum + skill.mastery, 0) / relevantSkills.length) * 100)
    : 0;
  const complete = isMissionComplete(engine);

  const masteryMap = (state: EngineState) =>
    Object.fromEntries(deriveSkills(state, progress.skillMastery).map((skill) => [skill.id, skill.mastery]));

  const commitState = (nextState: EngineState) => {
    const map = masteryMap(nextState);
    if (isMissionComplete(nextState)) completeMission(mission.id, nextState, map);
    else saveMissionState(nextState, map);
  };

  const coachFor = (command: string, state: EngineState, signal?: string) => {
    if (isMissionComplete(state)) {
      return `Mission validated. The system captured enough evidence to prove “${mission.outcome}” Mastery has been committed to your shared skill graph.`;
    }
    if (signal === "misconception") return "That action skipped a prerequisite or a safety gate. Inspect the current state and explain what assumption failed.";
    if (signal === "debug") return "That produced a useful failure signal. Keep the hypothesis narrow: what boundary or state would explain exactly what you observed?";
    if (/logs|inspect|describe|state show|plan|endpoints|\bps\b|diff|stat/.test(command.toLowerCase())) {
      return "Strong move: you inspected state before changing it. I captured that as independent-debugging evidence.";
    }
    return `Evidence captured. The planner now recommends: ${nextBestAction(state).title}.`;
  };

  const submit = () => {
    const command = input.trim();
    if (!command) return;

    const result = evaluateCommand(command, engine);
    let nextState: EngineState = {
      ...engine,
      commands: [...engine.commands, command],
      validators: result.validators,
    };

    if (result.evidence) {
      const event: EvidenceEvent = {
        id: crypto.randomUUID(),
        missionId: mission.id,
        timestamp: new Date().toISOString(),
        ...result.evidence,
      };
      nextState = { ...nextState, evidence: [event, ...engine.evidence].slice(0, 40) };
    }

    setInput("");
    setLines((previous) => {
      if (result.output.includes("__CLEAR__")) return [];
      const commandLine = { type: "command", text: `$ ${command}` };
      const output = result.output.map((text) => ({
        type: /error|failed|blocked|not found|unavailable/i.test(text)
          ? "error"
          : /created|finished|complete|running|ok|validated|pass|patched/i.test(text)
            ? "success"
            : "output",
        text,
      }));
      return [...previous, commandLine, ...output];
    });
    setEngine(nextState);
    commitState(nextState);
    setCoach(coachFor(command, nextState, result.coachSignal));
    requestAnimationFrame(() => inputRef.current?.focus());
  };

  const handleLiveValidated = (payload: LiveValidationPayload) => {
    if (!payload.validated || !payload.evidence || engine.validators.liveValidated) return;
    const event: EvidenceEvent = {
      id: crypto.randomUUID(),
      missionId: mission.id,
      timestamp: new Date().toISOString(),
      ...payload.evidence,
    };
    const nextState: EngineState = {
      ...engine,
      validators: { ...engine.validators, ...payload.validators },
      evidence: [event, ...engine.evidence].slice(0, 40),
    };
    setEngine(nextState);
    commitState(nextState);
    setLines((previous) => [
      ...previous,
      { type: "success", text: "LIVE VALIDATOR · real sandbox state passed deterministic checks" },
      { type: "success", text: "Evidence committed to shared skill graph." },
    ]);
    setCoach(`Live environment validated. The proof came from the sandbox validator, not the language model. ${mission.outcome}`);
  };

  const handleLiveReset = () => {
    resetMission(mission.id);
    const nextState = newState(mission.id, engine.goal);
    setEngine(nextState);
    setInput("");
    setLines([
      ...mission.starterLines.map((text, i) => ({ type: i < 2 ? "system" : "output", text })),
      { type: "system", text: "incident reset · live fixture restored; historical mastery retained" },
    ]);
    setCoach("Incident reset. Your prior mastery remains in the skill graph, but this mission run is open again and must produce fresh evidence.");
    requestAnimationFrame(() => inputRef.current?.focus());
  };

  const askHint = () => {
    const nextState = { ...engine, hintCount: engine.hintCount + 1 };
    setEngine(nextState);
    saveMissionState(nextState, masteryMap(nextState));
    setCoach(`Hint ${nextState.hintCount}: ${next.detail} Use the smallest command that can prove or disprove your current hypothesis.`);
    requestAnimationFrame(() => inputRef.current?.focus());
  };

  const agentMessage = (mode: typeof coachMode) => {
    setCoachMode(mode);
    if (mode === "reviewer") {
      setCoach(engine.evidence.length
        ? `Reviewer: You have ${engine.evidence.length} evidence signals. I’m scoring inspection → hypothesis → repair → verification, not mere eventual success.`
        : "Reviewer: So far there is no durable evidence to review.");
    } else if (mode === "incident") {
      setCoach(
        mission.domain === "docker"
          ? "Incident agent ready. Type “inject incident” after validating the Docker mission to remove the host port and test recovery."
          : mission.domain === "linux"
            ? "Incident agent: the Linux sandbox already contains real config drift. Collect logs and filesystem evidence before repairing it."
            : "Incident agent: this mission already contains an injected production fault. Restore service without random mutation.",
      );
    } else {
      setCoach(`Coach: ${next.title}. ${next.detail}`);
    }
  };

  const askAgent = async (prompt = "Inspect my current state and coach the next move.") => {
    setAgentBusy(true);
    try {
      const response = await fetch("/api/coach", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ mode: coachMode, engine, skillMastery: progress.skillMastery, prompt }),
      });
      const data = await response.json();
      if (data.text) setCoach(data.text);
      else if (data.error) setCoach(`Agent unavailable: ${data.error}`);
    } catch {
      setCoach(`Agent network unavailable. Deterministic planner is still active: ${next.title}. ${next.detail}`);
    } finally {
      setAgentBusy(false);
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  };

  return (
    <main className="workspace-shell">
      <div className="workspace-topbar">
        <Link href="/dashboard" className="workspace-brand"><Brand compact/><span>CPL<span>/OS</span></span></Link>
        <div className="mission-crumb"><span>{mission.domain.toUpperCase()} / {mission.difficulty.toUpperCase()}</span><b>{mission.title}</b></div>
        <div className="workspace-status"><span><i/> ENGINE ACTIVE</span><span className="sync-chip">{syncState.toUpperCase()}</span><Link href="/missions" className="workspace-switch">Switch</Link><div className="avatar">LB</div></div>
      </div>

      <div className="workspace-main">
        <aside className="mission-panel">
          <div className="panel-label">MISSION GRAPH</div>
          <div className="mission-goal"><small>YOUR GOAL</small><h2>{engine.goal}</h2><div className="goal-progress"><i style={{ width: `${overall}%`, background: mission.accent }}/><span>{overall}% signal</span></div></div>
          <div className="mission-steps">
            {mission.steps.map((step, index) => {
              const active = next.step === step.id;
              const nextIndex = mission.steps.findIndex((candidate) => candidate.id === next.step);
              const done = !active && nextIndex >= 0 && index < nextIndex;
              return <div className={complete || done ? "done" : active ? "active" : "queued"} key={step.id}><b>{complete || done ? "✓" : String(index + 1).padStart(2, "0")}</b><span><strong>{step.title}</strong><small>{step.description}</small></span></div>;
            })}
          </div>
          <div className="next-action"><small>NEXT BEST ACTION</small><strong>{next.title}</strong><p>{next.detail}</p></div>
          <div className="mastery-mini"><div><span>{mastered}/{relevantSkills.length}</span><small>skills at target</small></div><div><span>{engine.hintCount}</span><small>hints used</small></div></div>
          <div className="mission-mini-switch">{missions.map((item) => <Link className={item.id === mission.id ? "active" : ""} href={`/workspace?mission=${item.id}`} key={item.id}>{item.domain}</Link>)}</div>
        </aside>

        <section className="workbench">
          <div className="workbench-tabs"><div><button className="active"><i/> Terminal</button><button>Editor</button><button>Topology</button></div><span>{mission.slug} · eu-west</span></div>
          <div ref={terminalRef} className="terminal-stage" onClick={() => inputRef.current?.focus()}>
            <div className="terminal-noise"/>
            <div className="terminal-history">
              {lines.map((line, index) => <div key={`${index}-${line.text}`} className={`tline ${line.type}`}>{line.text}</div>)}
              {complete && <div className="mission-complete"><span>✓</span><div><small>MISSION VALIDATED</small><strong>{mission.outcome}</strong><p>{engine.evidence.length} evidence signals committed to your skill graph.</p></div></div>}
            </div>
            <div className="terminal-input-row">
              <span>operator@cpl:~/{mission.domain} <b>$</b></span>
              <input
                ref={inputRef}
                autoFocus
                autoComplete="off"
                aria-label="Mission terminal command"
                value={input}
                onChange={(event) => setInput(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key !== "Enter" || event.nativeEvent.isComposing) return;
                  event.preventDefault();
                  submit();
                }}
                spellCheck={false}
              />
              <i/>
            </div>
          </div>
          <div className="workbench-bottom"><span>CPU 3%</span><span>MEM 148 MB</span><span>NET <i/> connected</span><div/><span>{engine.commands.length} commands · {engine.evidence.length} evidence</span></div>
        </section>

        <aside className={`coach-panel ${coachOpen ? "" : "closed"}`}>
          <div className="coach-head"><div><span className="coach-orb"><i/></span><div><small>AI ENGINEERING TEAM</small><strong>{coachMode[0].toUpperCase() + coachMode.slice(1)} <em>observing</em></strong></div></div><button onClick={() => setCoachOpen(!coachOpen)}>{coachOpen ? "→" : "←"}</button></div>
          {coachOpen && <>
            <div className="agent-tabs"><button className={coachMode === "coach" ? "active" : ""} onClick={() => agentMessage("coach")}>Coach</button><button className={coachMode === "reviewer" ? "active" : ""} onClick={() => agentMessage("reviewer")}>Reviewer</button><button className={coachMode === "incident" ? "active" : ""} onClick={() => agentMessage("incident")}>Incident</button></div>
            <div className="coach-feed">
              <div className="coach-msg"><span>{coachMode.toUpperCase()}</span><p>{coach}</p></div>
              <div className="coach-actions"><button onClick={askHint}>Give me a hint <span>⌘H</span></button><button disabled={agentBusy} onClick={() => askAgent(coachMode === "reviewer" ? "Review the quality of my latest evidence and identify the weakest reasoning link." : coachMode === "incident" ? "Propose the next safe incident challenge based on current validated state." : "Coach my next move without giving away the full answer.")}>{agentBusy ? "Thinking…" : "Ask live agent"} <span>↗</span></button></div>
              <div className="evidence-feed"><div className="evidence-head"><span>LIVE EVIDENCE</span><b>{engine.evidence.length}</b></div>{engine.evidence.length === 0 ? <p className="empty-evidence">No strong evidence yet. Execute something meaningful.</p> : engine.evidence.slice(0, 6).map((item) => <div className="evidence-item" key={item.id}><i>+</i><span><strong>{item.label}</strong><small>{item.type} · score {item.score.toFixed(2)}</small></span></div>)}</div>
            </div>
            <div className="skill-drawer"><div className="evidence-head"><span>SKILL STATE</span><b>{overall}%</b></div>{relevantSkills.map((skill) => <div className="workspace-skill" key={skill.id}><div><span>{skill.label}</span><b>{formatPct(skill.mastery)}</b></div><i><em style={{ width: formatPct(skill.mastery), background: mission.accent }}/></i></div>)}</div>
          </>}
        </aside>
      </div>

      <LiveLabDrawer missionId={mission.id} validationEnabled={Boolean(mission.liveValidator)} onValidated={handleLiveValidated} onReset={handleLiveReset}/>
    </main>
  );
}

export default function WorkspacePage() {
  return <Suspense fallback={<main className="workspace-shell"><div className="workspace-topbar">Loading mission…</div></main>}><WorkspaceContent/></Suspense>;
}
