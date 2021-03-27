import React, { memo, ReactNode, useState } from "react";

import { Logger } from "@/logger";

import { PageNode } from "../../../../entities";
import { GraphSymbol } from "../../const";

import CONST from "./node.const";
import { buildSvgSymbol, getLabelPlacementProps, LabelPosition, NodeSize } from "./node.helper";

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
  labelHidden?: boolean;
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
  cy,
  cx,
  size: size_,
  title,
  labelHidden = false,
}: NodeProps) {
  /**
   * Handle click on the node.
   * @returns {undefined}
   */
  const handleOnClickNode = () => {
    onClickNode && onClickNode(id);
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
    onMouseOver: handleOnMouseOverNode,
    transition: "opacity 0.2s ease",
  };

  const textProps = {
    ...getLabelPlacementProps(dx, labelPosition),
    fill: fontColor,
    fontSize: fontSize,
    fontWeight: fontWeight,
    opacity: labelHidden ? 0 : opacity,
    transition: "font-size, opacity 0.2s ease",
  };

  let size = size_;
  const isSizeNumericalValue = typeof size;

  let node: ReactNode = <></>;
  let label: ReactNode = <>{title}</>;

  const gtx = cx;
  const gty = cy;

  if (!isSizeNumericalValue) {
    Logger.warn("node.size should be a number when not using custom nodes.");
    size = CONST.DEFAULT_NODE_SIZE;
  }

  nodeProps.d = buildSvgSymbol(size, type);
  nodeProps.fill = fill;
  nodeProps.stroke = stroke;
  nodeProps.opacity = opacity;
  nodeProps.strokeWidth = strokeWidth;

  label = <text {...textProps}>{label}</text>;
  node = <path {...nodeProps} />;

  const gProps = {
    cx: cx,
    cy: cy,
    id: id,
    transform: `translate(${gtx},${gty})`,
  };

  return (
    <g {...gProps}>
      {node}
      {label}
    </g>
  );
});
