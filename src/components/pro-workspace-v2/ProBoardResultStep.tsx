import { AlertCircle, CheckCircle2, FolderOpen, RotateCcw, Settings } from 'lucide-react';

import type { ProBoardFlowActions, ProBoardFlowModel } from './boardFlowTypes';

interface ProBoardResultStepProps {
  model: ProBoardFlowModel;
  actions: ProBoardFlowActions;
  onEditSettings: () => void;
  onStartNew: () => void;
}

export function ProBoardResultStep({ model, actions, onEditSettings, onStartNew }: ProBoardResultStepProps) {
  const success = model.statusKind === 'success';
  const error = model.statusKind === 'error';
  const Icon = success ? CheckCircle2 : error ? AlertCircle : Settings;

  return (
    <div className="pro-v2-board-step pro-v2-board-result-step" data-evidence={success ? 'board-result-success' : 'board-result-failure'}>
      <section className={success ? 'pro-v2-result-card success' : error ? 'pro-v2-result-card error' : 'pro-v2-result-card'}>
        <Icon size={28} aria-hidden />
        <div>
          <h3>{success ? '보드판 이미지 생성 완료' : error ? '보드판 이미지 생성 문제' : '생성 결과 확인'}</h3>
          <p>
            {model.statusText || (success
              ? '결과가 생성되었습니다.'
              : '결과 상태를 확인하고 다시 시도하거나 설정을 수정하세요.')}
          </p>
        </div>
      </section>
      <div className="pro-v2-result-actions">
        <button type="button" className="pro-v2-action secondary" disabled={!model.saveFolderReady} onClick={actions.onOpenSaveFolder}>
          <FolderOpen size={16} aria-hidden /> 저장 폴더 열기
        </button>
        <button type="button" className="pro-v2-action secondary" onClick={onEditSettings}>
          <Settings size={16} aria-hidden /> 설정 수정
        </button>
        <button type="button" className="pro-v2-action primary pro-v2-board-primary" onClick={onStartNew}>
          <RotateCcw size={16} aria-hidden /> 새 보드판 작업
        </button>
      </div>
    </div>
  );
}
