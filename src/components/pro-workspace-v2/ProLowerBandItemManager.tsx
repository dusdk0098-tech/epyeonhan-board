import { CheckCircle2, Plus, X } from 'lucide-react';

import type { ProBoardField } from './boardFlowTypes';

interface ProLowerBandItemManagerProps {
  fields: ProBoardField[];
  selectedFieldId: string;
  title?: string;
  description?: string;
  variant?: 'editor' | 'compact';
  onAddField: () => void;
  onUpdateField: (id: string, patch: Partial<ProBoardField>) => void;
  onDeleteField: (id: string) => void;
  onSelectField: (id: string) => void;
  onInsertSelectedFileName: () => void;
}

export function ProLowerBandItemManager({
  fields,
  selectedFieldId,
  title = '하부띠 항목',
  description = '보드판에 표시할 항목명과 내용을 정리합니다.',
  variant = 'editor',
  onAddField,
  onUpdateField,
  onDeleteField,
  onSelectField,
  onInsertSelectedFileName
}: ProLowerBandItemManagerProps) {
  return (
    <section className={`pro-v2-lower-band-manager ${variant === 'compact' ? 'compact' : 'editor'}`} data-evidence="lower-band-controls">
      <div className="pro-v2-board-section-heading">
        <div>
          <h3>{title}</h3>
          <p>{description}</p>
        </div>
        <div className="pro-v2-lower-band-actions" data-evidence="lower-band-toolbar">
          <button type="button" className="pro-v2-action secondary" onClick={onInsertSelectedFileName}>
            선택 사진명 넣기
          </button>
          <button type="button" className="pro-v2-action primary pro-v2-board-primary" onClick={onAddField}>
            <Plus size={16} aria-hidden /> 항목 추가
          </button>
        </div>
      </div>

      {fields.length === 0 ? (
        <div className="pro-v2-board-empty">아직 표시할 항목이 없습니다. 항목을 추가해 보드판 내용을 구성하세요.</div>
      ) : (
        <div className="pro-v2-lower-band-rows">
          {fields.map((field, index) => {
            const selected = field.id === selectedFieldId;
            return (
              <div
                key={field.id}
                className={selected ? 'pro-v2-lower-band-row selected' : 'pro-v2-lower-band-row'}
                data-evidence={index === 0 ? 'lower-band-added-row' : undefined}
                onFocusCapture={() => onSelectField(field.id)}
              >
                <button
                  type="button"
                  className="pro-v2-row-select"
                  aria-pressed={selected}
                  aria-label={`${index + 1}번 하부띠 항목 선택`}
                  onClick={() => onSelectField(field.id)}
                >
                  {index + 1}
                </button>
                <span className={selected ? 'pro-v2-selected-label' : 'pro-v2-row-state-label'}>
                  {selected ? (
                    <>
                      <CheckCircle2 size={13} aria-hidden />
                      선택
                    </>
                  ) : (
                    '항목'
                  )}
                </span>
                <label className="pro-v2-lower-band-label-control">
                  항목명
                  <input
                    aria-label={`${index + 1}번 하부띠 항목명`}
                    value={field.label}
                    onChange={(event) => onUpdateField(field.id, { label: event.currentTarget.value })}
                  />
                </label>
                <label className="pro-v2-lower-band-value-control">
                  내용
                  <input
                    aria-label={`${index + 1}번 하부띠 내용`}
                    value={field.value}
                    onChange={(event) => onUpdateField(field.id, { value: event.currentTarget.value })}
                  />
                </label>
                <button
                  type="button"
                  className="pro-v2-row-delete"
                  data-evidence={index === 0 ? 'lower-band-delete-ready' : undefined}
                  aria-label={`${field.label || '항목'} 삭제`}
                  onClick={() => onDeleteField(field.id)}
                  title="삭제"
                >
                  <X size={17} aria-hidden />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
