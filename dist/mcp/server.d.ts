export interface McpServerConfig {
    convexUrl: string;
    projectId: string;
    readOnly: boolean;
    disabledTools: string[];
    embeddingApiKey?: string;
    llmApiKey?: string;
    llmModel?: string;
}
export declare function startMcpServer(config: McpServerConfig): Promise<void>;
//# sourceMappingURL=server.d.ts.map