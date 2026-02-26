#!/bin/bash
# Ralph Wiggum - Long-running AI agent loop
# Usage: ./ralph.sh [--help] [--once] [--max-iterations N] [N]

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

PRD_FILE="$SCRIPT_DIR/.agent/prd/PRD.md"
PROGRESS_FILE="$SCRIPT_DIR/.agent/logs/LOG.md"
HISTORY_DIR="$SCRIPT_DIR/.agent/history"

source "$SCRIPT_DIR/scripts/lib/constants.sh"
source "$SCRIPT_DIR/scripts/lib/logging.sh"
source "$SCRIPT_DIR/scripts/lib/preflight.sh"
source "$SCRIPT_DIR/scripts/lib/timing.sh"
source "$SCRIPT_DIR/scripts/lib/terminal.sh"
source "$SCRIPT_DIR/scripts/lib/spinner.sh"
source "$SCRIPT_DIR/scripts/lib/preview.sh"
source "$SCRIPT_DIR/scripts/lib/output.sh"
source "$SCRIPT_DIR/scripts/lib/cleanup.sh"
source "$SCRIPT_DIR/scripts/lib/promise.sh"
source "$SCRIPT_DIR/scripts/lib/notify.sh"
source "$SCRIPT_DIR/scripts/lib/display.sh"
source "$SCRIPT_DIR/scripts/lib/args.sh"

# Timing
START_TIME=$(date +%s)
ITERATION_TIMES=()
TOTAL_ITERATION_TIME=0
PREV_ITERATION_TIME=0

# Session ID for unique history file naming (YYYYMMDD-HHMMSS format). This is used to prevent overwrites between runs.
SESSION_ID=$(date +%Y%m%d-%H%M%S)

# Temporary files for spinner communication
STEP_FILE=$(mktemp)
PREVIEW_LINE_FILE=$(mktemp)

# Background process tracking for cleanup
AGENT_PID=""
OUTPUT_FILE=""
FULL_OUTPUT_FILE=""

# Set up traps
trap cleanup EXIT
trap handle_interrupt INT

# Parse arguments (sets MAX_ITERATIONS, ONCE_FLAG, RUNNER_MODE, AGENT_ENGINE, MODEL_NAME)
parse_arguments "$@"

# Initialize progress file if it doesn't exist
if [ ! -f "$PROGRESS_FILE" ]; then
  echo "# Ralph Progress Log" > "$PROGRESS_FILE"
  echo "Started: $(date)" >> "$PROGRESS_FILE"
  echo "---" >> "$PROGRESS_FILE"
fi

# Pre-flight checks
check_git_repo
check_required_files
check_history_dir
check_ansi_support
resolve_runner_mode
validate_runner_prereqs

show_ralph
echo -e " ${C}Starting Ralph${R} ・ ${Y}v$VERSION${R} ・ Max iterations: ${Y}$MAX_ITERATIONS${R}"
echo -e " ${C}Runner:${R} ${Y}$RESOLVED_RUNNER${R} ・ ${C}Engine:${R} ${Y}$AGENT_ENGINE${R} ・ ${C}Model:${R} ${Y}$MODEL_NAME${R}"
echo ""

# Build the local runner command string based on selected engine/model.
build_local_agent_command() {
  case "$AGENT_ENGINE" in
    claude)
      echo "claude --model \"$MODEL_NAME\" --output-format stream-json --verbose -p \"\$PROMPT_CONTENT\""
      ;;
    codex)
      echo "codex exec --full-auto --json --model \"$MODEL_NAME\" \"\$PROMPT_CONTENT\""
      ;;
    gemini)
      echo "gemini --yolo --output-format stream-json -m \"$MODEL_NAME\" -p \"\$PROMPT_CONTENT\""
      ;;
    *)
      log_error "Unsupported local engine: $AGENT_ENGINE"
      exit 1
      ;;
  esac
}

for i in $(seq 1 $MAX_ITERATIONS); do
  ITERATION_START=$(date +%s)

  # Initialize step timing for this iteration
  init_iteration_step_times

  echo -e "${B}░░▒▒▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▒▒░░${R}"
  echo -e "  ↪ ${R}Iteration ${Y}$i${R} of ${Y}$MAX_ITERATIONS${R}"
  echo -e "${B}░░▒▒▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▒▒░░${R}"
  echo -e ""

  # Run Agent with the ralph prompt (prepend PROJECT_ROOT)
  PROMPT_CONTENT="PROJECT_ROOT=$SCRIPT_DIR

