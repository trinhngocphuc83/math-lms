"use client";

import React from "react";
import "katex/dist/katex.min.css";
import { BlockMath, InlineMath } from "react-katex";

interface MathTextProps {
  math: string;
  inline?: boolean;
  className?: string;
}

export function MathText({ math, inline = false, className = "" }: MathTextProps) {
  return (
    <span className={`text-[#0f6f60] ${className}`}>
      {inline ? <InlineMath math={math} /> : <BlockMath math={math} />}
    </span>
  );
}
