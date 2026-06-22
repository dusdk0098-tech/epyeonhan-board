import type { ProBoardFlowActions, ProBoardFlowModel } from './boardFlowTypes';
import { ProLowerBandItemManager } from './ProLowerBandItemManager';

interface ProBoardContentStepProps {
  model: ProBoardFlowModel;
  actions: ProBoardFlowActions;
}

export function ProBoardContentStep({ model, actions }: ProBoardContentStepProps) {
  return (
    <div className="pro-v2-board-step pro-v2-board-content-step" data-evidence="board-content-step">
      <ProLowerBandItemManager
        title="하부띠 항목"
        description="보드판 하단에 보일 항목명과 내용을 입력합니다."
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
