import { useWindowSize } from '@react-hook/window-size/throttled';
import React from 'react';

import { PageLink, PageNode } from '../../entities';

import { ForceGraph } from './components';

interface GraphProps {
  nodes: PageNode[];
  links: PageLink[];
}

export function Graph({ nodes, links }: GraphProps) {
  const data = {
    nodes,
    links
  };

  const [width, height] = useWindowSize();

  // the graph configuration, just override the ones you need
  const myConfig = {
    nodeHighlightBehavior: true,
    node: {
      color: '#9CA3AF',
      fontColor: '#9CA3AF',
      size: 120,
      highlightStrokeColor: 'blue'
    },
    link: {
      highlightColor: 'lightblue',
      color: '#4B5563'
    },
    width,
    height
  };

  const onClickNode = function (nodeId) {
    console.log(`Clicked node ${nodeId}`);
  };

  const onClickLink = function (source, target) {
    console.log(`Clicked link between ${source} and ${target}`);
  };

  return (
    <ForceGraph
      id="graph-id" // id is mandatory
      data={data}
      config={myConfig}
      onClickNode={onClickNode}
      onClickLink={onClickLink}
    />
  );
}
