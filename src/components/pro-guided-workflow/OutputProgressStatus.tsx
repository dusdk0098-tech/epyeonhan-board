import { AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';
import type { ProOutputFeedback } from './ProGuidedWorkflow';

interface OutputProgressStatusProps {
  feedback: ProOutputFeedback;
}

export function OutputProgressStatus({ feedback }: OutputProgressStatusProps) {
  const isGenerating = feedback.state === 'generating';
  const icon = feedback.state === 'success'
    ? <CheckCircle2 size={17} aria-hidden />
    : feedback.state === 'error'
      ? <AlertCircle size={17} aria-hidden />
      : <Loader2 size={17} aria-hidden className={isGenerating ? 'spinning' : ''} />;

  return (
    <div className={`pro-output-status ${feedback.state}`} aria-live="polite" role="status">
      <div className="pro-output-status-copy">
        {icon}
        <span>
          <strong>{feedback.title}</strong>
          <small>{feedback.message}</small>
        </span>
      </div>
      {isGenerating && (
        <div className="pro-output-progress" role="progressbar" aria-label={`${feedback.title} 진행 상태`}>
          <span />
        </div>
      )}
    </div>
  );
}
