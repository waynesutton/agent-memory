"use strict";
import { chalkStderr } from "chalk";
import * as dotenv from "dotenv";
import {
  logFailure,
  logFinishedStep,
  logMessage,
  logOutput
} from "../../bundler/log.js";
import { runSystemQuery } from "./run.js";
import { deploymentFetch, logAndHandleFetchError } from "./utils/utils.js";
import { readFromStdin } from "./utils/stdin.js";
import { promptSecret } from "./utils/prompts.js";
import {
  EXPECTED_CONVEX_URL_NAMES,
  EXPECTED_SITE_URL_NAMES
} from "./envvars.js";
import { formatEnvValueForDotfile } from "./formatEnvValueForDotfile.js";
import {
  CONVEX_DEPLOY_KEY_ENV_VAR_NAME,
  CONVEX_DEPLOYMENT_ENV_VAR_NAME,
  CONVEX_SELF_HOSTED_URL_VAR_NAME,
  CONVEX_SELF_HOSTED_ADMIN_KEY_VAR_NAME
} from "./utils/utils.js";
function formatList(items) {
  if (items.length === 0) return "";
  if (items.length === 1) return items[0];
  if (items.length === 2) return `${items[0]} and ${items[1]}`;
  return `${items.slice(0, -1).join(", ")}, and ${items[items.length - 1]}`;
}
export async function envSetInDeployment(ctx, deployment, originalName, originalValue, options) {
  const { fromFile, force = false } = options ?? {};
  if (originalName) {
    let name = originalName, value;
    const parsed = await allowEqualsSyntax(ctx, originalName, originalValue);
    if (parsed) {
      [name, value] = parsed;
    } else if (fromFile) {
      value = await getFileContents(ctx, fromFile);
    } else if (!process.stdin.isTTY) {
      value = await getStdIn(ctx);
    } else {
      value = await promptSecret(ctx, {
        message: `Enter value for ${name}:`
      });
    }
    await callUpdateEnvironmentVariables(ctx, deployment, [{ name, value }]);
    if (options?.secret) {
      const formatted = /\s/.test(value) ? `"${value}"` : value;
      logFinishedStep(
        `Successfully set ${chalkStderr.bold(name)} to ${chalkStderr.bold(formatted)}${deployment.deploymentNotice}`
      );
    } else {
      logFinishedStep(`Successfully set ${chalkStderr.bold(name)}`);
    }
    return true;
  }
  let content, source;
  if (fromFile) {
    content = await getFileContents(ctx, fromFile);
    source = fromFile;
  } else if (!process.stdin.isTTY) {
    content = await getStdIn(ctx);
    source = "stdin";
  } else {
    return false;
  }
  await envSetFromContentInDeployment(ctx, deployment, {
    content,
    source,
    force
  });
  return true;
}
async function getFileContents(ctx, filePath) {
  if (!ctx.fs.exists(filePath)) {
    return await ctx.crash({
      exitCode: 1,
      errorType: "fatal",
      printedMessage: `error: file not found: ${filePath}`
    });
  }
  return ctx.fs.readUtf8File(filePath);
}
async function getStdIn(ctx) {
  try {
    return await readFromStdin();
  } catch (error) {
    return await ctx.crash({
      exitCode: 1,
      errorType: "fatal",
      printedMessage: `error: failed to read from stdin: ${error instanceof Error ? error.message : String(error)}`
    });
  }
}
async function envSetFromContentInDeployment(ctx, deployment, options) {
  const { content, source, force } = options;
  const parsedEnv = dotenv.parse(content);
  const envVars = Object.entries(parsedEnv);
  const filteredVars = [];
  const envVarsToSet = [];
  const managedVars = /* @__PURE__ */ new Set([
    CONVEX_DEPLOY_KEY_ENV_VAR_NAME,
    CONVEX_DEPLOYMENT_ENV_VAR_NAME,
    CONVEX_SELF_HOSTED_URL_VAR_NAME,
    CONVEX_SELF_HOSTED_ADMIN_KEY_VAR_NAME,
    ...EXPECTED_CONVEX_URL_NAMES,
    ...EXPECTED_SITE_URL_NAMES
  ]);
  for (const [name, value] of envVars) {
    if (managedVars.has(name)) {
      filteredVars.push(name);
    } else {
      envVarsToSet.push([name, value]);
    }
  }
  if (filteredVars.length > 0) {
    const varNames = filteredVars.map((n) => chalkStderr.bold(n));
    const formattedNames = formatList(varNames);
    logMessage(
      `Skipping ${filteredVars.length} CLI-managed environment variable${filteredVars.length === 1 ? "" : "s"}: ${formattedNames}`
    );
  }
  if (envVarsToSet.length === 0) {
    if (envVars.length === 0) {
      logMessage(`No environment variables found in ${source}.`);
    }
    return;
  }
  const existingEnvVars = await getEnvVars(ctx, deployment);
  const existingEnvMap = new Map(
    existingEnvVars.map((env) => [env.name, env.value])
  );
  const newVars = [];
  const updatedVars = [];
  const unchangedVars = [];
  const conflicts = [];
  for (const [name, value] of envVarsToSet) {
    const existingValue = existingEnvMap.get(name);
    if (existingValue === void 0) {
      newVars.push([name, value]);
    } else if (existingValue === value) {
      unchangedVars.push([name, value]);
    } else if (force) {
      updatedVars.push([name, value]);
    } else {
      conflicts.push({ name, existing: existingValue, new: value });
    }
  }
  if (conflicts.length > 0) {
    const varNames = conflicts.map((c) => chalkStderr.bold(c.name));
    const formattedNames = formatList(varNames);
    return await ctx.crash({
      exitCode: 1,
      errorType: "fatal",
      printedMessage: `error: environment variable${conflicts.length === 1 ? "" : "s"} ${formattedNames} already exist${conflicts.length === 1 ? "s" : ""} with different value${conflicts.length === 1 ? "" : "s"}.

Use ${chalkStderr.bold("--force")} to overwrite existing values.`
    });
  }
  const varsToUpdate = force ? [...newVars, ...updatedVars] : newVars;
  const changes = varsToUpdate.map(([name, value]) => ({
    name,
    value
  }));
  if (changes.length > 0) {
    await callUpdateEnvironmentVariables(ctx, deployment, changes);
  }
  const newCount = newVars.length;
  const updatedCount = updatedVars.length;
  const unchangedCount = unchangedVars.length;
  const parts = [];
  if (newCount > 0) parts.push(`${newCount} new`);
  if (updatedCount > 0) parts.push(`${updatedCount} updated`);
  if (unchangedCount > 0) parts.push(`${unchangedCount} unchanged`);
  const totalProcessed = newCount + updatedCount + unchangedCount;
  if (changes.length === 0) {
    logMessage(
      `All ${totalProcessed} environment variable${totalProcessed === 1 ? "" : "s"} from ${chalkStderr.bold(source)} already set${deployment.deploymentNotice}`
    );
  } else {
    logFinishedStep(
      `Successfully set ${changes.length} environment variable${changes.length === 1 ? "" : "s"} from ${chalkStderr.bold(source)} (${parts.join(", ")})${deployment.deploymentNotice}`
    );
  }
}
async function allowEqualsSyntax(ctx, name, value) {
  if (/^[a-zA-Z][a-zA-Z0-9_]*=/.test(name)) {
    const [n, ...values] = name.split("=");
    if (value === void 0) {
      return [n, values.join("=")];
    } else {
      await ctx.crash({
        exitCode: 1,
        errorType: "fatal",
        printedMessage: `When setting an environment variable, you can either set a value with 'NAME=value', or with NAME value, but not both. Are you missing quotes around the CLI argument? Try: 
  npx convex env set '${name} ${value}'`
      });
    }
  }
  if (value === void 0) return null;
  return [name, value];
}
export async function envGetInDeploymentAction(ctx, deployment, name) {
  const envVar = await envGetInDeployment(ctx, deployment, name);
  if (envVar === null) {
    logFailure(`Environment variable "${name}" not found.`);
    return;
  }
  logOutput(`${envVar}`);
}
export async function envGetInDeployment(ctx, deployment, name) {
  const envVar = await runSystemQuery(ctx, {
    ...deployment,
    functionName: "_system/cli/queryEnvironmentVariables:get",
    componentPath: void 0,
    args: { name }
  });
  return envVar === null ? null : envVar.value;
}
export async function envRemoveInDeployment(ctx, deployment, name) {
  await callUpdateEnvironmentVariables(ctx, deployment, [{ name }]);
  logFinishedStep(
    `Successfully unset ${chalkStderr.bold(name)}${deployment.deploymentNotice}`
  );
}
async function getEnvVars(ctx, deployment) {
  return await runSystemQuery(ctx, {
    ...deployment,
    functionName: "_system/cli/queryEnvironmentVariables",
    componentPath: void 0,
    args: {}
  });
}
export async function envListInDeployment(ctx, deployment) {
  const envs = await getEnvVars(ctx, deployment);
  if (envs.length === 0) {
    logMessage("No environment variables set.");
    return;
  }
  for (const { name, value } of envs) {
    const { formatted, warning } = formatEnvValueForDotfile(value);
    if (warning) {
      logMessage(`Warning (${name}): ${warning}`);
    }
    logOutput(`${name}=${formatted}`);
  }
}
export async function callUpdateEnvironmentVariables(ctx, deployment, changes) {
  const fetch = deploymentFetch(ctx, deployment);
  try {
    await fetch("/api/update_environment_variables", {
      body: JSON.stringify({ changes }),
      method: "POST"
    });
  } catch (e) {
    return await logAndHandleFetchError(ctx, e);
  }
}
export async function fetchDeploymentCanonicalSiteUrl(ctx, options) {
  const result = await envGetInDeployment(ctx, options, "CONVEX_SITE_URL");
  if (typeof result !== "string") {
    return await ctx.crash({
      exitCode: 1,
      errorType: "invalid filesystem or env vars",
      printedMessage: "Invalid process.env.CONVEX_SITE_URL"
    });
  }
  return result;
}
//# sourceMappingURL=env.js.map
