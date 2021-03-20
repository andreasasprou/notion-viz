import { useEffect, useState } from 'react';

import { Explorer, StyledVisContainer } from '../../components/D3Visualization';
import { Neo4jGraph } from '../../services/server/notion-graph/neo4j-page-graph';

const updateStyle = (style) =>
  console.log({
    style
  });

const getNeighbours = async (nodeId, currentNeighborids) => {
  return [];
};

function GraphPage({ nodes, relationships }: { nodes: any[]; relationships: any[] }) {
  const [hasMounted, setHasMounted] = useState(false);

  useEffect(() => {
    setHasMounted(true);
  }, []);

  if (!hasMounted) {
    return <div></div>;
  }

  return (
    <StyledVisContainer fullscreen={true}>
      <Explorer
        maxNeighbours={10}
        hasTruncatedFields={false}
        initialNodeDisplay={300}
        updateStyle={updateStyle}
        getNeighbours={getNeighbours}
        nodes={nodes}
        relationships={relationships}
        fullscreen={true}
        frameHeight={472}
      />
    </StyledVisContainer>
  );
}

export async function getServerSideProps() {
  const { nodes, relationships } = await new Neo4jGraph().getGraph();

  return {
    props: { nodes, relationships }
  };
}

export default GraphPage;
