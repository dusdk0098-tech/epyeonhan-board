import type { ReactNode } from 'react';

export type ProWorkspaceJob = 'board-image' | 'photo-ledger-pdf';

export interface ProWorkspaceSummary {
  photoCount: number;
  checkedCount: number;
  hasSelectedPhoto: boolean;
  saveFolderReady: boolean;
  isProcessing: boolean;
  statusText?: string;
  activeSettingsLabel: string;
}

export interface ProTaskChoiceOption {
  job: ProWorkspaceJob;
  title: string;
  resultLabel: string;
  description: string;
  primaryActionLabel: string;
  bullets: string[];
}

export interface ProLegacyAdapterContent {
  photoPanel: ReactNode;
  settingsPanel: ReactNode;
  previewPanel: ReactNode;
}
