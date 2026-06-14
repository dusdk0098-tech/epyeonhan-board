import { CheckCircle2 } from 'lucide-react';
import type { ProWorkflowStepItem } from './ProGuidedWorkflow';

interface ProWorkflowStepperProps {
  steps: ProWorkflowStepItem[];
  currentStepId: string;
  recentlyCompletedStepId?: string | null;
}

export function ProWorkflowStepper({ steps, currentStepId, recentlyCompletedStepId }: ProWorkflowStepperProps) {
  const currentIndex = Math.max(0, steps.findIndex((step) => step.id === currentStepId));

  return (
    <ol className="pro-workflow-stepper" aria-label="PRO 단계 진행 상태">
      {steps.map((step, index) => {
        const completed = index < currentIndex;
        const current = step.id === currentStepId;
        const stepClassName = [
          completed ? 'completed' : current ? 'current' : '',
          step.id === recentlyCompletedStepId ? 'recently-completed' : ''
        ].filter(Boolean).join(' ');

        return (
          <li
            key={step.id}
            className={stepClassName}
            aria-current={current ? 'step' : undefined}
          >
            <span>{completed ? <CheckCircle2 size={13} /> : index + 1}</span>
            <strong>{step.shortTitle}</strong>
          </li>
        );
      })}
    </ol>
  );
}
