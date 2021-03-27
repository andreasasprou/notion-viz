import { Block } from 'notion-types';

import { getPageIdFromBlockIdAndTitle } from '../../notion';

export function getPageAttributesFromBlock(block: Block) {
  if (!block.properties?.title || block.type !== 'page') {
    return undefined;
  }

  const title = block.properties.title[0][0];
  const pageId = getPageIdFromBlockIdAndTitle({
    title,
    id: block.id
  });

  return {
    title,
    pageId,
    id: block.id
  };
}
