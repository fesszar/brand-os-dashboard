#!/bin/bash
# Arguments module for ralph.sh
# CLI argument parsing
# Dependencies: constants.sh

# Parse command line arguments
# Sets: MAX_ITERATIONS, ONCE_FLAG, RUNNER_MODE, AGENT_ENGINE, MODEL_NAME
# Usage: parse_arguments "$@"
parse_arguments() {
  MAX_ITERATIONS=10
  ONCE_FLAG=false
  RUNNER_MODE="${RALPH_RUNNER:-auto}"   # auto|docker|local
  AGENT_ENGINE="${RALPH_AGENT_ENGINE:-claude}" # claude|codex|gemini
  MODEL_NAME="${RALPH_MODEL:-opus}"

  while [[ $# -gt 0 ]]; do
    case $1 in
      --help|-h)
        show_help
        ;;
      --once)
        ONCE_FLAG=true
        shift
        ;;
      --max-iterations|-n)
        MAX_ITERATIONS="$2"
        shift 2
        ;;
      --max-iterations=*)
        MAX_ITERATIONS="${1#*=}"
        shift
        ;;
      --runner|-r)
        RUNNER_MODE="$2"
        shift 2
        ;;
      --runner=*)
        RUNNER_MODE="${1#*=}"
        shift
        ;;
      --agent|-a)
        AGENT_ENGINE="$2"
        shift 2
        ;;
      --agent=*)
        AGENT_ENGINE="${1#*=}"
        shift
        ;;
      --model|-m)
        MODEL_NAME="$2"
        shift 2
        ;;
      --model=*)
        MODEL_NAME="${1#*=}"
        shift
        ;;
      [0-9]*)
        MAX_ITERATIONS="$1"
        shift
        ;;
      *)
        shift
        ;;
    esac
  done

  # --once overrides max-iterations
  if [ "$ONCE_FLAG" = true ]; then
    MAX_ITERATIONS=1
  fi
}
