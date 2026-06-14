import { CheckCircle2 } from 'lucide-react';
import type { ProWorkflowStepItem } from './ProGuidedWorkflow';

interface ProWorkflowStepperProps {
  steps: ProWorkflowStepItem[];
  currentStepId: string;
  onStepSelect: (stepId: string) => void;
}

export function ProWorkflowStepper({ steps, currentStepId, onStepSelect }: ProWorkflowStepperProps) {
  const currentIndex = Math.max(0, steps.findIndex((step) => step.id === currentStepId));

  return (
    <div className="pro-workflow-stepper" aria-label="PRO 단계 진행 상태">
      {steps.map((step, index) => {
        const completed = index < currentIndex;
        const current = step.id === currentStepId;
        return (
          <button
            key={step.id}
            type="button"
            className={completed ? 'completed' : current ? 'current' : ''}
            aria-current={current ? 'step' : undefined}
            onClick={() => onStepSelect(step.id)}
          >
            <span>{completed ? <CheckCircle2 size={13} /> : index + 1}</span>
            <strong>{step.shortTitle}</strong>
          </button>
        );
      })}
    </div>
  );
}
