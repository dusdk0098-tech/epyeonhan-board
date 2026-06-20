import type { ProBoardFlowActions, ProBoardFlowModel } from './boardFlowTypes';
import { ProCompactPhotoStatus } from './ProCompactPhotoStatus';
import { ProLowerBandItemManager } from './ProLowerBandItemManager';

interface ProBoardContentStepProps {
  model: ProBoardFlowModel;
  actions: ProBoardFlowActions;
  onGoToPhotoStep: () => void;
}

export function ProBoardContentStep({ model, actions, onGoToPhotoStep }: ProBoardContentStepProps) {
  return (
    <div className="pro-v2-board-step pro-v2-board-content-step" data-evidence="board-content-step">
      <ProCompactPhotoStatus model={model} onGoToPhotoStep={onGoToPhotoStep} />
      <ProLowerBandItemManager
        title="보드판 내용"
        description="보드판에 표시할 항목명과 값을 입력합니다. PDF 전용 정보는 이 보드판 흐름에 표시하지 않습니다."
        fields={model.fields}
        selectedFieldId={model.selectedFieldId}
        onAddField={actions.onAddField}
        onUpdateField={actions.onUpdateField}
        onDeleteField={actions.onDeleteField}
        onSelectField={actions.onSelectField}
        onInsertSelectedFileName={actions.onInsertSelectedFileName}
      />
    </div>
  );
}
