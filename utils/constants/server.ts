import { getStringEnvVar } from '@/constants/utils';

export const ServerConstants = {
  notionApiKey: getStringEnvVar('NOTION_API_KEY'),
  neo4j: {
    url: getStringEnvVar('NEO4J_URL'),
    username: getStringEnvVar('NEO4J_USERNAME'),
    password: getStringEnvVar('NEO4J_PASSWORD')
  }
};
