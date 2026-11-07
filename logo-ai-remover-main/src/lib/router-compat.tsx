"use client";

import React, { Suspense } from "react";
import NextLink from "next/link";
import { usePathname, useRouter as useNextRouter, useParams as useNextParams } from "next/navigation";

export interface CompatLinkProps extends Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, "href"> {
  to?: string;
  href?: string;
  children?: React.ReactNode;
  className?: string;
  activeProps?: { className?: string };
  inactiveProps?: { className?: string };
}

export const Link = React.forwardRef<HTMLAnchorElement, CompatLinkProps>(
  ({ to, href, activeProps, inactiveProps, className = "", children, ...props }, ref) => {
    const destination = href || to || "#";
    const pathname = usePathname();
    const isActive = pathname === destination || (destination !== "/" && pathname.startsWith(destination));

    let finalClassName = className;
    if (isActive && activeProps?.className) {
      finalClassName = `${finalClassName} ${activeProps.className}`.trim();
    } else if (!isActive && inactiveProps?.className) {
      finalClassName = `${finalClassName} ${inactiveProps.className}`.trim();
    }

    return (
      <NextLink ref={ref} href={destination} className={finalClassName} {...props}>
        {children}
      </NextLink>
    );
  }
);
Link.displayName = "Link";

export function useNavigate() {
  const router = useNextRouter();
  return React.useCallback(
    (opts: { to: string; search?: any; replace?: boolean } | string) => {
      if (typeof opts === "string") {
        router.push(opts);
      } else if (opts && typeof opts === "object") {
        if (opts.replace) {
          router.replace(opts.to);
        } else {
          router.push(opts.to);
        }
      }
    },
    [router]
  );
}

export function useRouterState<T = any>(opts?: {
  select?: (state: { location: { pathname: string; search: Record<string, string> } }) => T;
}): T {
  const pathname = usePathname() || "/";
  const searchObj: Record<string, string> = {};

  if (typeof window !== "undefined") {
    try {
      const sp = new URLSearchParams(window.location.search);
      sp.forEach((val, key) => {
        searchObj[key] = val;
      });
    } catch {
      // ignore
    }
  }

  const state = {
    location: {
      pathname,
      search: searchObj,
    },
    status: "idle" as const,
  };

  if (opts?.select) {
    return opts.select(state);
  }
  return state as unknown as T;
}

export function useLocation() {
  const pathname = usePathname() || "/";
  const search: Record<string, string> = {};
  if (typeof window !== "undefined") {
    try {
      const sp = new URLSearchParams(window.location.search);
      sp.forEach((val, key) => {
        search[key] = val;
      });
    } catch {
      // ignore
    }
  }
  return {
    pathname,
    search,
  };
}

export function useParams() {
  return useNextParams();
}

export function useSearch() {
  const search: Record<string, string> = {};
  if (typeof window !== "undefined") {
    try {
      const sp = new URLSearchParams(window.location.search);
      sp.forEach((val, key) => {
        search[key] = val;
      });
    } catch {
      // ignore
    }
  }
  return search;
}

export function useRouter() {
  const router = useNextRouter();
  const pathname = usePathname() || "/";
  return {
    ...router,
    state: {
      location: {
        pathname,
      },
    },
    invalidate: () => {},
  };
}

export function redirect(opts: { to: string }) {
  if (typeof window !== "undefined") {
    window.location.href = opts.to;
  }
  return opts;
}

export function createFileRoute(path: string) {
  return (options: any) => options;
}

export function createRootRouteWithContext<T = any>() {
  return (options: any) => options;
}

export function Outlet({ children }: { children?: React.ReactNode }) {
  return <>{children}</>;
}

export function HeadContent() {
  return null;
}

export function Scripts() {
  return null;
}

export function createRouter(opts?: any) {
  return opts || {};
}
