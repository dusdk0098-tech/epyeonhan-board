import { AlertCircle, CheckCircle2, FolderOpen, Image as ImageIcon } from 'lucide-react';

import type { ProBoardFlowModel } from './boardFlowTypes';

interface ProBoardReadinessSummaryProps {
  model: ProBoardFlowModel;
}

export function ProBoardReadinessSummary({ model }: ProBoardReadinessSummaryProps) {
  const rows = [
    {
      label: '사진',
      ready: model.photoCount > 0 && model.hasSelectedPhoto,
      value: model.hasSelectedPhoto ? `${model.photoCount}장 중 선택됨` : '선택 필요',
      icon: ImageIcon
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
      value: model.previewReady ? '확인 가능' : '사진 선택 필요',
      icon: CheckCircle2
    }
  ];

  return (
    <div className="pro-v2-readiness-grid" aria-label="생성 준비 상태">
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
