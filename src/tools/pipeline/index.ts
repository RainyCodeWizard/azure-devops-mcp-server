import { getPipelines } from './get.js';
import { triggerPipeline } from './trigger.js';
import { AzureDevOpsConfig } from '../../config/environment.js';

const definitions = [
  {
    name: 'list_pipelines',
    description: 'List all pipelines in the project',
    inputSchema: {
      type: 'object',
      properties: {
        folder: {
          type: 'string',
          description: 'Filter pipelines by folder path (optional)',
        },
        name: {
          type: 'string',
          description: 'Filter pipelines by name (optional)',
        },
      },
    },
  },
  {
    name: 'trigger_pipeline',
    description: 'Trigger a pipeline run',
    inputSchema: {
      type: 'object',
      properties: {
        pipelineId: {
          type: 'number',
          description: 'Pipeline ID to trigger',
        },
        branch: {
          type: 'string',
          description: 'Branch to run the pipeline on (optional, defaults to default branch)',
        },
        variables: {
          type: 'object',
          description: 'Pipeline variables to override (optional)',
          additionalProperties: {
            type: 'string',
          },
        },
      },
      required: ['pipelineId'],
    },
  },
];

export const pipelineTools = {
  initialize: (config: AzureDevOpsConfig) => ({
    getPipelines: (args: any) => getPipelines(args, config),
    triggerPipeline: (args: any) => triggerPipeline(args, config),
    definitions,
  }),
  definitions,
};