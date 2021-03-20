import { NotionAPI } from 'notion-client';
import { parsePageId } from 'notion-utils';

import { Graph, Neo4jGraph } from './neo4j-page-graph';
import { NotionPage } from './notion-page';

export class NotionGraphGenerator {
  private readonly notion: NotionAPI;

  constructor(notionAuthToken: string) {
    this.notion = new NotionAPI({
      authToken: notionAuthToken
    });
  }

  private async traverseNotionPage(pageId: string, graph: Graph) {
    const discoveredPageIds = await new NotionPage(graph, this.notion, pageId).getAllNestedPages();

    for (const pageId of discoveredPageIds) {
      await this.traverseNotionPage(pageId, graph);
    }
  }

  async createNotionGraph(pageId: string) {
    const graph = new Neo4jGraph();

    await this.traverseNotionPage(pageId, graph);

    await graph.getNeighbours(parsePageId(pageId));

    await graph.close();
  }
}
