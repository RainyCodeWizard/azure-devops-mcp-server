import { compareBranches } from './compare.js';
import { listRepositories } from './list.js';
import { getFile } from './get.js';
import { AzureDevOpsConfig } from '../../config/environment.js';

const definitions = [
  {
    name: 'list_repositories',
    description: 'List all Git repositories in the project',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },
  {
    name: 'get_file',
    description: 'Get the content of a specific file from the repository',
    inputSchema: {
      type: 'object',
      properties: {
        repositoryId: {
          type: 'string',
          description: 'ID of the repository',
        },
        path: {
          type: 'string',
          description: 'Path to the file in the repository (e.g., "src/index.ts")',
        },
        branch: {
          type: 'string',
          description: 'Branch name to get the file from (optional, defaults to main)',
        },
        version: {
          type: 'string',
          description: 'Specific version (commit ID) to get the file from (optional)',
        },
      },
      required: ['repositoryId', 'path'],
    },
  },
  {
    name: 'compare_branches',
    description: 'Compare two branches and get commit history between them',
    inputSchema: {
      type: 'object',
      properties: {
        repositoryId: {
          type: 'string',
          description: 'ID of the repository to compare branches in',
        },
        sourceBranch: {
          type: 'string',
          description: 'Source branch name (e.g., develop)',
        },
        targetBranch: {
          type: 'string',
          description: 'Target branch name (e.g., main)',
        },
        maxCommits: {
          type: 'number',
          description: 'Maximum number of commits to return (optional, defaults to 100)',
        },
        historyMode: {
          type: 'string',
          description: 'Git history mode to use (optional, defaults to simplified)',
          enum: ['simplified', 'first-parent', 'full', 'full-simplify-merges'],
        },
        includeDetails: {
          type: 'boolean',
          description: 'Include detailed commit information including full message and changes (optional, defaults to false)',
        },
      },
      required: ['repositoryId', 'sourceBranch', 'targetBranch'],
    },
  },
];

export const gitTools = {
  initialize: (config: AzureDevOpsConfig) => ({
    listRepositories: (args: any) => listRepositories(config),
    getFile: (args: any) => getFile(args, config),
    compareBranches: (args: any) => compareBranches(args, config),
    definitions,
  }),
  definitions,
}; 