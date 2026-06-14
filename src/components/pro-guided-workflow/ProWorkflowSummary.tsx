import { Pencil } from 'lucide-react';

export interface ProWorkflowSummaryItem {
  id: string;
  label: string;
  value: string;
  stepId: string;
}

interface ProWorkflowSummaryProps {
  items: ProWorkflowSummaryItem[];
  onEdit: (stepId: string) => void;
}

export function ProWorkflowSummary({ items, onEdit }: ProWorkflowSummaryProps) {
  return (
    <div className="pro-workflow-summary" aria-label="완료된 PRO 설정 요약">
      {items.map((item) => (
        <div key={item.id} className="pro-workflow-summary-row">
          <span>{item.label}</span>
          <strong>{item.value}</strong>
          <button type="button" onClick={() => onEdit(item.stepId)}>
            <Pencil size={13} aria-hidden /> 수정
          </button>
        </div>
      ))}
    </div>
  );
}
