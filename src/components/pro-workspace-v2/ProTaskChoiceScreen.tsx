import { CheckCircle2, FileSpreadsheet, Image as ImageIcon } from 'lucide-react';

import type { ProTaskChoiceOption, ProWorkspaceJob } from './types';

interface ProTaskChoiceScreenProps {
  selectedJob: ProWorkspaceJob | null;
  options: ProTaskChoiceOption[];
  onSelectJob: (job: ProWorkspaceJob) => void;
}

const jobIcon = {
  'board-image': ImageIcon,
  'photo-ledger-pdf': FileSpreadsheet
} satisfies Record<ProWorkspaceJob, typeof ImageIcon>;

export function ProTaskChoiceScreen({ selectedJob, options, onSelectJob }: ProTaskChoiceScreenProps) {
  return (
    <div className="pro-v2-choice" aria-label="PRO 작업 유형 선택">
      {options.map((option) => {
        const Icon = jobIcon[option.job];
        const selected = selectedJob === option.job;

        return (
          <button
            key={option.job}
            type="button"
            className={selected ? 'pro-v2-job-card selected' : 'pro-v2-job-card'}
            aria-pressed={selected}
            onClick={() => onSelectJob(option.job)}
          >
            <span className="pro-v2-job-icon" aria-hidden>
              <Icon size={24} />
            </span>
            <span className="pro-v2-job-copy">
              <strong>{option.title}</strong>
              <span>{option.description}</span>
            </span>
            <span className="pro-v2-job-result">{option.resultLabel}</span>
            <span className="pro-v2-job-bullets">
              {option.bullets.map((bullet) => (
                <span key={bullet}>
                  <CheckCircle2 size={15} aria-hidden />
                  {bullet}
                </span>
              ))}
            </span>
          </button>
        );
      })}
    </div>
  );
}
