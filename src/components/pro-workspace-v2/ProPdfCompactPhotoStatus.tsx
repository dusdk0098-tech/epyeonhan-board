import { CheckCircle2, Image as ImageIcon, RotateCw } from 'lucide-react';

import type { ProPdfFlowModel } from './pdfFlowTypes';

interface ProPdfCompactPhotoStatusProps {
  model: ProPdfFlowModel;
  onGoToPhotoStep: () => void;
}

export function ProPdfCompactPhotoStatus({ model, onGoToPhotoStep }: ProPdfCompactPhotoStatusProps) {
  return (
    <section className="pro-v2-compact-photo-status" aria-label="PDF 사진 준비 상태">
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
      <button type="button" className="pro-v2-inline-action" onClick={onGoToPhotoStep}>
        사진 준비로 돌아가기
      </button>
    </section>
  );
}
