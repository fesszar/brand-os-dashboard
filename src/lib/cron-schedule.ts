import type { CronEntry, CronHealth, CronRun } from "@/lib/types";

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const JOB_TYPES = ["generate", "publish", "warmup", "script", "analytics"] as const;

function pad(value: string) {
  return value.padStart(2, "0");
}

function describeDays(field: string) {
  if (field === "*") {
    return "Daily";
  }
  if (field === "1-5") {
    return "Weekdays";
  }
  if (field === "0,6" || field === "6,0") {
    return "Weekends";
  }
  const days = field.split(",").map((day) => DAY_NAMES[Number(day) % 7]);
  return days.every(Boolean) ? days.join(", ") : `Days ${field}`;
}

/**
 * Converts common 5-field cron expressions to readable text, falling back to
 * the raw expression for anything it does not recognise.
 */
export function describeCron(expression: string) {
  const parts = expression.trim().split(/\s+/);
  if (parts.length !== 5) {
    return expression;
  }

  const [minute, hour, dayOfMonth, month, dayOfWeek] = parts;
  const everyMinutes = minute.match(/^\*\/(\d+)$/);
  if (everyMinutes && hour === "*" && dayOfMonth === "*" && month === "*" && dayOfWeek === "*") {
    return `Every ${everyMinutes[1]} minutes`;
  }

  if (dayOfMonth !== "*" || month !== "*" || !/^\d+$/.test(minute)) {
    return expression;
  }

  const everyHours = hour.match(/^\*\/(\d+)$/);
  if (everyHours) {
    return `Every ${everyHours[1]} hours at :${pad(minute)}`;
  }
  if (hour === "*") {
    return `Hourly at :${pad(minute)}`;
  }
  if (!/^\d+(,\d+)*$/.test(hour) || !/^(\*|\d(-\d)?(,\d)*)$/.test(dayOfWeek)) {
    return expression;
  }

  const times = hour
    .split(",")
    .map((value) => `${pad(value)}:${pad(minute)}`)
    .join(", ");
  return `${describeDays(dayOfWeek)} at ${times}`;
}

/**
 * Describes an interval schedule given in milliseconds.
 */
export function describeInterval(everyMs: number) {
  const minutes = Math.round(everyMs / 60_000);
  if (minutes % 1440 === 0) {
    return `Every ${minutes / 1440} day(s)`;
  }
  if (minutes % 60 === 0) {
    return `Every ${minutes / 60} hour(s)`;
  }
  return `Every ${minutes} minutes`;
}

/**
 * Infers the Brand OS job type from a cron name or task string.
 */
export function inferJobType(text: string) {
  const lower = text.toLowerCase();
  return JOB_TYPES.find((type) => lower.includes(type)) ?? "other";
}

/**
 * Finds which known brand a cron belongs to by matching ids in its name.
 */
export function inferBrandId(text: string, brandIds: string[]) {
  const lower = text.toLowerCase();
  return [...brandIds].sort((a, b) => b.length - a.length).find((id) => lower.includes(id.toLowerCase()));
}

/**
 * Health: grey when disabled/unknown, red after 3 consecutive failures,
 * yellow when the last run failed, green otherwise.
 */
export function computeCronHealth(job: Pick<CronEntry, "enabled" | "lastStatus" | "consecutiveFailures" | "recentRuns">): CronHealth {
  if (!job.enabled) {
    return "grey";
  }

  const runs: CronRun[] = job.recentRuns ?? [];
  const streak =
    job.consecutiveFailures ??
    (() => {
      let count = 0;
      for (const run of runs) {
        if (run.status !== "failed") {
          break;
        }
        count += 1;
      }
      return count;
    })();

  if (streak >= 3) {
    return "red";
  }
  if (job.lastStatus === "failed") {
    return "yellow";
  }
  return job.lastStatus === "ok" ? "green" : "grey";
}
