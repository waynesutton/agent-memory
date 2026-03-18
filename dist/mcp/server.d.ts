export interface McpServerConfig {
    convexUrl: string;
    projectId: string;
    readOnly: boolean;
    disabledTools: string[];
    embeddingApiKey?: string;
}
export declare function startMcpServer(config: McpServerConfig): Promise<void>;
//# sourceMappingURL=server.d.ts.map