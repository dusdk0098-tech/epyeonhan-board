import type {
  CopyImageResult,
  CopyPreviewImagePayload,
  DialogPhotoResult,
  FolderResult,
  ImageDataResult,
  ImportSheetResult,
  ProcessImagesPayload,
  ProcessImagesResult,
  ReadDateTimeResult
} from './shared/types';
import type { AuthDeviceIdentity } from './shared/authTypes';

export type UpdateStatusPhase =
  | 'checking'
  | 'available'
  | 'downloading'
  | 'verifying'
  | 'installing'
  | 'restarting'
  | 'failed';

export interface UpdateStatusPayload {
  phase: UpdateStatusPhase;
  version?: string;
  percent?: number;
  downloadedBytes?: number;
  totalBytes?: number;
  message?: string;
  error?: string;
}

export interface ConstructViewApi {
  selectPhotos: () => Promise<DialogPhotoResult>;
  selectPhotoFolder: () => Promise<DialogPhotoResult>;
  getPathForFile: (file: File) => string;
  resolveDroppedPhotos: (paths: string[]) => Promise<DialogPhotoResult>;
  selectSaveFolder: () => Promise<FolderResult>;
  openFolder: (folderPath: string) => Promise<{ ok: boolean; error?: string }>;
  getImageDataUrl: (photoPath: string) => Promise<ImageDataResult>;
  readPhotoDateTimes: (photoPaths: string[]) => Promise<ReadDateTimeResult>;
  importDateTimeSheet: () => Promise<ImportSheetResult>;
  processImages: (payload: ProcessImagesPayload) => Promise<ProcessImagesResult>;
  copyPreviewImage: (payload: CopyPreviewImagePayload) => Promise<CopyImageResult>;
  resizeWindow: (size: { width: number; height: number }) => Promise<{ ok: boolean; error?: string }>;
  getDeviceIdentity: () => Promise<AuthDeviceIdentity>;
  getAppVersion: () => Promise<string>;
  openOAuthUrl: (url: string) => Promise<{ ok: boolean; error?: string }>;
  onOAuthCallback: (callback: (url: string) => void) => () => void;
  onUpdateStatus: (callback: (status: UpdateStatusPayload) => void) => () => void;
}

declare global {
  interface Window {
    constructView: ConstructViewApi;
  }
}
