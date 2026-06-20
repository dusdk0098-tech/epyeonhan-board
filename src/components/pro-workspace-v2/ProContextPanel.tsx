import type { ReactNode } from 'react';

interface ProContextPanelProps {
  title?: string;
  children?: ReactNode;
}

export function ProContextPanel({ title, children }: ProContextPanelProps) {
  if (!children) return null;

  return (
    <aside className="pro-v2-context" aria-label={title ?? 'PRO 작업 보조 정보'}>
      {title ? <h2 className="pro-v2-section-title">{title}</h2> : null}
      {children}
    </aside>
  );
}
