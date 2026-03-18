"use strict";
import { logVerbose, logMessage } from "../../../bundler/log.js";
import {
  deploymentStateDir,
  loadDeploymentConfig,
  loadUuidForAnonymousUser
} from "./filePaths.js";
import { ensureBackendBinaryDownloaded } from "./download.js";
import path from "path";
import child_process from "child_process";
import detect from "detect-port";
import { SENTRY_DSN } from "../utils/sentry.js";
import { createHash } from "crypto";
import { LocalDeploymentError } from "./errors.js";
import { LOCAL_BACKEND_INSTANCE_SECRET } from "./utils.js";
export async function runLocalBackend(ctx, args) {
  const { ports } = args;
  const deploymentDir = deploymentStateDir(
    ctx,
    args.deploymentKind,
    args.deploymentName
  );
  ctx.fs.mkdir(deploymentDir, { recursive: true });
  const deploymentNameSha = createHash("sha256").update(args.deploymentName).digest("hex");
  const commandArgs = [
    "--port",
    ports.cloud.toString(),
    "--site-proxy-port",
    ports.site.toString(),
    "--sentry-identifier",
    deploymentNameSha,
    "--instance-name",
    args.deploymentName,
    "--instance-secret",
    args.instanceSecret,
    "--local-storage",
    path.join(deploymentDir, "convex_local_storage"),
    "--beacon-tag",
    selfHostedEventTag(args.deploymentKind),
    path.join(deploymentDir, "convex_local_backend.sqlite3")
  ];
  if (args.isLatestVersion) {
    if (args.deploymentKind === "anonymous") {
      const uuid = loadUuidForAnonymousUser(ctx);
      if (uuid !== null) {
        commandArgs.push(
          "--beacon-fields",
          JSON.stringify({
            override_uuid: uuid
          })
        );
      }
    }
  }
  try {
    const result = child_process.spawnSync(args.binaryPath, [
      ...commandArgs,
      "--help"
    ]);
    if (result.status === 3221225781) {
      const message = "Local backend exited because shared libraries are missing. These may include libraries installed via 'Microsoft Visual C++ Redistributable for Visual Studio.'";
      return ctx.crash({
        exitCode: 1,
        errorType: "fatal",
        printedMessage: message,
        errForSentry: new LocalDeploymentError(
          "Local backend exited with code 3221225781"
        )
      });
    } else if (result.status !== 0) {
      const message = `Failed to run backend binary, exit code ${result.status}, error: ${result.stderr === null ? "null" : result.stderr.toString()}`;
      return ctx.crash({
        exitCode: 1,
        errorType: "fatal",
        printedMessage: message,
        errForSentry: new LocalDeploymentError(message)
      });
    }
  } catch (e) {
    const message = `Failed to run backend binary: ${e.toString()}`;
    return ctx.crash({
      exitCode: 1,
      errorType: "fatal",
      printedMessage: message,
      errForSentry: new LocalDeploymentError(message)
    });
  }
  const commandStr = `${args.binaryPath} ${commandArgs.join(" ")}`;
  logVerbose(`Starting local backend: \`${commandStr}\``);
  const p = child_process.spawn(args.binaryPath, commandArgs, {
    stdio: "ignore",
    env: {
      ...process.env,
      SENTRY_DSN
    }
  }).on("exit", (code) => {
    const why = code === null ? "from signal" : `with code ${code}`;
    logVerbose(`Local backend exited ${why}, full command \`${commandStr}\``);
  });
  const cleanupHandle = ctx.registerCleanup(async () => {
    logVerbose(`Stopping local backend on port ${ports.cloud}`);
    p.kill("SIGTERM");
  });
  await ensureBackendRunning(ctx, {
    cloudPort: ports.cloud,
    deploymentName: args.deploymentName,
    maxTimeSecs: 30
  });
  return {
    cleanupHandle
  };
}
export async function assertLocalBackendRunning(ctx, args) {
  logVerbose(`Checking local backend at ${args.url} is running`);
  const result = await fetchLocalBackendStatus(args);
  switch (result.kind) {
    case "running":
      return;
    case "different":
      return await ctx.crash({
        exitCode: 1,
        errorType: "fatal",
        printedMessage: `A different local backend ${result.name} is running at ${args.url}`
      });
    case "error":
      return await ctx.crash({
        exitCode: 1,
        errorType: "fatal",
        printedMessage: `Error response code received from local backend ${result.resp.status} ${result.resp.statusText}`
      });
    case "not-running":
      return await ctx.crash({
        exitCode: 1,
        errorType: "fatal",
        printedMessage: `Local backend isn't running. (it's not listening at ${args.url})
Run \`npx convex dev\` in another terminal first.`
      });
  }
}
export async function ensureBackendRunning(ctx, args) {
  logVerbose(`Ensuring backend running on port ${args.cloudPort} is running`);
  const deploymentUrl = localDeploymentUrl(args.cloudPort);
  let timeElapsedSecs = 0;
  let hasShownWaiting = false;
  while (timeElapsedSecs <= args.maxTimeSecs) {
    if (!hasShownWaiting && timeElapsedSecs > 2) {
      logMessage("waiting for local backend to start...");
      hasShownWaiting = true;
    }
    try {
      const resp = await fetch(`${deploymentUrl}/instance_name`);
      if (resp.status === 200) {
        const text = await resp.text();
        if (text !== args.deploymentName) {
          return await ctx.crash({
            exitCode: 1,
            errorType: "fatal",
            printedMessage: `A different local backend ${text} is running on selected port ${args.cloudPort}`
          });
        } else {
          return;
        }
      } else {
        await new Promise((resolve) => setTimeout(resolve, 500));
        timeElapsedSecs += 0.5;
      }
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 500));
      timeElapsedSecs += 0.5;
    }
  }
  const message = `Local backend did not start on port ${args.cloudPort} within ${args.maxTimeSecs} seconds.`;
  return await ctx.crash({
    exitCode: 1,
    errorType: "fatal",
    printedMessage: message,
    errForSentry: new LocalDeploymentError(message)
  });
}
export async function ensureBackendStopped(ctx, args) {
  logVerbose(`Ensuring backend running on port ${args.ports.cloud} is stopped`);
  let timeElapsedSecs = 0;
  while (timeElapsedSecs < args.maxTimeSecs) {
    const cloudPort = await detect(args.ports.cloud);
    const sitePort = args.ports.site === void 0 ? void 0 : await detect(args.ports.site);
    if (cloudPort === args.ports.cloud && sitePort === args.ports.site) {
      return;
    }
    try {
      const instanceNameResp = await fetch(
        `${localDeploymentUrl(args.ports.cloud)}/instance_name`
      );
      if (instanceNameResp.ok) {
        const instanceName = await instanceNameResp.text();
        if (instanceName !== args.deploymentName) {
          if (args.allowOtherDeployments) {
            return;
          }
          return await ctx.crash({
            exitCode: 1,
            errorType: "fatal",
            printedMessage: `A different local backend ${instanceName} is running on selected port ${args.ports.cloud}`
          });
        }
      }
    } catch (error) {
      logVerbose(`Error checking if backend is running: ${error.message}`);
      continue;
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
    timeElapsedSecs += 0.5;
  }
  return ctx.crash({
    exitCode: 1,
    errorType: "fatal",
    printedMessage: `A local backend is still running on port ${args.ports.cloud}. Please stop it and run this command again.`
  });
}
export function localDeploymentUrl(cloudPort) {
  return `http://127.0.0.1:${cloudPort}`;
}
export function selfHostedEventTag(deploymentKind) {
  return deploymentKind === "local" ? "cli-local-dev" : "cli-anonymous-dev";
}
async function fetchLocalBackendStatus(args) {
  logVerbose(`Checking local backend at ${args.url} is running`);
  try {
    const resp = await fetch(`${args.url}/instance_name`);
    if (resp.status === 200) {
      const text = await resp.text();
      if (text !== args.deploymentName) {
        return { kind: "different", name: text };
      } else {
        return { kind: "running" };
      }
    } else {
      return { kind: "error", resp };
    }
  } catch {
    return { kind: "not-running" };
  }
}
export async function isLocalBackendRunning(url, deploymentName) {
  return "running" === (await fetchLocalBackendStatus({ url, deploymentName })).kind;
}
export function shouldUseLocalDeployment(deploymentType) {
  return deploymentType === "local" || deploymentType === "anonymous";
}
export async function withRunningBackend({
  ctx,
  deployment,
  action
}) {
  let cleanup = null;
  if (deployment.deploymentFields && shouldUseLocalDeployment(deployment.deploymentFields.deploymentType)) {
    const isRunning = await isLocalBackendRunning(
      deployment.deploymentUrl,
      deployment.deploymentFields.deploymentName
    );
    if (!isRunning) {
      ({ cleanup } = await startEphemeralLocalBackend(ctx, {
        deploymentType: deployment.deploymentFields.deploymentType,
        deploymentName: deployment.deploymentFields.deploymentName
      }));
    }
  }
  try {
    await action();
  } finally {
    await cleanup?.();
  }
}
async function startEphemeralLocalBackend(ctx, args) {
  const deploymentKind = args.deploymentType === "anonymous" ? "anonymous" : "local";
  const config = loadDeploymentConfig(ctx, deploymentKind, args.deploymentName);
  if (config === null) {
    return ctx.crash({
      exitCode: 1,
      errorType: "fatal",
      printedMessage: `Local backend isn't running and no saved configuration found.
Run \`npx convex dev\` first.`
    });
  }
  const { binaryPath } = await ensureBackendBinaryDownloaded(ctx, {
    kind: "version",
    version: config.backendVersion
  });
  const instanceSecret = config.instanceSecret ?? LOCAL_BACKEND_INSTANCE_SECRET;
  const { cleanupHandle } = await runLocalBackend(ctx, {
    binaryPath,
    ports: config.ports,
    deploymentKind,
    deploymentName: args.deploymentName,
    instanceSecret,
    isLatestVersion: true
  });
  return {
    cleanup: async () => {
      const fn = ctx.removeCleanup(cleanupHandle);
      if (fn) {
        await fn(0);
      }
    }
  };
}
//# sourceMappingURL=run.js.map
