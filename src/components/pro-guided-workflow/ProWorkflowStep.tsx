import type { ReactNode } from 'react';
import { CheckCircle2 } from 'lucide-react';

interface ProWorkflowStepProps {
  stepNumber: number;
  title: string;
  description: string;
  current?: boolean;
  completed?: boolean;
  children: ReactNode;
}

export function ProWorkflowStep({
  stepNumber,
  title,
  description,
  current = false,
  completed = false,
  children
}: ProWorkflowStepProps) {
  const statusClass = completed ? 'completed' : current ? 'current' : 'pending';

  return (
    <section className={`pro-workflow-step ${statusClass}`} aria-current={current ? 'step' : undefined}>
      <div className="pro-workflow-step-head">
        <span className="pro-workflow-step-index" aria-hidden>
          {completed ? <CheckCircle2 size={16} /> : stepNumber}
        </span>
        <div>
          <h4>{title}</h4>
          <p>{description}</p>
        </div>
      </div>
      <div className="pro-workflow-step-body">{children}</div>
    </section>
  );
}
