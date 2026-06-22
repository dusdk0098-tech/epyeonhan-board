import type { ReactNode } from 'react';

import type { ProBoardFlowModel } from './boardFlowTypes';
import { ProCompactPhotoStatus } from './ProCompactPhotoStatus';

interface ProBoardPreviewContextProps {
  model: ProBoardFlowModel;
  previewPanel: ReactNode;
  onGoToPhotoStep: () => void;
  showManageAction?: boolean;
}

export function ProBoardPreviewContext({
  model,
  previewPanel,
  onGoToPhotoStep,
  showManageAction = true
}: ProBoardPreviewContextProps) {
  return (
    <div className="pro-v2-preview-context" data-evidence="board-adjust-preview">
      <ProCompactPhotoStatus model={model} onGoToPhotoStep={onGoToPhotoStep} showManageAction={showManageAction} />
      {previewPanel}
    </div>
  );
}
