"use client";

import NextLink, { type LinkProps as NextLinkProps } from "next/link";
import React from "react";

export interface LinkProps
  extends Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, keyof NextLinkProps | "href"> {
  href?: string;
  to?: string;
  children?: React.ReactNode;
  className?: string;
  target?: string;
  rel?: string;
  onClick?: React.MouseEventHandler<HTMLAnchorElement>;
  [key: string]: any;
}

export const Link = React.forwardRef<HTMLAnchorElement, LinkProps>(
  ({ href, to, children, ...props }, ref) => {
    const destination = href || to || "/";
    return (
      <NextLink ref={ref} href={destination} {...props}>
        {children}
      </NextLink>
    );
  }
);

Link.displayName = "Link";
export default Link;