$(cat $SCRIPT_DIR/.agent/PROMPT.md)"

  # Start spinner
  start_spinner

  # Initialize rolling preview
  init_rolling_preview

  # Run Agent and capture output while updating spinner and preview
  OUTPUT_FILE=$(mktemp)
  FULL_OUTPUT_FILE=$(mktemp)

  # Use script to provide pseudo-TTY for the selected runner.
  # This is the main command loop.
  export PROMPT_CONTENT
  AGENT_CMD=""
  if [ "$RESOLVED_RUNNER" = "docker" ]; then
    export DOCKER_DEFAULT_PLATFORM=linux/amd64 # Needed for Playwright.
    TOKEN_TO_USE="${RALPH_CLAUDE_OAUTH_TOKEN:-${CLAUDE_CODE_OAUTH_TOKEN:-}}"
    if [ "$AGENT_ENGINE" = "claude" ] && [ -n "$TOKEN_TO_USE" ] && [ -z "${RALPH_AUTH_PREFLIGHT_DONE:-}" ]; then
      AUTH_PREFLIGHT_OUTPUT="$(CLAUDE_CODE_OAUTH_TOKEN="$TOKEN_TO_USE" claude --model "$MODEL_NAME" --output-format stream-json --verbose -p 'Reply exactly: <ok/>' 2>&1 || true)"
      if echo "$AUTH_PREFLIGHT_OUTPUT" | grep -qiE "Invalid bearer token|authentication_error|Not logged in"; then
        echo ""
        echo -e "${RD}░░▒▒▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▒▒░░${R}"
        echo -e "  ❌ ${RD}Authentication Error${R}"
        echo -e "  The supplied Claude OAuth token is invalid or expired."
        echo -e "  Generate a new long-lived token with: ${C}claude setup-token${R}"
        echo -e "${RD}░░▒▒▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▒▒░░${R}"
        exit $EXIT_AUTH_ERROR
      fi
      export RALPH_AUTH_PREFLIGHT_DONE=1
    fi
    if [ "$AGENT_ENGINE" = "claude" ] && [ -n "$TOKEN_TO_USE" ]; then
      SANDBOX_BASE="$(basename "$SCRIPT_DIR" | tr -c '[:alnum:]._-+' '-' | sed 's/^-*//;s/-*$//')"
      SANDBOX_NAME="${RALPH_DOCKER_SANDBOX_NAME:-claude-${SANDBOX_BASE}}"
      AGENT_CMD='docker sandbox run claude . -- --version >/dev/null 2>&1; docker sandbox exec -e CLAUDE_CODE_OAUTH_TOKEN="'"$TOKEN_TO_USE"'" "'"$SANDBOX_NAME"'" claude --model '"$MODEL_NAME"' --output-format stream-json --verbose -p "$PROMPT_CONTENT"'
    elif [ -n "$TOKEN_TO_USE" ]; then
      AGENT_CMD='CLAUDE_CODE_OAUTH_TOKEN="'"$TOKEN_TO_USE"'" docker sandbox run claude . -- --model '"$MODEL_NAME"' --output-format stream-json --verbose -p "$PROMPT_CONTENT"'
    else
      AGENT_CMD='docker sandbox run claude . -- --model '"$MODEL_NAME"' --output-format stream-json --verbose -p "$PROMPT_CONTENT"'
    fi
  else
    AGENT_CMD="$(build_local_agent_command)"
  fi

  script -q "$OUTPUT_FILE" bash -lc "$AGENT_CMD" >/dev/null 2>&1 &
  AGENT_PID=$!

  # Track position in output file for incremental reading
  LAST_POS=0

  # Monitor output and update spinner step and rolling preview
  while kill -0 "$AGENT_PID" 2>/dev/null; do
    if [ -f "$OUTPUT_FILE" ]; then
      # Get current file size
      CURRENT_SIZE=$(stat -f%z "$OUTPUT_FILE" 2>/dev/null || stat -c%s "$OUTPUT_FILE" 2>/dev/null || echo "0")

      # Read new content if file has grown
      if [ "$CURRENT_SIZE" -gt "$LAST_POS" ]; then
        # Read new lines
        tail -c +$((LAST_POS + 1)) "$OUTPUT_FILE" 2>/dev/null | while IFS= read -r line; do
          if [ -n "$line" ]; then
            # Parse JSON and extract text content
            parsed=$(parse_json_content "$line")
            if [ -n "$parsed" ]; then
              # Save to full output
              echo "$parsed" >> "$FULL_OUTPUT_FILE"
              # Update spinner step
              update_spinner_step "$parsed"
              # Update preview line under spinner
              update_preview_line "$parsed"
            fi
          fi
        done
        LAST_POS=$CURRENT_SIZE
      fi
    fi
    sleep 0.2
  done

  wait "$AGENT_PID" || true
  AGENT_PID=""  # Clear PID after process exits

  # Process any remaining output
  if [ -f "$OUTPUT_FILE" ]; then
    CURRENT_SIZE=$(stat -f%z "$OUTPUT_FILE" 2>/dev/null || stat -c%s "$OUTPUT_FILE" 2>/dev/null || echo "0")
    if [ "$CURRENT_SIZE" -gt "$LAST_POS" ]; then
      tail -c +$((LAST_POS + 1)) "$OUTPUT_FILE" 2>/dev/null | while IFS= read -r line; do
        if [ -n "$line" ]; then
          parsed=$(parse_json_content "$line")
          if [ -n "$parsed" ]; then
            echo "$parsed" >> "$FULL_OUTPUT_FILE"
          fi
        fi
      done
    fi
  fi

  OUTPUT=$(cat "$FULL_OUTPUT_FILE" 2>/dev/null || cat "$OUTPUT_FILE")

  # Check for Docker daemon not ready error
  if [ "$RESOLVED_RUNNER" = "docker" ] && echo "$OUTPUT" | grep -q "docker daemon not ready"; then
    stop_spinner
    clear_rolling_preview
    echo ""
    echo -e "${RD}░░▒▒▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▒▒░░${R}"
    echo -e "  ❌ ${RD}Docker Error${R}"
    echo -e "  Docker daemon is not ready. Please ensure Docker is running."
    echo -e "${RD}░░▒▒▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▒▒░░${R}"
    rm -f "$OUTPUT_FILE" "$FULL_OUTPUT_FILE"
    exit $EXIT_DOCKER_ERROR
  fi

  # Detect whether the agent produced a successful result payload.
  # Some streams include "needs-auth" statuses for optional MCP servers,
  # which should not be treated as runner auth failures.
  HAS_SUCCESS_RESULT=false
  if echo "$OUTPUT" | grep -q '"type":"result","subtype":"success","is_error":false'; then
    HAS_SUCCESS_RESULT=true
  elif echo "$OUTPUT" | grep -q "<promise>COMPLETE</promise>"; then
    HAS_SUCCESS_RESULT=true
  fi

  # Check for invalid API key / authentication error only if we did not
  # receive a successful result payload.
  if [ "$HAS_SUCCESS_RESULT" = "false" ] && echo "$OUTPUT" | grep -qiE "Invalid API key|authentication error|please authenticate|not logged in"; then
    stop_spinner
    clear_rolling_preview
    echo ""
    echo -e "${RD}░░▒▒▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▒▒░░${R}"
    echo -e "  ❌ ${RD}Authentication Error${R}"
    echo -e "  Authentication failed for runner '$RESOLVED_RUNNER' (engine: $AGENT_ENGINE)."
    echo -e ""
    echo -e "  Run one of the following and follow login instructions:"
    echo -e "  ${C}claude auth login${R}"
    echo -e "  ${C}codex login${R}"
    echo -e "  ${C}gemini auth${R}"
    echo -e "${RD}░░▒▒▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▒▒░░${R}"
    rm -f "$OUTPUT_FILE" "$FULL_OUTPUT_FILE"
    exit $EXIT_AUTH_ERROR
  fi

  # Save cleaned output to history file (SESSION_ID prevents overwrites between runs)
  # Strip ANSI control characters for clean, readable history
  HISTORY_FILE="$HISTORY_DIR/ITERATION-${SESSION_ID}-${i}.txt"
  strip_ansi_file "$OUTPUT_FILE" "$HISTORY_FILE"

  # Extract final summary before removing files
  FINAL_SUMMARY=$(extract_final_summary "$OUTPUT_FILE")

  rm -f "$FULL_OUTPUT_FILE"
  FULL_OUTPUT_FILE=""  # Clear after removal

  # Stop spinner
  stop_spinner

  # Finalize step timing for this iteration (record time spent in last step)
  record_step_time ""

  # Clear rolling preview area to make room for summary
  clear_rolling_preview

  # Display the final summary (persists after iteration)
  if [ -n "$FINAL_SUMMARY" ]; then
    display_final_summary "$FINAL_SUMMARY" 10
  else
    # Fallback: show last 10 lines of parsed output if no result found
    FALLBACK_SUMMARY=$(echo "$OUTPUT" | tail -n 10)
    if [ -n "$FALLBACK_SUMMARY" ]; then
      display_final_summary "$FALLBACK_SUMMARY" 10
    fi
  fi

  # Clean up the raw output file (history file already saved)
  rm -f "$OUTPUT_FILE"
  OUTPUT_FILE=""  # Clear after removal

  # Calculate iteration duration
  ITERATION_END=$(date +%s)
  ITERATION_DURATION=$((ITERATION_END - ITERATION_START))
  ITERATION_TIMES+=($ITERATION_DURATION)
  TOTAL_ITERATION_TIME=$((TOTAL_ITERATION_TIME + ITERATION_DURATION))
  ITERATION_AVG=$((TOTAL_ITERATION_TIME / ${#ITERATION_TIMES[@]}))
  ITERATION_STR=$(format_duration $ITERATION_DURATION)
  AVG_STR=$(format_duration $ITERATION_AVG)
  DELTA_STR=$(format_delta $ITERATION_DURATION $PREV_ITERATION_TIME)
  PREV_ITERATION_TIME=$ITERATION_DURATION

  # Check for completion signal
  # Note: We check both $OUTPUT and $FINAL_SUMMARY because the JSON parsing
  # in parse_json_content truncates text at escaped quotes, but FINAL_SUMMARY
  # is correctly extracted using jq from the result message
  if has_complete_tag "$OUTPUT" || has_complete_tag "$FINAL_SUMMARY"; then
    ELAPSED=$(($(date +%s) - START_TIME))
    ELAPSED_STR=$(format_duration $ELAPSED)
    echo ""
    echo -e "${GR}░░▒▒▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▒▒░░${R}"
    echo -e "  🎉 ${GR}Ralph completed all tasks!${R}"
    echo -e "  ✅ Finished at iteration ${GR}$i${R} of ${GR}$MAX_ITERATIONS${R}"
    if [ -n "$DELTA_STR" ]; then
      echo -e "  ⏱️  Iteration $i: ${Y}$ITERATION_STR${R} ($DELTA_STR) ${C}│${R} Average: ${Y}$AVG_STR${R}"
    else
      echo -e "  ⏱️  Iteration $i: ${Y}$ITERATION_STR${R} ${C}│${R} Average: ${Y}$AVG_STR${R}"
    fi
    echo -e "  ⏱️  Total time: ${Y}$ELAPSED_STR${R}"
    display_session_step_totals
    echo -e "${GR}░░▒▒▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▒▒░░${R}"
    exit $EXIT_COMPLETE
  fi

  # Check for BLOCKED tag - agent needs human help
  # Check both $OUTPUT and $FINAL_SUMMARY (see completion signal comment above)
  if has_blocked_tag "$OUTPUT" || has_blocked_tag "$FINAL_SUMMARY"; then
    BLOCKED_REASON=$(extract_blocked_reason "$OUTPUT")
    # If not found in OUTPUT, try FINAL_SUMMARY
    [ -z "$BLOCKED_REASON" ] && BLOCKED_REASON=$(extract_blocked_reason "$FINAL_SUMMARY")
    ELAPSED=$(($(date +%s) - START_TIME))
    ELAPSED_STR=$(format_duration $ELAPSED)
    play_notification_sound
    show_notification "Ralph - BLOCKED" "$BLOCKED_REASON"
    display_blocked_message "$BLOCKED_REASON" "$i"
    if [ -n "$DELTA_STR" ]; then
      echo -e "  ⏱️  Iteration $i: ${Y}$ITERATION_STR${R} ($DELTA_STR) ${C}│${R} Average: ${Y}$AVG_STR${R}"
    else
      echo -e "  ⏱️  Iteration $i: ${Y}$ITERATION_STR${R} ${C}│${R} Average: ${Y}$AVG_STR${R}"
    fi
    echo -e "  ⏱️  Total time: ${Y}$ELAPSED_STR${R}"
    display_session_step_totals
    exit $EXIT_BLOCKED
  fi

  # Check for DECIDE tag - agent needs human decision
  # Check both $OUTPUT and $FINAL_SUMMARY (see completion signal comment above)
  if has_decide_tag "$OUTPUT" || has_decide_tag "$FINAL_SUMMARY"; then
    DECIDE_QUESTION=$(extract_decide_question "$OUTPUT")
    # If not found in OUTPUT, try FINAL_SUMMARY
    [ -z "$DECIDE_QUESTION" ] && DECIDE_QUESTION=$(extract_decide_question "$FINAL_SUMMARY")
    ELAPSED=$(($(date +%s) - START_TIME))
    ELAPSED_STR=$(format_duration $ELAPSED)
    play_notification_sound
    show_notification "Ralph - Decision Needed" "$DECIDE_QUESTION"
    display_decide_message "$DECIDE_QUESTION" "$i"
    if [ -n "$DELTA_STR" ]; then
      echo -e "  ⏱️  Iteration $i: ${Y}$ITERATION_STR${R} ($DELTA_STR) ${C}│${R} Average: ${Y}$AVG_STR${R}"
    else
      echo -e "  ⏱️  Iteration $i: ${Y}$ITERATION_STR${R} ${C}│${R} Average: ${Y}$AVG_STR${R}"
    fi
    echo -e "  ⏱️  Total time: ${Y}$ELAPSED_STR${R}"
    display_session_step_totals
    exit $EXIT_DECIDE
  fi

  # Calculate elapsed time
  ELAPSED=$(($(date +%s) - START_TIME))
  ELAPSED_STR=$(format_duration $ELAPSED)

  if [ -n "$DELTA_STR" ]; then
    echo -e "${G}  └── ✓ Iteration $i complete${R} ${C}│${R} Iteration: ${Y}$ITERATION_STR${R} ($DELTA_STR) ${C}│${R} Average: ${Y}$AVG_STR${R} ${C}│${R} Total: ${Y}$ELAPSED_STR${R}"
  else
    echo -e "${G}  └── ✓ Iteration $i complete${R} ${C}│${R} Iteration: ${Y}$ITERATION_STR${R} ${C}│${R} Average: ${Y}$AVG_STR${R} ${C}│${R} Total: ${Y}$ELAPSED_STR${R}"
  fi

  # Display per-iteration step times
  STEP_TIMES_OUTPUT=$(format_step_times "ITERATION")
  if [ -n "$STEP_TIMES_OUTPUT" ]; then
    echo -e "${G}      └──${R} $STEP_TIMES_OUTPUT"
  fi
  sleep 2
done

# Calculate final elapsed time
ELAPSED=$(($(date +%s) - START_TIME))
ELAPSED_STR=$(format_duration $ELAPSED)

# Calculate final average (if any iterations completed)
if [ ${#ITERATION_TIMES[@]} -gt 0 ]; then
  FINAL_AVG=$((TOTAL_ITERATION_TIME / ${#ITERATION_TIMES[@]}))
  FINAL_AVG_STR=$(format_duration $FINAL_AVG)
fi

echo ""
echo -e "${Y}░░▒▒▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▒▒░░${R}"
echo -e "  ⚠️  ${Y}Ralph reached max iterations${R} (${M}$MAX_ITERATIONS${R})"
if [ ${#ITERATION_TIMES[@]} -gt 0 ]; then
  echo -e "  ⏱️  Average iteration time: ${Y}$FINAL_AVG_STR${R}"
fi
echo -e "  ⏱️  Total time: ${Y}$ELAPSED_STR${R}"
display_session_step_totals
echo -e "  📋 Check progress: ${G}$PROGRESS_FILE${R}"
echo -e "${Y}░░▒▒▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▒▒░░${R}"
exit $EXIT_MAX_ITERATIONS
