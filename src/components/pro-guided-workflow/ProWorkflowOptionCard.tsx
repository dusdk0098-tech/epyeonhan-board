import type { ReactNode } from 'react';
import { CheckCircle2 } from 'lucide-react';

interface ProWorkflowOptionCardProps {
  title: string;
  description: string;
  selected?: boolean;
  disabled?: boolean;
  meta?: string;
  nextHint?: string;
  icon?: ReactNode;
  onClick: () => void;
}

export function ProWorkflowOptionCard({
  title,
  description,
  selected = false,
  disabled = false,
  meta,
  nextHint,
  icon,
  onClick
}: ProWorkflowOptionCardProps) {
  return (
    <button
      type="button"
      className={selected ? 'pro-workflow-option selected' : 'pro-workflow-option'}
      aria-pressed={selected}
      disabled={disabled}
      onClick={onClick}
    >
      <span className="pro-workflow-option-icon" aria-hidden>
        {icon ?? <CheckCircle2 size={16} />}
      </span>
      <span className="pro-workflow-option-copy">
        <strong>{title}</strong>
        <small>{description}</small>
        {meta && <em>{meta}</em>}
        {nextHint && <em className="pro-workflow-option-next">{nextHint}</em>}
      </span>
      {selected && <CheckCircle2 className="pro-workflow-option-check" size={17} aria-hidden />}
    </button>
  );
}
