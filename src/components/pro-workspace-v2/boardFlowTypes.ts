import type { ReactNode } from 'react';

export type ProBoardFlowStep = 'photo' | 'content' | 'adjust' | 'generate' | 'result';
export type ProBoardGenerateMode = 'selected' | 'checked';
export type ProBoardStatusKind = 'info' | 'success' | 'error';

export interface ProBoardPhoto {
  path: string;
  name: string;
  selectedForProcessing: boolean;
  rotation?: number;
}

export interface ProBoardField {
  id: string;
  label: string;
  value: string;
}

export interface ProBoardFlowModel {
  photos: ProBoardPhoto[];
  fields: ProBoardField[];
  selectedPhotoPath: string;
  selectedPhotoName?: string;
  selectedPhotoIndex: number;
  selectedFieldId: string;
  selectedPhotoRotation: number;
  photoCount: number;
  checkedCount: number;
  hasSelectedPhoto: boolean;
  saveFolderReady: boolean;
  previewReady: boolean;
  bottomStripEnabled: boolean;
  highlightEnabled: boolean;
  isProcessing: boolean;
  statusKind?: ProBoardStatusKind;
  statusText?: string;
}

export interface ProBoardFlowActions {
  onAddPhotos: () => void;
  onAddPhotoFolder: () => void;
  onPastePhoto: () => void;
  onClearPhotos: () => void;
  onShowPhotoList: () => void;
  onSelectAllPhotos: () => void;
  onClearPhotoChecks: () => void;
  onInvertPhotoChecks: () => void;
  onSelectPhoto: (path: string) => void;
  onTogglePhotoChecked: (path: string) => void;
  onRemovePhoto: (path: string) => void;
  onRotateSelected: (direction: -1 | 1) => void;
  onSelectSaveFolder: () => void;
  onOpenSaveFolder: () => void;
  onAddField: () => void;
  onUpdateField: (id: string, patch: Partial<ProBoardField>) => void;
  onDeleteField: (id: string) => void;
  onSelectField: (id: string) => void;
  onInsertSelectedFileName: () => void;
  onToggleBottomStrip: (enabled: boolean) => void;
  onOpenLargePreview: () => void;
  onCopyPreview: () => void;
  onPrintPreview: () => void;
  onGenerate: (mode: ProBoardGenerateMode) => void | Promise<void>;
}

export interface ProBoardFlowSlots {
  previewPanel: ReactNode;
  layoutControls: ReactNode;
  dateTimeControls: ReactNode;
  typographyControls: ReactNode;
  highlightControls: ReactNode;
}

export interface ProBoardFlowController {
  model: ProBoardFlowModel;
  actions: ProBoardFlowActions;
  slots: ProBoardFlowSlots;
}
