export interface PageNode {
  id: string;
  title: string;
  hasProcessedPage?: boolean;
  focused?: boolean;
}

export interface PageLink {
  id: string;
  source: string;
  target: string;
}
