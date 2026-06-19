import type { ReactNode } from 'react';

interface ProTaskCanvasProps {
  title?: string;
  children: ReactNode;
}

export function ProTaskCanvas({ title, children }: ProTaskCanvasProps) {
  return (
    <section className="pro-v2-canvas" aria-label={title ?? 'PRO 작업 영역'}>
      {title ? <h2 className="pro-v2-section-title">{title}</h2> : null}
      {children}
    </section>
  );
}
