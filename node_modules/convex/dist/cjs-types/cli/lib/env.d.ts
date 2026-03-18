import { Context } from "../../bundler/context.js";
export declare function envSetInDeployment(ctx: Context, deployment: {
    deploymentUrl: string;
    adminKey: string;
    deploymentNotice: string;
}, originalName: string | undefined, originalValue: string | undefined, options?: {
    fromFile?: string;
    force?: boolean;
    secret?: boolean;
}): Promise<boolean>;
export declare function envGetInDeploymentAction(ctx: Context, deployment: {
    deploymentUrl: string;
    adminKey: string;
}, name: string): Promise<void>;
export declare function envGetInDeployment(ctx: Context, deployment: {
    deploymentUrl: string;
    adminKey: string;
}, name: string): Promise<string | null>;
export declare function envRemoveInDeployment(ctx: Context, deployment: {
    deploymentUrl: string;
    adminKey: string;
    deploymentNotice: string;
}, name: string): Promise<void>;
export declare function envListInDeployment(ctx: Context, deployment: {
    deploymentUrl: string;
    adminKey: string;
}): Promise<void>;
export type EnvVarChange = {
    name: string;
    value?: string;
};
export type EnvVar = {
    name: string;
    value: string;
};
export declare function callUpdateEnvironmentVariables(ctx: Context, deployment: {
    deploymentUrl: string;
    adminKey: string;
    deploymentNotice: string;
}, changes: EnvVarChange[]): Promise<undefined>;
export declare function fetchDeploymentCanonicalSiteUrl(ctx: Context, options: {
    deploymentUrl: string;
    adminKey: string;
}): Promise<string>;
//# sourceMappingURL=env.d.ts.map