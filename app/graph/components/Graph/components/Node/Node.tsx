import React, { memo, ReactNode, useState } from 'react';

import { Logger } from '@/logger';

import { PageNode } from '../../../../entities';
import { GraphSymbol } from '../../const';

import CONST from './node.const';
import { buildSvgSymbol, getLabelPlacementProps, LabelPosition, NodeSize } from './node.helper';

interface NodeProps extends PageNode {
  onMouseOverNode?: (nodeId: string) => void;
  onMouseOut?: (nodeId: string) => void;
  onClickNode?: (nodeId: string) => void;
  onRightClickNode?: (event, nodeId: string) => void;
  id: string;
  labelPosition?: LabelPosition;
  dx: number;
  cy: number;
  cx: number;
  size: NodeSize | number;
  fontColor;
  fontSize;
  fontWeight;
  opacity;
  type?: GraphSymbol;
  fill?: string;
  stroke?: string;
  strokeWidth?: number;
  viewGenerator?: any;
  svg?: any;
}

export const Node = memo(function ({
  onClickNode,
  onRightClickNode,
  onMouseOverNode,
  id,
  onMouseOut,
  labelPosition,
  dx,
  fontColor,
  fontSize,
  fontWeight,
  opacity,
  type,
  fill,
  stroke,
  strokeWidth,
  viewGenerator,
  svg,
  cy,
  cx,
  size: size_,
  title
}: NodeProps) {
  const [isOpen, setIsOpen] = useState<boolean>(true);

  /**
   * Handle click on the node.
   * @returns {undefined}
   */
  const handleOnClickNode = () => {
    onClickNode && onClickNode(id);
    setIsOpen(true);
  };

  /**
   * Handle right click on the node.
   * @param {Object} event - native event.
   * @returns {undefined}
   */
  const handleOnRightClickNode = (event) => onRightClickNode && onRightClickNode(event, id);

  /**
   * Handle mouse over node event.
   * @returns {undefined}
   */
  const handleOnMouseOverNode = () => onMouseOverNode && onMouseOverNode(id);

  /**
   * Handle mouse out node event.
   * @returns {undefined}
   */
  const handleOnMouseOutNode = () => onMouseOut && onMouseOut(id);

  const nodeProps: any = {
    onClick: handleOnClickNode,
    onContextMenu: handleOnRightClickNode,
    onMouseOut: handleOnMouseOutNode,
    onMouseOver: handleOnMouseOverNode
  };

  const textProps = {
    ...getLabelPlacementProps(dx, labelPosition),
    fill: fontColor,
    fontSize: fontSize,
    fontWeight: fontWeight,
    opacity: opacity
  };

  let size = size_;
  const isSizeNumericalValue = typeof size;

  let node: ReactNode = <></>;
  let label: ReactNode = <>{title}</>;

  let gtx = cx,
    gty = cy;

  if (svg || viewGenerator) {
    const height = isSizeNumericalValue ? (size as number) / 10 : (size as NodeSize).height / 10;
    const width = isSizeNumericalValue ? (size as number) / 10 : (size as NodeSize).width / 10;
    const tx = width / 2;
    const ty = height / 2;
    const transform = `translate(${tx},${ty})`;

    label = (
      <text {...textProps} transform={transform}>
        {label}
      </text>
    );

    // svg offset transform regarding svg width/height
    gtx -= tx;
    gty -= ty;
  } else {
    if (!isSizeNumericalValue) {
      Logger.warn('node.size should be a number when not using custom nodes.');
      size = CONST.DEFAULT_NODE_SIZE;
    }

    nodeProps.d = buildSvgSymbol(size, type);
    nodeProps.fill = fill;
    nodeProps.stroke = stroke;
    nodeProps.strokeWidth = strokeWidth;

    label = <text {...textProps}>{label}</text>;
    node = <path {...nodeProps} />;
  }

  const gProps = {
    cx: cx,
    cy: cy,
    id: id,
    transform: `translate(${gtx},${gty})`
  };

  return (
    <g {...gProps}>
      {node}
      {label}
    </g>
  );
});
