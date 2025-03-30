import { ErrorCode, McpError } from '@modelcontextprotocol/sdk/types.js';
import { AzureDevOpsConnection } from '../../api/connection.js';
import { AzureDevOpsConfig } from '../../config/environment.js';
import { GitHistoryMode, GitCommitChanges } from 'azure-devops-node-api/interfaces/GitInterfaces.js';

interface CompareBranchesArgs {
  repositoryId: string;
  sourceBranch: string;
  targetBranch: string;
  maxCommits?: number;
  historyMode?: 'simplified' | 'first-parent' | 'full' | 'full-simplify-merges';
  includeDetails?: boolean;
}

const historyModeMap: Record<string, GitHistoryMode> = {
  'simplified': GitHistoryMode.SimplifiedHistory,
  'first-parent': GitHistoryMode.FirstParent,
  'full': GitHistoryMode.FullHistory,
  'full-simplify-merges': GitHistoryMode.FullHistorySimplifyMerges,
};

export async function compareBranches(args: CompareBranchesArgs, config: AzureDevOpsConfig) {
  AzureDevOpsConnection.initialize(config);
  const connection = AzureDevOpsConnection.getInstance();
  const gitApi = await connection.getGitApi();

  try {
    // Get the commit history between branches
    const commits = await gitApi.getCommits(args.repositoryId, {
      itemVersion: {
        version: args.targetBranch,
      },
      compareVersion: {
        version: args.sourceBranch,
      },
      $top: args.maxCommits || 100,
      historyMode: args.historyMode ? historyModeMap[args.historyMode] : GitHistoryMode.SimplifiedHistory,
    });

    // Get detailed information for each commit if requested
    const formattedCommits = await Promise.all(commits.map(async commit => {
      const baseInfo = {
        commitId: commit.commitId,
        author: commit.author?.name,
        date: commit.author?.date,
        message: commit.comment,
      };

      if (!args.includeDetails || !commit.commitId) {
        return baseInfo;
      }

      // Get detailed commit information
      const detailedCommit = await gitApi.getCommit(commit.commitId, args.repositoryId);
      
      // Get changes in this commit
      const changes = await gitApi.getChanges(commit.commitId, args.repositoryId);
      const changeList = Array.isArray(changes.changes) ? changes.changes : [];

      return {
        ...baseInfo,
        fullMessage: detailedCommit.comment,
        changes: changes
      };
    }));

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(formattedCommits, null, 2),
        },
      ],
    };
  } catch (error: unknown) {
    if (error instanceof McpError) throw error;
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    throw new McpError(
      ErrorCode.InternalError,
      `Failed to compare branches: ${errorMessage}`
    );
  }
} 