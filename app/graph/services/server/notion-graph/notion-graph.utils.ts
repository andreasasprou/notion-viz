import { Block } from 'notion-types';

export function getPageIdFromBlockIdAndTitle({ title, id }: { id: string; title: string }) {
  `${title.replace(/ /g, '-')}-${id.replace(/-/g, '')}`;
}

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
