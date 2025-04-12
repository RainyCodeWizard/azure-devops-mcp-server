import { ErrorCode, McpError } from '@modelcontextprotocol/sdk/types.js';
import { AzureDevOpsConnection } from '../../api/connection.js';
import { AzureDevOpsConfig } from '../../config/environment.js';

export async function listRepositories(config: AzureDevOpsConfig) {
  AzureDevOpsConnection.initialize(config);
  const connection = AzureDevOpsConnection.getInstance();
  const gitApi = await connection.getGitApi();

  try {
    const repositories = await gitApi.getRepositories(config.projectId);
    
    // Format repository information
    const formattedRepos = repositories.map(repo => ({
      id: repo.id,
      name: repo.name,
      defaultBranch: repo.defaultBranch,
      size: repo.size,
      remoteUrl: repo.remoteUrl,
      webUrl: repo.webUrl,
    }));

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(formattedRepos, null, 2),
        },
      ],
    };
  } catch (error: unknown) {
    if (error instanceof McpError) throw error;
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    throw new McpError(
      ErrorCode.InternalError,
      `Failed to list repositories: ${errorMessage}`
    );
  }
} 