import { AlertCircle, CheckCircle2, FolderOpen, RotateCcw, Settings } from 'lucide-react';

import type { ProPdfFlowActions, ProPdfFlowModel } from './pdfFlowTypes';

interface ProPdfResultStepProps {
  model: ProPdfFlowModel;
  actions: ProPdfFlowActions;
  onEditSettings: () => void;
  onRetry: () => void;
  onStartNew: () => void;
}

export function ProPdfResultStep({ model, actions, onEditSettings, onRetry, onStartNew }: ProPdfResultStepProps) {
  const success = model.statusKind === 'success';
  const error = model.statusKind === 'error';
  const Icon = success ? CheckCircle2 : error ? AlertCircle : Settings;

  return (
    <div className="pro-v2-pdf-step pro-v2-pdf-result-step" data-evidence={success ? 'pdf-result-success' : 'pdf-result-failure'}>
      <section
        className={success ? 'pro-v2-result-card success' : error ? 'pro-v2-result-card error' : 'pro-v2-result-card'}
        aria-live={error ? 'assertive' : 'polite'}
        role={error ? 'alert' : 'status'}
      >
        <Icon size={28} aria-hidden />
        <div>
          <h3>{success ? '사진대지 PDF 생성 완료' : error ? '사진대지 PDF 생성 문제' : 'PDF 생성 결과 확인'}</h3>
          <p>
            {model.statusText || (success
              ? 'PDF 결과가 생성되었습니다.'
              : '결과 상태를 확인하고 저장 폴더 또는 PDF 설정으로 돌아가 다시 시도하세요.')}
          </p>
        </div>
      </section>
      <div className="pro-v2-result-actions">
        <button type="button" className="pro-v2-action secondary" disabled={!model.saveFolderReady} onClick={actions.onOpenSaveFolder}>
          <FolderOpen size={16} aria-hidden /> 저장 폴더 열기
        </button>
        <button type="button" className="pro-v2-action secondary" onClick={onEditSettings}>
          <Settings size={16} aria-hidden /> PDF 설정 복귀
        </button>
        {error ? (
          <button type="button" className="pro-v2-action primary pro-v2-pdf-primary" disabled={model.isProcessing} onClick={onRetry}>
            <RotateCcw size={16} aria-hidden /> PDF 다시 생성
          </button>
        ) : (
          <button type="button" className="pro-v2-action primary pro-v2-pdf-primary" onClick={onStartNew}>
            <RotateCcw size={16} aria-hidden /> 새 PDF 작업
          </button>
        )}
      </div>
    </div>
  );
}
