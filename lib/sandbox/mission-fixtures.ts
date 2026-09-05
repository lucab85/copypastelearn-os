const LIVE_ROOT = "/vercel/sandbox/cpl-mission";

export function missionWorkdir(missionId: string) {
  return missionId === "linux-service-recovery" ? LIVE_ROOT : null;
}

export function missionFixtureCommand(missionId: string) {
  if (missionId !== "linux-service-recovery") return null;
  return String.raw`set -eu
ROOT=/vercel/sandbox/cpl-mission
mkdir -p "$ROOT"
if [ ! -f "$ROOT/.fixture-v1" ]; then
  cat > "$ROOT/README.md" <<'EOF'
# Incident brief
The service health check started failing after an out-of-band configuration change.

Goal:
1. Inspect service.log and both environment files.
2. Restore runtime.env so it exactly matches desired.env.
3. Set runtime.env permissions to 600.
4. Run ./validate.sh, then use the CPL live validator to commit evidence.
EOF
  cat > "$ROOT/desired.env" <<'EOF'
PORT=8080
LOG_LEVEL=info
FEATURE_FLAG=false
EOF
  cat > "$ROOT/runtime.env" <<'EOF'
PORT=9000
LOG_LEVEL=debug
FEATURE_FLAG=true
EOF
  cat > "$ROOT/service.log" <<'EOF'
2026-09-05T08:00:11Z service boot version=2.4.1
2026-09-05T08:00:12Z config loaded port=9000 log_level=debug feature_flag=true
2026-09-05T08:00:14Z health probe failed expected_port=8080 actual_port=9000
2026-09-05T08:00:14Z warning runtime.env permissions are broader than policy
EOF
  cat > "$ROOT/validate.sh" <<'EOF'
#!/bin/sh
set -eu
cd "$(dirname "$0")"
failed=0
if cmp -s desired.env runtime.env; then
  echo "config:pass"
else
  echo "config:fail runtime.env differs from desired.env"
  failed=1
fi
mode="$(stat -c '%a' runtime.env)"
if [ "$mode" = "600" ]; then
  echo "permissions:pass mode=600"
else
  echo "permissions:fail expected=600 actual=$mode"
  failed=1
fi
if [ "$failed" -eq 0 ]; then
  echo "CPL_VALIDATED"
  exit 0
fi
exit 1
EOF
  chmod 755 "$ROOT/validate.sh"
  chmod 644 "$ROOT/runtime.env"
  touch "$ROOT/.fixture-v1"
  echo "fixture:initialized"
else
  echo "fixture:ready"
fi`;
}
