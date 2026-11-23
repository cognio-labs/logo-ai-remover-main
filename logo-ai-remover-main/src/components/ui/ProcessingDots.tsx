import React from "react";

export interface ProcessingDotsProps {
  /**
   * CSS color for the dots. Sets the `--dot-color` custom property.
   * Defaults to `#d0f471` (Bellix luxury lime) or currentColor.
   */
  color?: string;
  /**
   * CSS gap between dots. Sets the `--dot-gap` custom property.
   * Can be number (interpreted as px) or string (e.g. "4px", "0.25rem").
   * Defaults to "4px".
   */
  gap?: string | number;
  /**
   * Diameter of each dot. Sets the `--dot-size` custom property.
   * Defaults to "5px".
   */
  size?: string | number;
  /**
   * Number of dots to render. Defaults to 3.
   */
  count?: number;
  /**
   * Additional CSS classes.
   */
  className?: string;
  /**
   * Inline styles.
   */
  style?: React.CSSProperties;
}

/**
 * ProcessingDots:
 * High-performance, GPU-accelerated animated dots indicator.
 * - Single keyframe animation with nth-child stagger delays
 * - Exposes `--dot-color` and `--dot-gap` CSS variables
 * - Freezes at full opacity under `prefers-reduced-motion: reduce`
 * - Cheap infinite compositor loop (opacity + transform only, zero layout reflow)
 */
export const ProcessingDots: React.FC<ProcessingDotsProps> = ({
  color,
  gap,
  size,
  count = 3,
  className = "",
  style = {},
}) => {
  const customStyles: Record<string, string | number> = {
    ...style,
  };

  if (color) {
    customStyles["--dot-color"] = color;
  }
  if (gap !== undefined) {
    customStyles["--dot-gap"] = typeof gap === "number" ? `${gap}px` : gap;
  }
  if (size !== undefined) {
    customStyles["--dot-size"] = typeof size === "number" ? `${size}px` : size;
  }

  return (
    <span
      className={`processing-dots ${className}`}
      style={customStyles as React.CSSProperties}
      role="status"
      aria-label="Processing..."
    >
      {Array.from({ length: count }).map((_, i) => (
        <span key={i} />
      ))}
    </span>
  );
};

export default ProcessingDots;
