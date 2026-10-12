// Copies the fixture workspace to a fresh temp dir so e2e runs never mutate the repo copy.
import { cpSync, rmSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const target = process.env.WORKSPACE;
if (!target) {
  throw new Error("WORKSPACE must be set");
}
rmSync(target, { recursive: true, force: true });
cpSync(path.join(here, "workspace"), target, { recursive: true });
