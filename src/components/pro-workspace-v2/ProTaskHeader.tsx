import type { ReactNode } from 'react';

interface ProTaskHeaderProps {
  title: string;
  eyebrow: string;
  description: string;
  progressLabel?: string;
  statusSlot?: ReactNode;
}

export function ProTaskHeader({ title, eyebrow, description, progressLabel, statusSlot }: ProTaskHeaderProps) {
  return (
    <header className="pro-v2-header">
      <div className="pro-v2-header-main">
        <span className="pro-v2-eyebrow">{eyebrow}</span>
        <div className="pro-v2-title-row">
          <h1>{title}</h1>
          {progressLabel ? <span className="pro-v2-progress">{progressLabel}</span> : null}
        </div>
        <p>{description}</p>
      </div>
      {statusSlot ? <div className="pro-v2-header-status">{statusSlot}</div> : null}
    </header>
  );
}
