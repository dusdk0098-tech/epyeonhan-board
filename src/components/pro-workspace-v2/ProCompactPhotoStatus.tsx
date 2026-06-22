import { CheckCircle2, Image as ImageIcon, RotateCw } from 'lucide-react';

import type { ProBoardFlowModel } from './boardFlowTypes';

interface ProCompactPhotoStatusProps {
  model: ProBoardFlowModel;
  onGoToPhotoStep: () => void;
  showManageAction?: boolean;
}

export function ProCompactPhotoStatus({ model, onGoToPhotoStep, showManageAction = true }: ProCompactPhotoStatusProps) {
  return (
    <section className="pro-v2-compact-photo-status" aria-label="사진 준비 상태">
      <div>
        <ImageIcon size={18} aria-hidden />
        <span>사진 {model.photoCount}장</span>
      </div>
      <div>
        <CheckCircle2 size={18} aria-hidden />
        <span>체크 {model.checkedCount}장</span>
      </div>
      <div>
        <RotateCw size={18} aria-hidden />
        <span>{model.hasSelectedPhoto ? `${model.selectedPhotoRotation}도` : '선택 필요'}</span>
      </div>
      {showManageAction ? (
        <button type="button" className="pro-v2-inline-action" onClick={onGoToPhotoStep}>
          ?? ??? ????
        </button>
      ) : null}
    </section>
  );
}
