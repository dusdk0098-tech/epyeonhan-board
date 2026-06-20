import { AlertCircle, CheckCircle2, FileText, FolderOpen, Image as ImageIcon } from 'lucide-react';

import type { ProPdfFlowModel } from './pdfFlowTypes';

interface ProPdfReadinessSummaryProps {
  model: ProPdfFlowModel;
}

export function ProPdfReadinessSummary({ model }: ProPdfReadinessSummaryProps) {
  const rows = [
    {
      label: 'PDF 사진',
      ready: model.checkedCount > 0,
      value: model.checkedCount > 0 ? `${model.checkedCount}장 체크` : '체크 필요',
      icon: ImageIcon
    },
    {
      label: 'PDF 정보',
      ready: model.pdfTitle.trim().length > 0,
      value: model.pdfTitle.trim() || '제목 필요',
      icon: FileText
    },
    {
      label: '저장 폴더',
      ready: model.saveFolderReady,
      value: model.saveFolderReady ? '준비됨' : '지정 필요',
      icon: FolderOpen
    },
    {
      label: '미리보기',
      ready: model.previewReady,
      value: model.previewReady ? `${model.previewPage + 1} / ${model.previewPageCount}` : '사진 필요',
      icon: CheckCircle2
    }
  ];

  return (
    <div className="pro-v2-readiness-grid pro-v2-pdf-readiness-grid" aria-label="PDF 생성 준비 상태">
      {rows.map((row) => {
        const Icon = row.ready ? row.icon : AlertCircle;
        return (
          <div key={row.label} className={row.ready ? 'pro-v2-readiness-card ready' : 'pro-v2-readiness-card blocked'}>
            <Icon size={18} aria-hidden />
            <span>{row.label}</span>
            <strong>{row.value}</strong>
          </div>
        );
      })}
    </div>
  );
}
