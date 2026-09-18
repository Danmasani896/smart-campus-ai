// Dev runner: compile once, then keep tsc --watch and the API server alive.
// The server is restarted whenever it exits on its own (crash or watcher hiccup).
const { spawn, spawnSync } = require("node:child_process");
const path = require("node:path");
const compiler = path.resolve("node_modules/typescript/bin/tsc");
const initial = spawnSync(process.execPath, [compiler], { stdio: "inherit" });
if (initial.status !== 0) process.exit(initial.status || 1);
const compile = spawn(
  process.execPath,
  [compiler, "--watch", "--preserveWatchOutput"],
  {
    stdio: "inherit",
  },
);
let server = null;
let stopping = false;
function startServer() {
  server = spawn(process.execPath, ["--watch", "dist/main.js"], {
    stdio: "inherit",
  });
  server.on("exit", (code, signal) => {
    if (stopping) return;
    console.error(
      `[dev] API server exited (${signal || code}); restarting in 1s…`,
    );
    setTimeout(startServer, 1000);
  });
}
startServer();
function stop() {
  stopping = true;
  compile.kill();
  server?.kill();
  process.exit();
}
process.on("SIGINT", stop);
process.on("SIGTERM", stop);
