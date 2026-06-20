import type { ReactNode } from 'react';

import type { PhotoLedgerInfo, PhotoRotation } from '../../shared/types';

export type ProPdfFlowStep = 'photo' | 'details' | 'generate' | 'result';
export type ProPdfStatusKind = 'info' | 'success' | 'error';

export interface ProPdfPhoto {
  path: string;
  name: string;
  selectedForProcessing: boolean;
  rotation?: PhotoRotation;
}

export interface ProPdfFlowModel {
  photos: ProPdfPhoto[];
  selectedPhotoPath: string;
  selectedPhotoName?: string;
  selectedPhotoIndex: number;
  selectedPhotoRotation: number;
  selectedPhotoLedger: PhotoLedgerInfo;
  selectedPhotoDate: string;
  photoCount: number;
  checkedCount: number;
  hasSelectedPhoto: boolean;
  saveFolderReady: boolean;
  previewReady: boolean;
  pdfTitle: string;
  useBoardFields: boolean;
  usePhotoDate: boolean;
  previewPage: number;
  previewPageCount: number;
  isProcessing: boolean;
  statusKind?: ProPdfStatusKind;
  statusText?: string;
}

export interface ProPdfFlowActions {
  onAddPhotos: () => void;
  onAddPhotoFolder: () => void;
  onPastePhoto: () => void;
  onClearPhotos: () => void;
  onSelectAllPhotos: () => void;
  onClearPhotoChecks: () => void;
  onInvertPhotoChecks: () => void;
  onSelectPhoto: (path: string) => void;
  onTogglePhotoChecked: (path: string) => void;
  onRemovePhoto: (path: string) => void;
  onRotateSelected: (direction: -1 | 1) => void;
  onMoveSelectedPhotoOrder: (direction: -1 | 1) => void;
  onSelectSaveFolder: () => void;
  onOpenSaveFolder: () => void;
  onUpdatePdfTitle: (value: string) => void;
  onToggleUseBoardFields: (enabled: boolean) => void;
  onToggleUsePhotoDate: (enabled: boolean) => void;
  onUpdateSelectedLedger: (patch: Partial<PhotoLedgerInfo>) => void;
  onApplyBoardFieldsToSelectedLedger: () => void;
  onApplySelectedLedgerToCheckedPhotos: () => void;
  onOpenPreview: () => void;
  onPreviousPreviewPage: () => void;
  onNextPreviewPage: () => void;
  onGeneratePdf: () => void | Promise<void>;
}

export interface ProPdfFlowSlots {
  previewPanel: ReactNode;
}

export interface ProPdfFlowController {
  model: ProPdfFlowModel;
  actions: ProPdfFlowActions;
  slots: ProPdfFlowSlots;
}
