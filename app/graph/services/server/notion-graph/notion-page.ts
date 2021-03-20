import { NotionAPI } from 'notion-client';
import { RecordMap } from 'notion-types';
import { parsePageId } from 'notion-utils';

import { Logger } from '@/logger';

import { PageNode } from '../../../entities';

import { Graph } from './neo4j-page-graph';
import { getPageAttributesFromBlock } from './notion-graph.utils';

export class NotionPage {
  private readonly rootPageId: string;

  constructor(private readonly graph: Graph, private readonly notion: NotionAPI, pageId: string) {
    this.rootPageId = parsePageId(pageId);
  }

  recordMap: RecordMap;
  nestedPagesMap: {
    [pageId: string]: PageNode;
  } = {};
  discoveredPageIds: string[] = [];

  private async addToGraph({ id, title }: PageNode) {
    if (!(await this.graph.hasNode(id))) {
      await this.graph.createNode({
        id,
        title,
        hasProcessedPage: false
      });
      this.discoveredPageIds.push(id);
    }

    if (id !== this.rootPageId) {
      await this.graph.createRelationship(this.rootPageId, id);
    }
  }

  private async findPagesFromBlockContent(blockId: string) {
    const block = this.recordMap.block[blockId]?.value;

    if (!block) {
      return;
    }

    const pageAttributes = getPageAttributesFromBlock(block);

    if (pageAttributes) {
      this.nestedPagesMap[blockId] = pageAttributes;

      Logger.debug(`getAllNestedPages(${this.rootPageId}): Found page ${pageAttributes.title}`);

      await this.addToGraph(pageAttributes);
    }

    await Promise.all(
      (block.content ?? []).map(async (childBlockId) => {
        await this.findPagesFromBlockContent(childBlockId);
      })
    );
  }

  async getAllNestedPages(): Promise<string[]> {
    if ((await this.graph.getNode(this.rootPageId))?.hasProcessedPage) {
      return [];
    }

    Logger.info(`getAllNestedPages(${this.rootPageId}): Requesting record map`);

    this.recordMap = await this.notion.getPage(this.rootPageId);

    await this.findPagesFromBlockContent(this.rootPageId);

    await this.graph.updateNode(this.rootPageId, {
      hasProcessedPage: true
    });

    return this.discoveredPageIds;
  }
}
