import type { ReactNode } from 'react';

import { ProActionBar } from './ProActionBar';
import { ProContextPanel } from './ProContextPanel';
import { ProTaskCanvas } from './ProTaskCanvas';
import { ProTaskHeader } from './ProTaskHeader';

interface ProWorkspaceShellProps {
  title: string;
  eyebrow: string;
  description: string;
  progressLabel?: string;
  statusSlot?: ReactNode;
  canvasTitle?: string;
  canvas: ReactNode;
  contextTitle?: string;
  context?: ReactNode;
  primaryAction?: ReactNode;
  secondaryAction?: ReactNode;
}

export function ProWorkspaceShell({
  title,
  eyebrow,
  description,
  progressLabel,
  statusSlot,
  canvasTitle,
  canvas,
  contextTitle,
  context,
  primaryAction,
  secondaryAction
}: ProWorkspaceShellProps) {
  return (
    <section className="pro-v2-shell" data-pro-workspace-v2>
      <ProTaskHeader
        title={title}
        eyebrow={eyebrow}
        description={description}
        progressLabel={progressLabel}
        statusSlot={statusSlot}
      />
      <div className="pro-v2-body">
        <ProTaskCanvas title={canvasTitle}>{canvas}</ProTaskCanvas>
        <ProContextPanel title={contextTitle}>{context}</ProContextPanel>
      </div>
      <ProActionBar primary={primaryAction} secondary={secondaryAction} />
    </section>
  );
}
