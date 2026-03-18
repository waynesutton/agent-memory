"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
var env_exports = {};
__export(env_exports, {
  env: () => env
});
module.exports = __toCommonJS(env_exports);
var import_extra_typings = require("@commander-js/extra-typings");
var import_chalk = require("chalk");
var import_context = require("../bundler/context.js");
var import_api = require("./lib/api.js");
var import_command = require("./lib/command.js");
var import_utils = require("./lib/utils/utils.js");
var import_env = require("./lib/env.js");
var import_deploymentSelection = require("./lib/deploymentSelection.js");
var import_run = require("./lib/localDeployment/run.js");
const envSet = new import_extra_typings.Command("set").usage("[options] <name> <value>").arguments("[name] [value]").summary("Set a variable").description(
  "Set environment variables on your deployment.\n\n  npx convex env set NAME 'value'\n  npx convex env set NAME # omit a value to set one interactively\n  npx convex env set NAME --from-file value.txt\n  npx convex env set --from-file .env.defaults\nWhen setting multiple values, it will refuse all changes if any variables are already set to different values by default. Pass --force to overwrite the provided values.\n"
).option(
  "--from-file <file>",
  "Read environment variables from a .env file. Without --force, fails if any existing variable has a different value."
).option(
  "--force",
  "When setting multiple variables, overwrite existing environment variable values instead of failing on mismatch."
).configureHelp({ showGlobalOptions: true }).allowExcessArguments(false).action(async (name, value, cmdOptions, cmd) => {
  const options = cmd.optsWithGlobals();
  const { ctx, deployment } = await selectEnvDeployment(options);
  await (0, import_utils.ensureHasConvexDependency)(ctx, "env set");
  await (0, import_run.withRunningBackend)({
    ctx,
    deployment,
    action: async () => {
      const didAnything = await (0, import_env.envSetInDeployment)(
        ctx,
        deployment,
        name,
        value,
        cmdOptions
      );
      if (didAnything === false) {
        cmd.outputHelp({ error: true });
        return await ctx.crash({
          exitCode: 1,
          errorType: "fatal",
          printedMessage: "error: No environment variables specified to be set."
        });
      }
    }
  });
});
async function selectEnvDeployment(options) {
  const ctx = await (0, import_context.oneoffContext)(options);
  const deploymentSelection = await (0, import_deploymentSelection.getDeploymentSelection)(ctx, options);
  const {
    adminKey,
    url: deploymentUrl,
    deploymentFields
  } = await (0, import_api.loadSelectedDeploymentCredentials)(ctx, deploymentSelection, {
    ensureLocalRunning: false
  });
  const deploymentNotice = deploymentFields !== null ? ` (on ${import_chalk.chalkStderr.bold(deploymentFields.deploymentType)} deployment ${import_chalk.chalkStderr.bold(deploymentFields.deploymentName)})` : "";
  const result = {
    ctx,
    deployment: {
      deploymentUrl,
      adminKey,
      deploymentNotice,
      deploymentFields
    }
  };
  return result;
}
const envGet = new import_extra_typings.Command("get").arguments("<name>").summary("Print a variable's value").description("Print a variable's value: `npx convex env get NAME`").configureHelp({ showGlobalOptions: true }).allowExcessArguments(false).action(async (envVarName, _options, cmd) => {
  const options = cmd.optsWithGlobals();
  const { ctx, deployment } = await selectEnvDeployment(options);
  await (0, import_utils.ensureHasConvexDependency)(ctx, "env get");
  await (0, import_run.withRunningBackend)({
    ctx,
    deployment,
    action: async () => {
      await (0, import_env.envGetInDeploymentAction)(ctx, deployment, envVarName);
    }
  });
});
const envRemove = new import_extra_typings.Command("remove").alias("rm").alias("unset").arguments("<name>").summary("Unset a variable").description(
  "Unset a variable: `npx convex env remove NAME`\nIf the variable doesn't exist, the command doesn't do anything and succeeds."
).configureHelp({ showGlobalOptions: true }).allowExcessArguments(false).action(async (name, _options, cmd) => {
  const options = cmd.optsWithGlobals();
  const { ctx, deployment } = await selectEnvDeployment(options);
  await (0, import_utils.ensureHasConvexDependency)(ctx, "env remove");
  await (0, import_run.withRunningBackend)({
    ctx,
    deployment,
    action: async () => {
      await (0, import_env.envRemoveInDeployment)(ctx, deployment, name);
    }
  });
});
const envList = new import_extra_typings.Command("list").summary("List all variables").description("List all variables: `npx convex env list`").configureHelp({ showGlobalOptions: true }).allowExcessArguments(false).action(async (_options, cmd) => {
  const options = cmd.optsWithGlobals();
  const { ctx, deployment } = await selectEnvDeployment(options);
  await (0, import_utils.ensureHasConvexDependency)(ctx, "env list");
  await (0, import_run.withRunningBackend)({
    ctx,
    deployment,
    action: async () => {
      await (0, import_env.envListInDeployment)(ctx, deployment);
    }
  });
});
const env = new import_extra_typings.Command("env").summary("Set and view environment variables").description(
  "Set and view environment variables on your deployment\n\n  Set a variable: `npx convex env set NAME 'value'`\n  Set interactively: `npx convex env set NAME`\n  Set multiple from file: `npx convex env set --from-file .env`\n  Unset a variable: `npx convex env remove NAME`\n  List all variables: `npx convex env list`\n  Print a variable's value: `npx convex env get NAME`\n\nBy default, this sets and views variables on your dev deployment."
).addCommand(envSet).addCommand(envGet).addCommand(envRemove).addCommand(envList).helpCommand(false).addDeploymentSelectionOptions(
  (0, import_command.actionDescription)("Set and view environment variables on")
);
//# sourceMappingURL=env.js.map
