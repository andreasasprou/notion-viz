/**
 * @ignore
 * These are common keywords used across rd3g, thus being placed in a more abstract level
 * in the tree directory.
 */
const GRAPH_CONST = {
  SYMBOLS: {
    CIRCLE: 'circle',
    CROSS: 'cross',
    DIAMOND: 'diamond',
    SQUARE: 'square',
    STAR: 'star',
    TRIANGLE: 'triangle',
    WYE: 'wye'
  }
};

export type GraphSymbol = keyof typeof GRAPH_CONST['SYMBOLS'];

export default GRAPH_CONST;
