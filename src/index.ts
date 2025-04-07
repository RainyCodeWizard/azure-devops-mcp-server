#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ErrorCode,
  ListToolsRequestSchema,
  McpError,
  JSONRPCResponseSchema,
  JSONRPCResponse,
  ServerCapabilities,
  ListToolsResult,
} from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';

// Import all tools
import { workItemTools } from './tools/work-item/index.js';
import { boardTools } from './tools/board/index.js';
import { wikiTools } from './tools/wiki/index.js';
import { projectTools } from './tools/project/index.js';
import { pipelineTools } from './tools/pipeline/index.js';
import { pullRequestTools } from './tools/pull-request/index.js';
import { gitTools } from './tools/git/index.js';
import { AzureDevOpsConfig, createConfig } from './config/environment.js';
// Import specific argument types from azure-devops-node-api
import type { WorkItemBatchGetRequest, Wiql } from 'azure-devops-node-api/interfaces/WorkItemTrackingInterfaces.js';
import type { JsonPatchOperation } from 'azure-devops-node-api/interfaces/common/VSSInterfaces.js';

// Define a type for the input schema based on linter feedback
interface ToolInputSchema {
  type: "object"; // Expected literal type
  properties?: { [key: string]: unknown };
  required?: string[];
  // Allow other properties present in definitions
  [key: string]: unknown; 
}

// Define a type based on observed structure and linter feedback
interface ToolDefinitionType {
  name: string;
  description?: string; // Optional as hinted by linter
  inputSchema: ToolInputSchema; 
  // Allow other properties present in definitions
  [key: string]: unknown; 
}

// Define the ToolInstances interface based on observed initialize return types
interface ToolInstances {
  workItem: ReturnType<typeof workItemTools.initialize>;
  board: ReturnType<typeof boardTools.initialize>;
  wiki: ReturnType<typeof wikiTools.initialize>;
  project: ReturnType<typeof projectTools.initialize>;
  pipeline: ReturnType<typeof pipelineTools.initialize>;
  pullRequest: ReturnType<typeof pullRequestTools.initialize>;
  git: ReturnType<typeof gitTools.initialize>;
}

// Type Validations
function validateArgs<T>(args: Record<string, unknown> | undefined, errorMessage: string): T {
  if (!args) {
    throw new McpError(ErrorCode.InvalidParams, errorMessage);
  }
  return args as T;
}

type MCPResponse = JSONRPCResponse["result"]

// Response Formatting
function formatResponse(data: unknown): MCPResponse {
  if (data && typeof data === 'object' && 'content' in data) {
    return data as MCPResponse;
  }
  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify(data, null, 2),
      },
    ],
  };
}

class AzureDevOpsServer {
  private server: Server;
  private config: AzureDevOpsConfig;
  private toolDefinitions: ToolDefinitionType[];

  constructor(options?: Partial<Omit<AzureDevOpsConfig, 'orgUrl'>>) {
    this.config = createConfig(options);
    
    // Initialize tools with config
    const toolInstances: ToolInstances = {
      workItem: workItemTools.initialize(this.config),
      board: boardTools.initialize(this.config),
      wiki: wikiTools.initialize(this.config),
      project: projectTools.initialize(this.config),
      pipeline: pipelineTools.initialize(this.config),
      pullRequest: pullRequestTools.initialize(this.config),
      git: gitTools.initialize(this.config),
    };

    // Combine all tool definitions and assert the type
    this.toolDefinitions = [
      ...toolInstances.workItem.definitions,
      ...toolInstances.board.definitions,
      ...toolInstances.wiki.definitions,
      ...toolInstances.project.definitions,
      ...toolInstances.pipeline.definitions,
      ...toolInstances.pullRequest.definitions,
      ...toolInstances.git.definitions,
    ] as ToolDefinitionType[];

    this.server = new Server(
      {
        name: 'azure-devops-server',
        version: '0.1.0',
      },
      {
        capabilities: {
          tools: {},
        } as ServerCapabilities,
      }
    );

    this.setupToolHandlers(toolInstances);
    
    // Error handling
    this.server.onerror = (error) => console.error('[MCP Error]', error);
    process.on('SIGINT', async () => {
      await this.server.close();
      process.exit(0);
    });
  }

