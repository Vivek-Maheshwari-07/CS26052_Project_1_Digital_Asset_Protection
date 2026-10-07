import React from "react";
import { PaperCard } from "./PaperCard";
import type { PaperCardProps } from "./PaperCard";

export interface CardProps extends PaperCardProps {}

export const Card: React.FC<CardProps> = (props) => {
  return <PaperCard {...props} />;
};
