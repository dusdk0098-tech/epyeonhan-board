import type { ReactNode, Ref } from 'react';
import { CheckCircle2 } from 'lucide-react';

interface ProWorkflowStepProps {
  stepNumber: number;
  title: string;
  description: string;
  current?: boolean;
  completed?: boolean;
  className?: string;
  focusRef?: Ref<HTMLElement>;
  children: ReactNode;
}

export function ProWorkflowStep({
  stepNumber,
  title,
  description,
  current = false,
  completed = false,
  className,
  focusRef,
  children
}: ProWorkflowStepProps) {
  const statusClass = completed ? 'completed' : current ? 'current' : 'pending';
  const stepClassName = ['pro-workflow-step', statusClass, className].filter(Boolean).join(' ');

  return (
    <section
      ref={focusRef}
      className={stepClassName}
      aria-current={current ? 'step' : undefined}
      tabIndex={current ? -1 : undefined}
    >
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
