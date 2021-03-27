export function getPageIdFromBlockIdAndTitle({ title, id }: { id: string; title: string }) {
  return `${title.replace(/ /g, '-')}-${id.replace(/-/g, '')}`;
}
