#!/bin/bash
# Preflight module for ralph.sh
# Pre-flight checks before starting the main loop
# Dependencies: constants.sh, logging.sh
#
# Verify required files exist before starting the main loop.
# Required files cause script exit if missing.
# Optional files trigger a warning but allow continuation.

# Check if running inside a git repository
# Usage: check_git_repo
# Exits with code 1 if not in a git repository
check_git_repo() {
  if ! git rev-parse --git-dir > /dev/null 2>&1; then
    log_error "ralph.sh must be run inside a git repository"
    exit 1
  fi
}

# Ensure history directory exists for storing iteration logs
# Usage: check_history_dir
# Creates .agent/history/ directory if it doesn't exist
check_history_dir() {
  mkdir -p "$HISTORY_DIR"
  if [ ! -d "$HISTORY_DIR" ]; then
    log_error "Failed to create history directory: $HISTORY_DIR"
    exit 1
  fi
}

# Check for required files and exit if missing, warn for optional files
# Usage: check_required_files
check_required_files() {
  local missing_required=false

  # Required files - exit if missing
  if [ ! -f "$SCRIPT_DIR/.agent/tasks.json" ]; then
    log_error "Required file missing: .agent/tasks.json"
    missing_required=true
  fi

  if [ ! -f "$SCRIPT_DIR/.agent/PROMPT.md" ]; then
    log_error "Required file missing: .agent/PROMPT.md"
    missing_required=true
  fi

  # Exit if any required files are missing
  if [ "$missing_required" = true ]; then
    log_error "Please create the required files before running Ralph"
    exit 1
  fi

  # Optional files - warn if missing but continue
  if [ ! -f "$SCRIPT_DIR/.agent/prd/SUMMARY.md" ]; then
    log_warn "Optional file missing: .agent/prd/SUMMARY.md"
  fi
}

# Check whether Docker sandbox mode is available and ready
# Usage: docker_sandbox_ready
docker_sandbox_ready() {
  if ! command -v docker >/dev/null 2>&1; then
    return 1
  fi

  # Needs both command support and daemon availability
  if ! docker sandbox --help >/dev/null 2>&1; then
    return 1
  fi

  if ! docker sandbox ls >/dev/null 2>&1; then
    return 1
  fi

  return 0
}

# Check local CLI availability for the selected engine
# Usage: local_engine_available
local_engine_available() {
  case "$AGENT_ENGINE" in
    claude) command -v claude >/dev/null 2>&1 ;;
    codex) command -v codex >/dev/null 2>&1 ;;
    gemini) command -v gemini >/dev/null 2>&1 ;;
    *) return 1 ;;
  esac
}

# Resolve final runner mode from auto|docker|local
# Usage: resolve_runner_mode
resolve_runner_mode() {
  case "$RUNNER_MODE" in
    auto)
      if docker_sandbox_ready; then
        RESOLVED_RUNNER="docker"
      else
        RESOLVED_RUNNER="local"
      fi
      ;;
    docker|local)
      RESOLVED_RUNNER="$RUNNER_MODE"
      ;;
    *)
      log_error "Invalid runner mode: $RUNNER_MODE (expected: auto|docker|local)"
      exit 1
      ;;
  esac
}

# Validate prerequisites for selected runner
# Usage: validate_runner_prereqs
validate_runner_prereqs() {
  if [ "$RESOLVED_RUNNER" = "docker" ]; then
    if ! docker_sandbox_ready; then
      log_error "Docker runner selected, but docker sandbox is not available."
      log_error "Start Docker Desktop and run: docker sandbox run claude . --"
      exit 1
    fi
    return
  fi

  if ! local_engine_available; then
    log_error "Local runner selected, but CLI for engine '$AGENT_ENGINE' is not available."
    log_error "Install the CLI or switch engine with --agent claude|codex|gemini."
    exit 1
  fi
}
