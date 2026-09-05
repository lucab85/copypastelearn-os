"use client";

import { useEffect, useState } from "react";

const frames = [
  ["$ kubectl get pods", "api-7bd8cc9f9-x82hj   0/1   CrashLoopBackOff   4   2m"],
  ["$ kubectl logs api-7bd8cc9f9-x82hj", "Error: DATABASE_URL is not defined"],
  ["$ kubectl get secret api-env", "Error from server (NotFound): secrets \"api-env\" not found"],
];

export function LandingTerminal() {
  const [frame, setFrame] = useState(0);
  const [validated, setValidated] = useState(false);

  useEffect(() => {
    if (validated) return;
    const t = setInterval(() => setFrame((f) => (f + 1) % frames.length), 2600);
    return () => clearInterval(t);
  }, [validated]);

  return (
    <div className="hero-console glass-panel">
      <div className="console-topline">
        <div className="window-dots"><i/><i/><i/></div>
        <span>mission://k8s-recovery</span>
        <span className="live-chip"><i/> LIVE LAB</span>
      </div>
      <div className="console-body">
        <div className="console-context">
          <span>INCIDENT 04</span>
          <strong>Recover the production API</strong>
          <p>A deploy passed CI. Production did not.</p>
        </div>
        <div className="terminal-lines" key={validated ? "v" : frame}>
          {validated ? (
            <>
              <div><em>$</em> kubectl create secret generic api-env --from-literal=DATABASE_URL=postgres://db/prod</div>
              <div className="terminal-ok">secret/api-env created</div>
              <div><em>$</em> kubectl rollout restart deploy/api</div>
              <div className="terminal-ok">deployment.apps/api restarted</div>
            </>
          ) : (
            frames[frame].map((line, i) => <div key={line} className={i ? "terminal-error" : ""}>{line}</div>)
          )}
        </div>
        <button className={`validate-pulse ${validated ? "validated" : ""}`} onClick={() => setValidated(true)}>
          <span>{validated ? "✓" : "→"}</span>
          <div>
            <small>{validated ? "EVIDENCE CAPTURED" : "YOUR MOVE"}</small>
            <b>{validated ? "+ Kubernetes debugging · mastery 82%" : "Fix the incident"}</b>
          </div>
        </button>
      </div>
    </div>
  );
}
