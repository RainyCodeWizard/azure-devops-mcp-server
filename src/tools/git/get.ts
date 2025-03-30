import { ErrorCode, McpError } from '@modelcontextprotocol/sdk/types.js';
import { AzureDevOpsConnection } from '../../api/connection.js';
import { AzureDevOpsConfig } from '../../config/environment.js';
import { Readable } from 'stream';

interface GetFileArgs {
  repositoryId: string;
  path: string;
  branch?: string;
  version?: string;
}

export async function getFile(args: GetFileArgs, config: AzureDevOpsConfig) {
  AzureDevOpsConnection.initialize(config);
  const connection = AzureDevOpsConnection.getInstance();
  const gitApi = await connection.getGitApi();

  try {
    // Get the file content
    const item = await gitApi.getItem(args.repositoryId, args.path,undefined, undefined, undefined, false, false, false, {
      version: args.version || args.branch || 'main'
    });

    if (!item) {
      throw new McpError(ErrorCode.InternalError, 'File not found');
    }

    // Get the file content
    const content = await gitApi.getItemContent(args.repositoryId, args.path,undefined, undefined, undefined, false, false, false, {
      version: args.version || args.branch || 'main'
    });

    // Convert the content to text
    const chunks: Buffer[] = [];
    const stream = Readable.from(content);
    for await (const chunk of stream) {
      chunks.push(Buffer.from(chunk));
    }
    const text = Buffer.concat(chunks).toString('utf-8');

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            path: item.path,
            content: text,
            commitId: item.commitId,
          }, null, 2),
        },
      ],
    };
  } catch (error: unknown) {
    if (error instanceof McpError) throw error;
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    throw new McpError(
      ErrorCode.InternalError,
      `Failed to get file: ${errorMessage}`
    );
  }
} 