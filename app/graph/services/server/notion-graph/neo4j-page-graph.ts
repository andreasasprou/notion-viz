import neo4j from 'neo4j-driver';
import { Driver } from 'neo4j-driver/types/driver';

import { ServerConstants } from '@/constants/server';

import { PageNode } from '../../../entities';

export interface Graph {
  getNode(id: string): Promise<PageNode | undefined>;
  hasNode(id: string): Promise<boolean>;
  createNode(data: PageNode): Promise<PageNode>;
  createRelationship(from: string, to: string): Promise<void>;
  updateNode(id: string, data: Pick<PageNode, 'hasProcessedPage'>): Promise<PageNode>;
}

export class Neo4jGraph implements Graph {
  private readonly driver: Driver;

  constructor() {
    this.driver = neo4j.driver(
      ServerConstants.neo4j.url,
      neo4j.auth.basic(ServerConstants.neo4j.username, ServerConstants.neo4j.password)
    );
  }

  async getGraph() {
    const session = this.driver.session();

    try {
      const result = await session.run(
        `
        MATCH (a)-[r:REFERENCES]->(b)
        RETURN a, r, b
      `
      );

      const relationships: {
        id: string;
        startNodeId: string;
        endNodeId: string;
        type: string;
        properties?: any;
        labels: string[];
      }[] = [];
      const nodes: {
        id: string;
        properties: PageNode;
        labels: string[];
      }[] = [];

      result.records.forEach((record) => {
        const n1 = record.get(0).properties;
        const rel = record.get(1);
        const n2 = record.get(2).properties;

        relationships.push({
          id: rel.identity.low,
          startNodeId: n1.id,
          endNodeId: n2.id,
          type: 'References',
          properties: {},
          labels: []
        });

        const newNodes = [n1, n2];

        newNodes.forEach((newNode) => {
          if (!nodes.map((node) => node.id).includes(newNode.id)) {
            nodes.push({
              id: newNode.id,
              properties: newNode,
              labels: []
            });
          }
        });
      });

      return {
        nodes,
        relationships
      };
    } finally {
      await session.close();
    }
  }

  async getNeighbours(pageId: string) {
    const session = this.driver.session();

    try {
      const result = await session.run(
        `
        MATCH (p1:Page {id: $from})
        RETURN p1
      `,
        {
          from: pageId
        }
      );

      console.log(result.records);
    } finally {
      await session.close();
    }
  }

  async close() {
    await this.driver.close();
  }

  async createNode(data: PageNode): Promise<PageNode> {
    const session = this.driver.session();

    try {
      const result = await session.run(
        'CREATE (p:Page {id: $id, title: $title, hasProcessedPage: $hasProcessedPage}) RETURN p',
        {
          id: data.id,
          title: data.title,
          hasProcessedPage: data.hasProcessedPage
        }
      );

      const singleRecord = result.records[0];
      const node = singleRecord?.get(0);

      return node?.properties;
    } finally {
      await session.close();
    }
  }

  async updateNode(id: string, data: PageNode): Promise<PageNode> {
    const session = this.driver.session();

    try {
      const result = await session.run(
        `
        MATCH (n:Page {id: $id})
        SET n.hasProcessedPage = $hasProcessedPage
        RETURN n
      `,
        {
          id,
          hasProcessedPage: data.hasProcessedPage
        }
      );

      const singleRecord = result.records[0];
      const node = singleRecord?.get(0);

      return node?.properties;
    } finally {
      await session.close();
    }
  }

  async createRelationship(from: string, to: string): Promise<void> {
    const session = this.driver.session();

    const query = `
      MATCH
        (a:Page),
        (b:Page)
      WHERE a.id = $from AND b.id = $to
      CREATE (a)-[r:REFERENCES]->(b)
      RETURN type(r)
    `;

    try {
      await session.run(query, {
        from,
        to
      });
    } finally {
      await session.close();
    }
  }

  async getNode(id: string): Promise<PageNode | undefined> {
    const session = this.driver.session();

    const query = `
      MATCH (n:Page)
      WHERE n.id = $id
      RETURN n
    `;

    try {
      const result = await session.run(query, {
        id
      });

      const singleRecord = result.records[0];
      const node = singleRecord?.get(0);

      return node?.properties;
    } finally {
      await session.close();
    }
  }

  async hasNode(id: string): Promise<boolean> {
    const node = await this.getNode(id);

    return !!node?.id;
  }
}
