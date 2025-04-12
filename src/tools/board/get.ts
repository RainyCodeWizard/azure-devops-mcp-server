import { AzureDevOpsConnection } from '../../api/connection.js';
import { AzureDevOpsConfig } from '../../config/environment.js';

interface GetBoardsArgs {
  team?: string;
}

export async function getBoards(args: GetBoardsArgs, config: AzureDevOpsConfig) {
  AzureDevOpsConnection.initialize(config);
  const connection = AzureDevOpsConnection.getInstance();
  const workApi = await connection.getWorkApi();
  
  const teamContext = {
    project: config.projectId,
    team: args.team || `${config.projectId} Team`,
  };

  const boards = await workApi.getBoards(teamContext);

  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify(boards, null, 2),
      },
    ],
  };
}