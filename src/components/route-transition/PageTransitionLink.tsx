"use client";

import Link from "next/link";
import { forwardRef, useCallback } from "react";
import type {
  ComponentProps,
  FocusEvent,
  KeyboardEvent,
  MouseEvent,
  PointerEvent,
  TouchEvent,
} from "react";
import { useRouteTransition } from "./RouteTransitionProvider";

type LinkBaseProps = Omit<ComponentProps<typeof Link>, "href" | "prefetch">;

interface PageTransitionLinkProps extends LinkBaseProps {
  href: string;
  prefetch?: boolean;
  transitionAware?: boolean;
}

function composeEventHandlers<EventType>(
  original: ((event: EventType) => void) | undefined,
  next: (event: EventType) => void
) {
  return (event: EventType) => {
    original?.(event);
    next(event);
  };
}

export const PageTransitionLink = forwardRef<
  HTMLAnchorElement,
  PageTransitionLinkProps
>(function PageTransitionLink(
  {
    href,
    onFocus,
    onKeyDown,
    onMouseEnter,
    onPointerDown,
    onTouchStart,
    prefetch = true,
    transitionAware = false,
    ...props
  },
  ref
) {
  const { beginRouteTransition, prefetchHref } = useRouteTransition();

  const primeLink = useCallback(() => {
    if (prefetch !== false) {
      prefetchHref(href);
    }
  }, [href, prefetch, prefetchHref]);

  const startTransition = useCallback(() => {
    if (transitionAware) {
      beginRouteTransition(href);
    }
  }, [beginRouteTransition, href, transitionAware]);

  const handleMouseEnter = composeEventHandlers<MouseEvent<HTMLAnchorElement>>(
    onMouseEnter,
    () => {
      primeLink();
    }
  );

  const handleFocus = composeEventHandlers<FocusEvent<HTMLAnchorElement>>(
    onFocus,
    () => {
      primeLink();
    }
  );

  const handleTouchStart = composeEventHandlers<TouchEvent<HTMLAnchorElement>>(
    onTouchStart,
    () => {
      primeLink();
    }
  );

  const handlePointerDown = composeEventHandlers<PointerEvent<HTMLAnchorElement>>(
    onPointerDown,
    () => {
    primeLink();
    startTransition();
    }
  );

  const handleKeyDown = composeEventHandlers<
    KeyboardEvent<HTMLAnchorElement>
  >(onKeyDown, (event) => {
    if (event.key === "Enter") {
      startTransition();
    }
  });

  return (
    <Link
      {...props}
      ref={ref}
      href={href}
      onFocus={handleFocus}
      onKeyDown={handleKeyDown}
      onMouseEnter={handleMouseEnter}
      onPointerDown={handlePointerDown}
      onTouchStart={handleTouchStart}
      prefetch={prefetch}
    />
  );
});
