import { contextBridge, ipcRenderer, webUtils } from 'electron';
import type { CopyPreviewImagePayload, PrintPreviewImagePayload, ProcessImagesPayload, RenderPreviewImagePayload } from '../src/shared/types';

contextBridge.exposeInMainWorld('constructView', {
  selectPhotos: () => ipcRenderer.invoke('photos:select'),
  selectPhotoFolder: () => ipcRenderer.invoke('photos:select-folder'),
  getPathForFile: (file: File) => webUtils.getPathForFile(file),
  resolveDroppedPhotos: (paths: string[]) => ipcRenderer.invoke('photos:resolve-dropped', paths),
  pasteClipboardImage: () => ipcRenderer.invoke('clipboard:paste-image'),
  selectSaveFolder: () => ipcRenderer.invoke('folder:select-save'),
  openFolder: (folderPath: string) => ipcRenderer.invoke('folder:open', folderPath),
  getImageDataUrl: (photoPath: string) => ipcRenderer.invoke('image:data-url', photoPath),
  readPhotoDateTimes: (photoPaths: string[]) => ipcRenderer.invoke('photos:read-date-times', photoPaths),
  importDateTimeSheet: () => ipcRenderer.invoke('sheet:import-date-times'),
  processImages: (payload: ProcessImagesPayload) => ipcRenderer.invoke('images:process', payload),
  renderPreviewImage: (payload: RenderPreviewImagePayload) => ipcRenderer.invoke('images:render-preview', payload),
  copyPreviewImage: (payload: CopyPreviewImagePayload) => ipcRenderer.invoke('images:copy-preview', payload),
  printPreviewImage: (payload: PrintPreviewImagePayload) => ipcRenderer.invoke('images:print-preview', payload),
  resizeWindow: (size: { width: number; height: number }) => ipcRenderer.invoke('window:resize', size),
  getDeviceIdentity: () => ipcRenderer.invoke('auth:get-device-fingerprint'),
  getAppVersion: () => ipcRenderer.invoke('auth:get-app-version'),
  openOAuthUrl: (url: string) => ipcRenderer.invoke('auth:open-oauth-url', url),
  getRememberedLogin: () => ipcRenderer.invoke('auth:get-remembered-login'),
  saveRememberedLogin: (payload: { remember: boolean; email: string; password: string }) => ipcRenderer.invoke('auth:save-remembered-login', payload),
  clearRememberedLogin: () => ipcRenderer.invoke('auth:clear-remembered-login'),
  onOAuthCallback: (callback: (url: string) => void) => {
    const listener = (_event: Electron.IpcRendererEvent, url: string) => callback(url);
    ipcRenderer.on('auth:oauth-callback', listener);
    return () => ipcRenderer.removeListener('auth:oauth-callback', listener);
  },
  onUpdateStatus: (callback: (status: unknown) => void) => {
    const listener = (_event: Electron.IpcRendererEvent, status: unknown) => callback(status);
    ipcRenderer.on('update:status', listener);
    return () => ipcRenderer.removeListener('update:status', listener);
  }
});
