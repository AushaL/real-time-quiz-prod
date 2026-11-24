/**
 * Cross-platform wrapper around `docker compose`.
 *
 * On this machine a global npm package named `docker` (a documentation
 * generator) shadows the real Docker CLI. The wrapper prefers the Docker
 * Desktop binary and only falls back to `docker` from PATH.
 */
import { existsSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { homedir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(here, "..");

const localAppData =
  process.env.LOCALAPPDATA ?? join(homedir(), "AppData", "Local");
const programFiles = process.env.ProgramFiles ?? "C:\\Program Files";

const candidates = [
  process.env.DOCKER_BIN,
  join(
    localAppData,
    "Programs",
    "DockerDesktop",
    "resources",
    "bin",
    "docker.exe",
  ),
  join(programFiles, "Docker", "Docker", "resources", "bin", "docker.exe"),
  "docker",
].filter(Boolean);

const docker =
  candidates.find((candidate) =>
    candidate === "docker" ? true : existsSync(candidate),
  ) ?? "docker";

const result = spawnSync(docker, ["compose", ...process.argv.slice(2)], {
  cwd: projectRoot,
  stdio: "inherit",
});

if (result.error) {
  console.error(`Failed to run Docker (${docker}):`, result.error.message);
  process.exit(1);
}

process.exit(result.status ?? 1);
