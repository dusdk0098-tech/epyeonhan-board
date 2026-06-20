import type { ProBoardFlowActions, ProBoardFlowModel, ProBoardFlowSlots } from './boardFlowTypes';
import { ProCompactPhotoStatus } from './ProCompactPhotoStatus';
import { ProLowerBandItemManager } from './ProLowerBandItemManager';

interface ProBoardAdjustStepProps {
  model: ProBoardFlowModel;
  actions: ProBoardFlowActions;
  slots: ProBoardFlowSlots;
  onGoToPhotoStep: () => void;
}

export function ProBoardAdjustStep({ model, actions, slots, onGoToPhotoStep }: ProBoardAdjustStepProps) {
  return (
    <div className="pro-v2-board-step pro-v2-board-adjust-step" data-evidence="board-adjust-controls">
      <ProCompactPhotoStatus model={model} onGoToPhotoStep={onGoToPhotoStep} />
      <div className="pro-v2-board-control-grid">
        <section className="pro-v2-board-control-card">
          <div className="pro-v2-board-section-heading">
            <div>
              <h3>보드 크기와 위치</h3>
              <p>미리보기와 함께 보드판의 형태, 위치, 폭을 조정합니다.</p>
            </div>
          </div>
          {slots.layoutControls}
        </section>
        <section className="pro-v2-board-control-card">
          <div className="pro-v2-board-section-heading">
            <div>
              <h3>촬영시간과 글자</h3>
              <p>필요한 시간 표시와 글자 스타일을 보드판에 맞춥니다.</p>
            </div>
          </div>
          <div className="pro-v2-board-subgrid">
            {slots.dateTimeControls}
            {slots.typographyControls}
          </div>
        </section>
        <section className="pro-v2-board-control-card pro-v2-board-adjust-preview-card" data-evidence="board-adjust-preview">
          <div className="pro-v2-board-section-heading">
            <div>
              <h3>미리보기 확인</h3>
              <p>크기, 위치, 하부띠 변경 결과를 같은 화면에서 확인합니다.</p>
            </div>
          </div>
          {slots.previewPanel}
        </section>
        <section className="pro-v2-board-control-card">
          <div className="pro-v2-board-section-heading">
            <div>
              <h3>하부띠와 원형강조</h3>
              <p>하부띠를 사용할 때 실제 항목 행을 확인하고, 원형강조를 함께 조정합니다.</p>
            </div>
            <button
              type="button"
              className="pro-v2-action secondary"
              aria-pressed={model.bottomStripEnabled}
              onClick={() => actions.onToggleBottomStrip(!model.bottomStripEnabled)}
            >
              {model.bottomStripEnabled ? '하부띠 사용 중' : '하부띠 켜기'}
            </button>
          </div>
          {model.bottomStripEnabled ? (
            <ProLowerBandItemManager
              fields={model.fields}
              selectedFieldId={model.selectedFieldId}
              onAddField={actions.onAddField}
              onUpdateField={actions.onUpdateField}
              onDeleteField={actions.onDeleteField}
              onSelectField={actions.onSelectField}
              onInsertSelectedFileName={actions.onInsertSelectedFileName}
            />
          ) : (
            <div className="pro-v2-board-empty">하부띠를 켜면 항목 추가와 삭제 상태를 여기서 확인할 수 있습니다.</div>
          )}
          {slots.highlightControls}
        </section>
      </div>
    </div>
  );
}
