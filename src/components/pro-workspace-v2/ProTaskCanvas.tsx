import type { ReactNode } from 'react';
import { useEffect, useRef } from 'react';

interface ProTaskCanvasProps {
  title?: string;
  focusKey?: string;
  children: ReactNode;
}

export function ProTaskCanvas({ title, focusKey, children }: ProTaskCanvasProps) {
  const headingRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    if (!focusKey) return;
    headingRef.current?.focus({ preventScroll: true });
  }, [focusKey]);

  return (
    <section className="pro-v2-canvas" aria-label={title ?? 'PRO 작업 영역'}>
      {title ? (
        <h2 ref={headingRef} className="pro-v2-section-title" tabIndex={-1} data-pro-v2-step-heading>
          {title}
        </h2>
      ) : null}
      {children}
    </section>
  );
}
