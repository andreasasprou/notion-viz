import { PageNode } from '../../entities';

export interface ContextMenuState {
  top: number;
  left: number;
  height: number;
  width: number;
  node: PageNode;
}
