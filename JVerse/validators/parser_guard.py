#!/usr/bin/env python3
"""
parser_guard.py — minimal hygiene checks for GitHub Actions workflows.

Checks:
  1) YAML parses.
  2) All "uses:" steps are pinned (no @master/@main/@latest and not missing ' @').
  3) If a step runs "firebase deploy", FIREBASE_TOKEN is present in that step (either exported in 'run' or provided via 'env').
  4) If a step curls '/trigger-animation', it must include an 'Authorization: Bearer' header.

Usage:
  python JVerse/validators/parser_guard.py --target .github/workflows/deploy-animation.yml --exit-on-fail
"""

import argparse
import sys
import os
from pathlib import Path

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..')))

from JVerse.governance.rulebook_updater import append_violation
from JVerse.governance.governance_emitter import emit_log

try:
    import yaml  # PyYAML
except Exception:
    print("ERROR: PyYAML is required. Install with: pip install pyyaml", file=sys.stderr)
    sys.exit(2)


def load_all_docs(text: str):
    # Handle single- or multi-document YAML
    return [doc for doc in yaml.safe_load_all(text) if doc is not None]


def iter_steps(doc):
    if not isinstance(doc, dict):
        return
    jobs = (doc.get("jobs") or {})
    if not isinstance(jobs, dict):
        return
    for job in jobs.values():
        if not isinstance(job, dict):
            continue
        steps = job.get("steps") or []
        if isinstance(steps, list):
            for s in steps:
                if isinstance(s, dict):
                    yield s


def check_uses_pinned(step, issues):
    if "uses" not in step:
        return
    ref = str(step["uses"])
    if "@" not in ref:
        issues.append(f"'uses:' not pinned: {ref}")
        return
    lowered = ref.lower()
    for bad in ("@master", "@main", "@latest"):
        if bad in lowered:
            issues.append(f"'uses:' disallowed ref: {ref}")
            break


def check_firebase_token(step, issues):
    run = str(step.get("run", "") or "")
    if "firebase deploy" not in run:
        return
    # Accept either explicit export in the run script or env mapping in the step
    has_export = "FIREBASE_TOKEN" in run
    env = step.get("env") or {}
    has_env = isinstance(env, dict) and "FIREBASE_TOKEN" in env
    if not (has_export or has_env):
        issues.append("firebase deploy present but FIREBASE_TOKEN not provided in this step (via export or env)")


def check_cloud_run_bearer(step, issues):
    run = str(step.get("run", "") or "")
    if "/trigger-animation" not in run:
        return
    if "Authorization: Bearer" not in run and "Authorization:  Bearer" not in run:
        issues.append("Cloud Run trigger missing 'Authorization: Bearer' header")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--target", required=True, help="Path to workflow YAML")
    ap.add_argument("--exit-on-fail", action="store_true", help="Exit 1 if any issues are found")
    args = ap.parse_args()

    path = Path(args.target)
    if not path.exists():
        print(f"ERROR: target not found: {path}", file=sys.stderr)
        sys.exit(2)

    text = path.read_text(encoding="utf-8")

    issues = []
    try:
        docs = load_all_docs(text)
        if not docs:
            issues.append("YAML parsed but produced no documents")
    except Exception as e:
        issues.append(f"YAML parse error: {e}")
        docs = []

    for doc in docs:
        for step in iter_steps(doc):
            check_uses_pinned(step, issues)
            check_firebase_token(step, issues)
            check_cloud_run_bearer(step, issues)

    if issues:
        print("Parser hygiene violations detected:")
        for i in issues:
            print("- " + i)
            append_violation(str(path), "parser_hygiene_violation", i)
            emit_log("parser_guard_validation", "block_deploy", i)
        if args.exit_on_fail:
            sys.exit(1)
    else:
        print("YAML and hygiene checks passed.")
        emit_log("parser_guard_validation", "success", "All checks passed")
        sys.exit(0)


if __name__ == "__main__":
    main()