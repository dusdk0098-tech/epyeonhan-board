import { contextBridge, ipcRenderer } from 'electron';
import type { ProcessImagesPayload } from '../src/shared/types';

contextBridge.exposeInMainWorld('constructView', {
  selectPhotos: () => ipcRenderer.invoke('photos:select'),
  selectPhotoFolder: () => ipcRenderer.invoke('photos:select-folder'),
  selectSaveFolder: () => ipcRenderer.invoke('folder:select-save'),
  openFolder: (folderPath: string) => ipcRenderer.invoke('folder:open', folderPath),
  getImageDataUrl: (photoPath: string) => ipcRenderer.invoke('image:data-url', photoPath),
  readPhotoDateTimes: (photoPaths: string[]) => ipcRenderer.invoke('photos:read-date-times', photoPaths),
  importDateTimeSheet: () => ipcRenderer.invoke('sheet:import-date-times'),
  processImages: (payload: ProcessImagesPayload) => ipcRenderer.invoke('images:process', payload),
  resizeWindow: (size: { width: number; height: number }) => ipcRenderer.invoke('window:resize', size),
  getDeviceIdentity: () => ipcRenderer.invoke('auth:get-device-fingerprint'),
  getAppVersion: () => ipcRenderer.invoke('auth:get-app-version')
});
