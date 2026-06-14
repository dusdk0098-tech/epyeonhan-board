import { CheckCircle2 } from 'lucide-react';
import type { ProWorkflowStepItem } from './ProGuidedWorkflow';

interface ProWorkflowStepperProps {
  steps: ProWorkflowStepItem[];
  currentStepId: string;
  recentlyCompletedStepId?: string | null;
}

export function ProWorkflowStepper({ steps, currentStepId, recentlyCompletedStepId }: ProWorkflowStepperProps) {
  const currentIndex = Math.max(0, steps.findIndex((step) => step.id === currentStepId));
  const currentStep = steps[currentIndex] ?? steps[0];

  return (
    <div className="pro-workflow-stepper compact" aria-label="PRO 단계 진행 상태">
      <div className="pro-workflow-progress-copy" aria-current="step">
        <span>{currentIndex + 1} / {steps.length}</span>
        <strong>{currentStep.shortTitle}</strong>
        <small>{currentStep.title}</small>
      </div>
      <ol className="pro-workflow-progress-dots" aria-hidden>
        {steps.map((step, index) => {
          const completed = index < currentIndex;
          const current = step.id === currentStepId;
          const stepClassName = [
            completed ? 'completed' : current ? 'current' : '',
            step.id === recentlyCompletedStepId ? 'recently-completed' : ''
          ].filter(Boolean).join(' ');

          return (
            <li key={step.id} className={stepClassName}>
              {completed ? <CheckCircle2 size={10} /> : index + 1}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
