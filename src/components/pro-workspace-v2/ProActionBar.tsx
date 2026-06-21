import type { ReactNode } from 'react';

interface ProActionBarProps {
  primary?: ReactNode;
  secondary?: ReactNode;
}

export function ProActionBar({ primary, secondary }: ProActionBarProps) {
  if (!primary && !secondary) return null;

  return (
    <div className="pro-v2-actionbar" role="region" aria-label="PRO 작업 실행 영역">
      <div className="pro-v2-actionbar-secondary">{secondary}</div>
      <div className="pro-v2-actionbar-primary">{primary}</div>
    </div>
  );
}
