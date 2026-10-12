import { promises as fs } from "node:fs";
import path from "node:path";

import { format } from "date-fns";

const DEFAULT_WORKSPACE = "/Users/clawdraider/.openclaw/workspace-ozzymandias";
const CACHE_TTL_MS = 15_000;

type CacheStore = Map<string, { expires: number; value: unknown }>;

/**
 * Next.js bundles route handlers and pages separately, so a module-level Map
 * would give each bundle its own cache and API writes would not invalidate
 * what pages read. Keeping the store on globalThis shares it process-wide.
 */
const globalCache = globalThis as typeof globalThis & { __brandOsCache?: CacheStore };
const cacheStore: CacheStore = (globalCache.__brandOsCache ??= new Map());

export type WorkspacePaths = {
  workspace: string;
  brandsRoot: string;
  draftsRoot: string;
  uploadsRoot: string;
  scriptsRoot: string;
  postizConfigPath: string;
  globalConfigPath: string;
  cronStatePath: string;
  cronOverridesPath: string;
};

/**
 * Resolves all Brand OS workspace paths from the WORKSPACE env var.
 */
export function getPaths(): WorkspacePaths {
  const workspace = process.env.WORKSPACE || DEFAULT_WORKSPACE;
  const marketingRoot = path.join(workspace, "brand-marketing");

  return {
    workspace,
    brandsRoot: path.join(workspace, "skills", "brand-os", "brands"),
    draftsRoot: path.join(marketingRoot, "drafts"),
    uploadsRoot: path.join(marketingRoot, "uploads"),
    scriptsRoot: path.join(marketingRoot, "scripts"),
    postizConfigPath: path.join(marketingRoot, "config.json"),
    globalConfigPath: path.join(workspace, "tiktok-marketing", "config.json"),
    cronStatePath: path.join(marketingRoot, ".dashboard-crons.json"),
    cronOverridesPath: path.join(marketingRoot, ".dashboard-cron-overrides.json"),
  };
}

/**
 * Memoizes an async loader for a short TTL to avoid repeated disk reads.
 */
export async function withCache<T>(
  key: string,
  load: () => Promise<T>,
  ttlMs = CACHE_TTL_MS,
): Promise<T> {
  const cached = cacheStore.get(key);
  const now = Date.now();

  if (cached && cached.expires > now) {
    return cached.value as T;
  }

  const value = await load();
  cacheStore.set(key, { expires: now + ttlMs, value });
  return value;
}

/**
 * Drops cached entries whose key starts with the prefix (or everything).
 */
export function invalidateCache(prefix?: string) {
  if (!prefix) {
    cacheStore.clear();
    return;
  }

  for (const key of cacheStore.keys()) {
    if (key.startsWith(prefix)) {
      cacheStore.delete(key);
    }
  }
}

export async function pathExists(targetPath: string) {
  try {
    await fs.access(targetPath);
    return true;
  } catch {
    return false;
  }
}

export async function readJsonFile<T>(filePath: string, fallback: T): Promise<T> {
  try {
    const raw = await fs.readFile(filePath, "utf8");
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

/**
 * Writes text to disk, copying any existing file to a timestamped .bak first.
 */
export async function writeTextWithBackup(filePath: string, value: string) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });

  if (await pathExists(filePath)) {
    const stamp = format(new Date(), "yyyyMMdd-HHmmss");
    await fs.copyFile(filePath, `${filePath}.bak-${stamp}`);
  }

  await fs.writeFile(filePath, value, "utf8");
}

export async function writeJsonWithBackup(filePath: string, value: unknown) {
  await writeTextWithBackup(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

/**
 * Writes dashboard-owned state files where backups would only add noise.
 */
export async function writeJsonState(filePath: string, value: unknown) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

export async function readJsonLines<T>(filePath: string): Promise<T[]> {
  try {
    const raw = await fs.readFile(filePath, "utf8");
    return raw
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => JSON.parse(line) as T);
  } catch {
    return [];
  }
}

export async function listDirectories(root: string): Promise<string[]> {
  try {
    const entries = await fs.readdir(root, { withFileTypes: true });
    return entries
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name)
      .sort((a, b) => a.localeCompare(b));
  } catch {
    return [];
  }
}

export async function listFiles(root: string): Promise<string[]> {
  try {
    const entries = await fs.readdir(root, { withFileTypes: true });
    return entries
      .filter((entry) => entry.isFile())
      .map((entry) => entry.name)
      .sort((a, b) => a.localeCompare(b));
  } catch {
    return [];
  }
}

/**
 * Walks a directory tree and returns absolute paths matching the optional pattern.
 */
export async function listFilesRecursive(root: string, matcher?: RegExp): Promise<string[]> {
  const files: string[] = [];

  async function walk(currentPath: string) {
    let entries;
    try {
      entries = await fs.readdir(currentPath, { withFileTypes: true });
    } catch {
      return;
    }

    for (const entry of entries) {
      const absolute = path.join(currentPath, entry.name);
      if (entry.isDirectory()) {
        await walk(absolute);
        continue;
      }

      const relative = path.relative(root, absolute);
      if (!matcher || matcher.test(entry.name) || matcher.test(relative)) {
        files.push(absolute);
      }
    }
  }

  await walk(root);
  return files;
}

/**
 * Splits a `<yyyy-MM-dd>-<HHmm>` slot directory into date and slot parts.
 */
export function parseSlotDir(slotDir: string) {
  const match = slotDir.match(/^(\d{4}-\d{2}-\d{2})-(\d{4})$/);
  return {
    date: match?.[1] ?? "",
    slot: match?.[2] ?? "",
  };
}

/**
 * Converts a date + HHmm slot into epoch millis (0 when unparseable).
 */
export function slotTimestamp(date: string, slot: string) {
  return Date.parse(`${date}T${slot.slice(0, 2)}:${slot.slice(2)}:00`) || 0;
}

export function sortByTimestampDesc<T extends { timestamp: string }>(items: T[]) {
  return items.sort((a, b) => {
    const aTime = Date.parse(a.timestamp) || 0;
    const bTime = Date.parse(b.timestamp) || 0;
    return bTime - aTime;
  });
}

export function toRelativeWorkspacePath(absolutePath: string) {
  return path.relative(getPaths().workspace, absolutePath);
}

/**
 * Narrows unknown JSON values to plain objects, defaulting to an empty record.
 */
export function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

/**
 * Appends one JSON object as a line to a .jsonl file, adding a separating
 * newline first if the file does not already end with one.
 */
export async function appendJsonLine(filePath: string, value: unknown) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  let prefix = "";
  try {
    const handle = await fs.open(filePath, "r");
    try {
      const { size } = await handle.stat();
      if (size > 0) {
        const last = Buffer.alloc(1);
        await handle.read(last, 0, 1, size - 1);
        prefix = last.toString() === "\n" ? "" : "\n";
      }
    } finally {
      await handle.close();
    }
  } catch {
    prefix = "";
  }
  await fs.appendFile(filePath, `${prefix}${JSON.stringify(value)}\n`, "utf8");
}
