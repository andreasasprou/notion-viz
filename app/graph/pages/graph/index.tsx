import { useEffect, useState } from 'react';

import { Graph } from '../../components/Graph';
import { PageLink, PageNode } from '../../entities';
import { Neo4jGraph } from '../../services/server/notion-graph/neo4j-page-graph';

function GraphPage({ nodes, links }: { nodes: PageNode[]; links: PageLink[] }) {
  const [hasMounted, setHasMounted] = useState(false);

  useEffect(() => {
    setHasMounted(true);
  }, []);

  if (!hasMounted) {
    return <div></div>;
  }

  return <Graph nodes={nodes} links={links} />;
}

export async function getServerSideProps() {
  const { nodes, links } = await new Neo4jGraph().getGraph();

  return {
    props: { nodes, links }
  };
}

export default GraphPage;
