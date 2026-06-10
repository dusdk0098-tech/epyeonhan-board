import type {
  DialogPhotoResult,
  FolderResult,
  ImageDataResult,
  ImportSheetResult,
  ProcessImagesPayload,
  ProcessImagesResult,
  ReadDateTimeResult
} from './shared/types';
import type { AuthDeviceIdentity } from './shared/authTypes';

export interface ConstructViewApi {
  selectPhotos: () => Promise<DialogPhotoResult>;
  selectPhotoFolder: () => Promise<DialogPhotoResult>;
  selectSaveFolder: () => Promise<FolderResult>;
  openFolder: (folderPath: string) => Promise<{ ok: boolean; error?: string }>;
  getImageDataUrl: (photoPath: string) => Promise<ImageDataResult>;
  readPhotoDateTimes: (photoPaths: string[]) => Promise<ReadDateTimeResult>;
  importDateTimeSheet: () => Promise<ImportSheetResult>;
  processImages: (payload: ProcessImagesPayload) => Promise<ProcessImagesResult>;
  resizeWindow: (size: { width: number; height: number }) => Promise<{ ok: boolean; error?: string }>;
  getDeviceIdentity: () => Promise<AuthDeviceIdentity>;
  getAppVersion: () => Promise<string>;
}

declare global {
  interface Window {
    constructView: ConstructViewApi;
  }
}
