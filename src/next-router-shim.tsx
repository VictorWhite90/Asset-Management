'use client';

import React, { forwardRef, useCallback, useEffect, useMemo } from 'react';
import NextLink from 'next/link';
import {
  redirect,
  useParams as useNextParams,
  usePathname,
  useRouter,
  useSearchParams as useNextSearchParams,
} from 'next/navigation';

type To = string | { pathname?: string; search?: string; hash?: string };

const toHref = (to: To = ''): string => {
  if (typeof to === 'string') return to;
  return `${to.pathname || ''}${to.search || ''}${to.hash || ''}` || '/';
};

export const Link = forwardRef<HTMLAnchorElement, any>(function LinkShim(
  { to, href, replace, children, ...props },
  ref
) {
  return (
    <NextLink ref={ref} href={href || toHref(to)} replace={replace} {...props}>
      {children}
    </NextLink>
  );
});

export const useNavigate = () => {
  const router = useRouter();
  return useCallback((to: To | number, options?: { replace?: boolean; state?: unknown }) => {
    if (typeof to === 'number') {
      if (to < 0) router.back();
      return;
    }

    const href = toHref(to);
    if (options?.replace) router.replace(href);
    else router.push(href);
  }, [router]);
};

export const useLocation = () => {
  const pathname = usePathname() || '/';
  const searchParams = useNextSearchParams();
  const search = searchParams?.toString() || '';

  return useMemo(
    () => ({
      pathname,
      search: search ? `?${search}` : '',
      hash: '',
      state: null,
      key: pathname,
    }),
    [pathname, search]
  );
};

export const useParams = <T extends Record<string, string | undefined> = Record<string, string | undefined>>() =>
  useNextParams() as T;

export const useSearchParams = (): [
  URLSearchParams,
  (nextInit: URLSearchParams | Record<string, string> | string, options?: { replace?: boolean }) => void,
] => {
  const router = useRouter();
  const pathname = usePathname() || '/';
  const params = useNextSearchParams();
  const current = new URLSearchParams(params?.toString() || '');

  const setSearchParams = useCallback(
    (
      nextInit: URLSearchParams | Record<string, string> | string,
      options?: { replace?: boolean }
    ) => {
      const next = new URLSearchParams(nextInit as any);
      const query = next.toString();
      const href = query ? `${pathname}?${query}` : pathname;
      if (options?.replace) router.replace(href);
      else router.push(href);
    },
    [router, pathname]
  );

  return [current, setSearchParams];
};

export const Navigate: React.FC<{ to: To; replace?: boolean }> = ({ to, replace }) => {
  const router = useRouter();
  useEffect(() => {
    const href = toHref(to);
    if (replace) router.replace(href);
    else router.push(href);
  }, [replace, router, to]);
  return null;
};

export const BrowserRouter: React.FC<{ children: React.ReactNode }> = ({ children }) => <>{children}</>;
export const Routes: React.FC<{ children: React.ReactNode }> = ({ children }) => <>{children}</>;
export const Route: React.FC<any> = () => null;
export { redirect };
