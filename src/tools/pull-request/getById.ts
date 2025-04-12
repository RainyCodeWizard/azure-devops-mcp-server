import { ErrorCode, McpError } from '@modelcontextprotocol/sdk/types.js';
import { AzureDevOpsConnection } from '../../api/connection.js';
import { AzureDevOpsConfig } from '../../config/environment.js';

interface GetPullRequestArgs {
  pullRequestId: number;
}

export async function getPullRequest(args: GetPullRequestArgs, config: AzureDevOpsConfig) {
  if (!args.pullRequestId) {
    throw new McpError(ErrorCode.InvalidParams, 'Pull Request ID is required');
  }

  AzureDevOpsConnection.initialize(config);
  const connection = AzureDevOpsConnection.getInstance();
  const gitApi = await connection.getGitApi();

  try {
    // Get specific PR by ID
    const pullRequest = await gitApi.getPullRequestById(args.pullRequestId, config.projectId);
    
    if (!pullRequest) {
      throw new McpError(
        ErrorCode.InternalError,
        `Pull Request with ID ${args.pullRequestId} not found`
      );
    }

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(pullRequest, null, 2),
        },
      ],
    };
  } catch (error: unknown) {
    if (error instanceof McpError) throw error;
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    throw new McpError(
      ErrorCode.InternalError,
      `Failed to get pull request: ${errorMessage}`
    );
  }
} 