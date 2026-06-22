import { useState } from 'react';

import type { ProBoardFlowActions, ProBoardFlowModel, ProBoardFlowSlots } from './boardFlowTypes';
import { ProCompactPhotoStatus } from './ProCompactPhotoStatus';
import { ProLowerBandItemManager } from './ProLowerBandItemManager';

interface ProBoardAdjustStepProps {
  model: ProBoardFlowModel;
  actions: ProBoardFlowActions;
  slots: ProBoardFlowSlots;
  onGoToPhotoStep: () => void;
}

type ProBoardAdjustPanel = 'layout' | 'strip' | 'text' | 'highlight';

const adjustPanels: Array<{
  id: ProBoardAdjustPanel;
  label: string;
  description: string;
}> = [
  { id: 'layout', label: '크기·위치', description: '보드 크기와 배치' },
  { id: 'strip', label: '하부띠', description: '표시와 항목' },
  { id: 'text', label: '시간·글자', description: '촬영시간과 스타일' },
  { id: 'highlight', label: '원형강조', description: '선택 사진 강조' }
];

export function ProBoardAdjustStep({ model, actions, slots, onGoToPhotoStep }: ProBoardAdjustStepProps) {
  const [activePanel, setActivePanel] = useState<ProBoardAdjustPanel>('layout');

  function renderPanel() {
    switch (activePanel) {
      case 'layout':
        return (
          <section className="pro-v2-board-adjust-panel" data-evidence="board-adjust-layout-controls">
            <div className="pro-v2-board-section-heading">
              <div>
                <h3>보드 크기와 위치</h3>
                <p>미리보기와 나란히 보며 형태, 위치, 폭을 조정합니다.</p>
              </div>
            </div>
            {slots.layoutControls}
          </section>
        );
      case 'strip':
        return (
          <section className="pro-v2-board-adjust-panel" data-evidence="board-adjust-lower-band-controls">
            <div className="pro-v2-board-adjust-strip-head">
              <div>
                <h3>하부띠 표시</h3>
                <p>표시 여부를 먼저 정하고, 필요한 항목만 빠르게 다듬습니다.</p>
              </div>
              <button
                type="button"
                className={model.bottomStripEnabled ? 'pro-v2-action primary pro-v2-board-primary' : 'pro-v2-action secondary'}
                aria-pressed={model.bottomStripEnabled}
                onClick={() => actions.onToggleBottomStrip(!model.bottomStripEnabled)}
              >
                {model.bottomStripEnabled ? '하부띠 켜짐' : '하부띠 켜기'}
              </button>
            </div>
            {model.bottomStripEnabled ? (
              <ProLowerBandItemManager
                variant="compact"
                title="하부띠 항목"
                description="선택한 항목은 미리보기 하부띠에 바로 반영됩니다."
                fields={model.fields}
                selectedFieldId={model.selectedFieldId}
                onAddField={actions.onAddField}
                onUpdateField={actions.onUpdateField}
                onDeleteField={actions.onDeleteField}
                onSelectField={actions.onSelectField}
                onInsertSelectedFileName={actions.onInsertSelectedFileName}
              />
            ) : (
              <div className="pro-v2-board-empty">하부띠를 켜면 항목 편집 영역이 표시됩니다.</div>
            )}
          </section>
        );
      case 'text':
        return (
          <section className="pro-v2-board-adjust-panel" data-evidence="board-adjust-text-controls">
            <div className="pro-v2-board-section-heading">
              <div>
                <h3>촬영시간과 글자</h3>
                <p>시간 표시와 글자 스타일을 한 패널에서 정리합니다.</p>
              </div>
            </div>
            <div className="pro-v2-board-adjust-combo-grid">
              {slots.dateTimeControls}
              {slots.typographyControls}
            </div>
          </section>
        );
      case 'highlight':
        return (
          <section className="pro-v2-board-adjust-panel" data-evidence="board-adjust-highlight-controls">
            <div className="pro-v2-board-section-heading">
              <div>
                <h3>원형 강조</h3>
                <p>선택 사진의 강조 표시를 미리보기와 함께 확인합니다.</p>
              </div>
            </div>
            {slots.highlightControls}
          </section>
        );
    }
  }

  return (
    <div className="pro-v2-board-step pro-v2-board-adjust-step" data-evidence="board-adjust-controls">
      <ProCompactPhotoStatus model={model} onGoToPhotoStep={onGoToPhotoStep} />
      <div className="pro-v2-board-adjust-workbench" data-evidence="board-adjust-workbench">
        <section className="pro-v2-board-control-card pro-v2-board-adjust-primary-card" data-evidence="board-adjust-secondary-controls">
          <div className="pro-v2-board-adjust-tabs" role="tablist" aria-label="보드 조정 설정">
            {adjustPanels.map((panel) => {
              const active = activePanel === panel.id;
              return (
                <button
                  key={panel.id}
                  type="button"
                  role="tab"
                  id={`pro-v2-board-adjust-${panel.id}-tab`}
                  aria-selected={active}
                  aria-controls={`pro-v2-board-adjust-${panel.id}-panel`}
                  className={active ? 'pro-v2-board-adjust-tab active' : 'pro-v2-board-adjust-tab'}
                  onClick={() => setActivePanel(panel.id)}
                >
                  <strong>{panel.label}</strong>
                  <span>{panel.description}</span>
                </button>
              );
            })}
          </div>
          <div
            id={`pro-v2-board-adjust-${activePanel}-panel`}
            role="tabpanel"
            aria-labelledby={`pro-v2-board-adjust-${activePanel}-tab`}
            className="pro-v2-board-adjust-panel-body"
          >
            {renderPanel()}
          </div>
        </section>
        <section className="pro-v2-board-control-card pro-v2-board-adjust-preview-card" data-evidence="board-adjust-preview">
          <div className="pro-v2-board-section-heading">
            <div>
              <h3>미리보기 확인</h3>
              <p>크기, 위치, 하부띠 변경 결과를 바로 비교합니다.</p>
            </div>
          </div>
          {slots.previewPanel}
        </section>
      </div>
    </div>
  );
}
