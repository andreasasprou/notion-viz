import { useWindowSize } from '@react-hook/window-size/throttled';
import React, { useMemo } from 'react';

import { PageLink, PageNode } from '../../entities';

import { ForceGraph } from './components';

interface GraphProps {
  nodes: PageNode[];
  links: PageLink[];
}

export function Graph({ nodes, links }: GraphProps) {
  const [width, height] = useWindowSize();

  // the graph configuration, just override the ones you need
  const myConfig = useMemo(
    () => ({
      width,
      height
    }),
    [height, width]
  );

  const data = useMemo(
    () => ({
      nodes,
      links,
      focusedNodeId: nodes.find((node) => node.focused)
    }),
    [links, nodes]
  );

  return (
    <>
      <ForceGraph id="graph-id" data={data} config={myConfig} />
    </>
  );
}