  private setupToolHandlers(tools: ToolInstances) {
    // List available tools
    this.server.setRequestHandler(ListToolsRequestSchema, async (): Promise<ListToolsResult> => ({
      tools: this.toolDefinitions,
    }));

    // Handle tool calls
    this.server.setRequestHandler(CallToolRequestSchema, async (request, extra) => {
      try {
        let result;
        switch (request.params.name) {
          // Work Item Tools
          case 'get_work_item':
            result = await tools.workItem.getWorkItem(
              validateArgs<WorkItemBatchGetRequest>(request.params.arguments, 'Work item IDs required')
            );
            break;
          case 'list_work_items':
            result = await tools.workItem.listWorkItems(
              validateArgs<Wiql>(request.params.arguments, 'WIQL query required')
            );
            break;
          case 'create_work_item': // Assuming createWorkItem exists and needs validation
            result = await tools.workItem.createWorkItem(
              validateArgs<{ type: string; document: JsonPatchOperation[] }>(request.params.arguments, 'Work item creation arguments required')
            );
            break;
          case 'update_work_item': // Assuming updateWorkItem exists and needs validation
             result = await tools.workItem.updateWorkItem(
              validateArgs<{ id: number; document: JsonPatchOperation[] }>(request.params.arguments, 'Work item update arguments required')
            );
             break;
          
          // Board Tools
          case 'get_boards':
            result = await tools.board.getBoards(
              validateArgs<{ team?: string }>(request.params.arguments, 'Board arguments required')
            );
            break;
          
          // Wiki Tools
          case 'get_wikis':
            result = await tools.wiki.getWikis(
              validateArgs<Record<string, never>>(request.params.arguments, 'Wiki list arguments required')
            );
            break;
          case 'get_wiki_page':
            result = await tools.wiki.getWikiPage(
              validateArgs<{ wikiIdentifier: string; path: string; version?: string; includeContent?: boolean }>(request.params.arguments, 'Wiki page arguments required')
            );
            break;
          case 'create_wiki':
            result = await tools.wiki.createWiki(
              validateArgs<{ name: string; projectId?: string; mappedPath?: string }>(request.params.arguments, 'Wiki creation arguments required')
            );
            break;
          case 'update_wiki_page':
            result = await tools.wiki.updateWikiPage(
              validateArgs<{ wikiIdentifier: string; path: string; content: string; comment?: string }>(request.params.arguments, 'Wiki page update arguments required')
            );
            break;
          
          // Project Tools
          case 'list_projects':
            // No specific args needed validation, but use validateArgs for consistency
            result = await tools.project.listProjects(
              validateArgs<Record<string, unknown>>(request.params.arguments, 'Project list arguments required')
            );
            break;

          // Pipeline Tools
          case 'list_pipelines':
            result = await tools.pipeline.getPipelines(
              validateArgs<{ folder?: string; name?: string }>(request.params.arguments, 'Pipeline arguments required')
            );
            break;
          case 'trigger_pipeline':
            result = await tools.pipeline.triggerPipeline(
              validateArgs<{ pipelineId: number; branch?: string; variables?: { [key: string]: string } }>(request.params.arguments, 'Pipeline trigger arguments required')
            );
            break;

          // Git Tools
          case 'list_repositories':
            result = await tools.git.listRepositories(
               validateArgs<Record<string, never>>(request.params.arguments, 'Repository list arguments required')
            );
            break;
          case 'get_file':
            result = await tools.git.getFile(
              validateArgs<{ repositoryId: string; path: string; branch?: string; version?: string }>(request.params.arguments, 'Get file arguments required')
            );
            break;
          case 'compare_branches':
            result = await tools.git.compareBranches(
              validateArgs<{ repositoryId: string; sourceBranch: string; targetBranch: string; maxCommits?: number; historyMode?: string; includeDetails?: boolean }>(request.params.arguments, 'Branch comparison arguments required')
            );
            break;

          // Pull Request Tools
          case 'list_pull_requests':
            result = await tools.pullRequest.getPullRequests(
              validateArgs<{ status?: string; creatorId?: string; repositoryId: string }>(request.params.arguments, 'Pull request list arguments required')
            );
            break;
          case 'get_pull_request':
            result = await tools.pullRequest.getPullRequest(
              validateArgs<{ pullRequestId: number }>(request.params.arguments, 'Pull request ID required')
            );
            break;
          case 'create_pull_request':
            result = await tools.pullRequest.createPullRequest(
              validateArgs<{ repositoryId: string; sourceRefName: string; targetRefName: string; title: string; description?: string; reviewers?: string[] }>(request.params.arguments, 'Pull request creation arguments required')
            );
            break;
          case 'update_pull_request':
            result = await tools.pullRequest.updatePullRequest(
              validateArgs<{ pullRequestId: number; status?: string; title?: string; description?: string; mergeStrategy?: string }>(request.params.arguments, 'Pull request update arguments required')
            );
            break;
          
          default:
            throw new McpError(
              ErrorCode.MethodNotFound,
              `Unknown tool: ${request.params.name}`
            );
        }

        // Ensure consistent response format
        const response = formatResponse(result);
        return {
          _meta: request.params._meta,
          ...response
        };
      } catch (error: unknown) {
        if (error instanceof McpError) throw error;
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        throw new McpError(
          ErrorCode.InternalError,
          `Azure DevOps API error: ${errorMessage}`
        );
      }
    });
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('Azure DevOps MCP server running on stdio');
  }
}

// Allow configuration through constructor or environment variables
const server = new AzureDevOpsServer();
server.run().catch(console.error);
