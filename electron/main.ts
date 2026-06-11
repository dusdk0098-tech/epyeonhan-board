import { app, BrowserWindow, Menu, clipboard, dialog, ipcMain, nativeImage, safeStorage, shell, type WebContents } from 'electron';
import * as fs from 'fs/promises';
import { constants as fsConstants } from 'fs';
import { spawn, spawnSync } from 'child_process';
import { createHash } from 'crypto';
import path from 'path';
import os from 'os';
import sharp from 'sharp';
import * as exifr from 'exifr';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import { createPhotoLedgerPdf, type PhotoLedgerPdfEntry } from './photoLedgerPdf';
import type {
  BoardField,
  BoardSettings,
  CopyImageResult,
  CopyPreviewImagePayload,
  DateTimeMap,
  DateTimeValue,
  DialogPhotoResult,
  FolderResult,
  ImportSheetResult,
  PhotoHighlight,
  PhotoItem,
  PrintImageResult,
  PrintPreviewImagePayload,
  ProcessImagesPayload,
  ProcessImagesResult,
  ReadDateTimeResult,
  TimeOptions
} from '../src/shared/types';
import {
  buildBoardSvg as buildSharedBoardSvg,
  calculateBoardPosition as calculateSharedBoardPosition
} from '../src/shared/boardRenderer';
import { buildHighlightMaskSvg, buildHighlightSvg } from '../src/shared/highlightRenderer';
import { UPDATE_BASE_URL } from '../src/shared/updateConfig';
import type { UpdateManifest } from '../src/shared/updateTypes';
import {
  buildLatestManifestUrl,
  isAllowedDownloadUrl,
  isNewerVersion,
  parseUpdateManifest
} from '../src/shared/updateUtils';

const imageExtensions = new Set(['.jpg', '.jpeg', '.png', '.webp']);
const sheetExtensions = new Set(['.csv', '.xlsx', '.xls']);
const maxDroppedPathCount = 500;
const maxFolderImageCount = 2000;
const maxImageInputBytes = 80 * 1024 * 1024;
const maxClipboardImagePixels = 60_000_000;
const maxClipboardImageBytes = maxImageInputBytes;
const maxClipboardCacheFiles = 100;
const maxSheetInputBytes = 10 * 1024 * 1024;
const updateCheckDelayMs = 2500;
const updateRequestTimeoutMs = 15000;
const oauthProtocol = 'epyeonhan-board';
let updateInstallInProgress = false;
let mainWindow: BrowserWindow | null = null;
let pendingOAuthCallbackUrl: string | null = null;
const gotSingleInstanceLock = app.requestSingleInstanceLock();

type UpdateStatusPayload = {
  phase: 'checking' | 'available' | 'downloading' | 'verifying' | 'installing' | 'restarting' | 'failed';
  version?: string;
  percent?: number;
  downloadedBytes?: number;
  totalBytes?: number;
  message?: string;
  error?: string;
};

type RememberedLoginPayload = {
  remember: boolean;
  email: string;
  password: string;
};

type RememberedLoginResult = {
  ok: boolean;
  remember?: boolean;
  email?: string;
  password?: string;
  passwordAvailable?: boolean;
  error?: string;
};

function createWindow() {
  const win = new BrowserWindow({
    width: 998,
    height: 826,
    minWidth: 998,
    minHeight: 826,
    maxWidth: 998,
    maxHeight: 826,
    resizable: false,
    maximizable: false,
    title: 'PEDIT (페딧)',
    icon: getWindowIconPath(),
    autoHideMenuBar: true,
    backgroundColor: '#f8f9ff',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  });
  mainWindow = win;
  hardenWebContents(win);
  win.setMenuBarVisibility(false);
  win.on('closed', () => {
    if (mainWindow === win) {
      mainWindow = null;
    }
  });
  win.webContents.on('did-finish-load', () => {
    setTimeout(() => flushPendingOAuthCallback(), 300);
  });

  const devServerUrl = process.env.VITE_DEV_SERVER_URL;
  if (devServerUrl) {
    win.loadURL(devServerUrl);
  } else {
    win.loadFile(path.join(__dirname, '..', '..', 'dist', 'index.html'));
  }

  return win;
}

function getWindowIconPath() {
  return app.isPackaged
    ? path.join(process.resourcesPath, 'icon.ico')
    : path.join(__dirname, '..', '..', 'build', 'icon.ico');
}

if (!gotSingleInstanceLock) {
  app.quit();
} else {
  app.on('second-instance', (_event, argv) => {
    const callbackUrl = findOAuthCallbackUrl(argv);
    if (callbackUrl) {
      handleOAuthCallbackUrl(callbackUrl);
      return;
    }

    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });

  app.whenReady().then(() => {
    Menu.setApplicationMenu(null);
    registerOAuthProtocol();
    registerIpcHandlers();
    const win = createWindow();
    scheduleUpdateCheck(win);

    const startupCallbackUrl = findOAuthCallbackUrl(process.argv);
    if (startupCallbackUrl) {
      handleOAuthCallbackUrl(startupCallbackUrl);
    }

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        const activatedWindow = createWindow();
        scheduleUpdateCheck(activatedWindow);
      }
    });
  });
}

app.on('open-url', (event, url) => {
  event.preventDefault();
  handleOAuthCallbackUrl(url);
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

function scheduleUpdateCheck(win: BrowserWindow) {
  if (!app.isPackaged) {
    return;
  }

  setTimeout(() => {
    void checkForUpdates(win);
  }, updateCheckDelayMs);
}

async function checkForUpdates(win: BrowserWindow) {
  try {
    if (updateInstallInProgress) {
      return;
    }

    const manifestUrl = buildLatestManifestUrl(UPDATE_BASE_URL);
    const response = await fetchWithTimeout(manifestUrl);
    if (!response.ok) {
      return;
    }

    const validation = parseUpdateManifest(await response.json());
    if (!validation.ok || !validation.manifest) {
      return;
    }

    const currentVersion = app.getVersion();
    if (!isNewerVersion(validation.manifest.version, currentVersion)) {
      return;
    }

    updateInstallInProgress = true;
    sendUpdateStatus(win, {
      phase: 'available',
      version: validation.manifest.version,
      percent: 0,
      message: `새 버전 ${validation.manifest.version} 업데이트를 준비합니다.`
    });
    await downloadAndInstallUpdate(win, validation.manifest);
  } catch {
    // Update checks should never interrupt normal app startup.
  }
}

async function downloadAndInstallUpdate(win: BrowserWindow, manifest: UpdateManifest) {
  try {
    if (!isAllowedDownloadUrl(manifest.download_url)) {
      throw new Error('허용되지 않은 업데이트 다운로드 주소입니다.');
    }

    sendUpdateStatus(win, {
      phase: 'downloading',
      version: manifest.version,
      percent: 0,
      downloadedBytes: 0,
      totalBytes: manifest.size_bytes,
      message: '업데이트 다운로드'
    });
    const response = await fetchWithTimeout(manifest.download_url, updateRequestTimeoutMs * 4);
    if (!response.ok) {
      throw new Error(`업데이트 파일을 다운로드할 수 없습니다. (${response.status})`);
    }

    const buffer = await readUpdateResponseBuffer(response, manifest, win);
    if (buffer.byteLength !== manifest.size_bytes) {
      throw new Error('다운로드한 파일 크기가 업데이트 정보와 일치하지 않습니다.');
    }

    sendUpdateStatus(win, {
      phase: 'verifying',
      version: manifest.version,
      percent: 100,
      downloadedBytes: buffer.byteLength,
      totalBytes: manifest.size_bytes,
      message: '파일 검증'
    });
    const actualSha256 = createHash('sha256').update(buffer).digest('hex').toLowerCase();
    if (actualSha256 !== manifest.sha256.toLowerCase()) {
      throw new Error('업데이트 파일 검증에 실패했습니다.');
    }

    const updateDir = path.join(app.getPath('temp'), 'epyeonhan-board-updates');
    await fs.mkdir(updateDir, { recursive: true });
    const installerPath = path.join(updateDir, sanitizeFileName(manifest.file_name) || 'epyeonhan-board-setup.exe');
    await fs.writeFile(installerPath, buffer);

    sendUpdateStatus(win, {
      phase: 'installing',
      version: manifest.version,
      percent: 100,
      downloadedBytes: buffer.byteLength,
      totalBytes: manifest.size_bytes,
      message: '업데이트 설치 준비'
    });

    const installerProcess = spawn(installerPath, buildSilentUpdateInstallArgs(), {
      detached: true,
      stdio: 'ignore',
      windowsHide: true
    });
    installerProcess.on('error', () => undefined);
    installerProcess.unref();

    sendUpdateStatus(win, {
      phase: 'restarting',
      version: manifest.version,
      percent: 100,
      downloadedBytes: buffer.byteLength,
      totalBytes: manifest.size_bytes,
      message: '앱 재시작 준비'
    });

    setTimeout(() => app.quit(), 1400);
  } catch (error) {
    sendUpdateStatus(win, {
      phase: 'failed',
      version: manifest.version,
      message: '업데이트 설치를 완료하지 못했습니다.',
      error: toErrorMessage(error)
    });
    await dialog.showMessageBox(win, {
      type: 'error',
      title: '업데이트 설치 실패',
      message: '업데이트 설치를 완료하지 못했습니다.',
      detail: toErrorMessage(error),
      buttons: ['확인'],
      noLink: true
    });
    updateInstallInProgress = false;
  }
}

function buildSilentUpdateInstallArgs() {
  const installDir = getCurrentInstallDirectory();
  const installModeArg = isPerMachineInstallDirectory(installDir) ? '/allusers' : '/currentuser';

  // NSIS requires /D=... to be the last argument and unquoted.
  return ['/S', installModeArg, '/force-run', '/updated', `/D=${installDir}`];
}

function getCurrentInstallDirectory() {
  return path.dirname(app.getPath('exe'));
}

function isPerMachineInstallDirectory(installDir: string) {
  const normalizedInstallDir = normalizeWindowsPath(installDir);
  return getProgramFilesRoots().some(
    (root) => normalizedInstallDir === root || normalizedInstallDir.startsWith(`${root}\\`)
  );
}

function getProgramFilesRoots() {
  const roots = [process.env.ProgramFiles, process.env['ProgramFiles(x86)'], process.env.ProgramW6432]
    .filter((value): value is string => Boolean(value))
    .map((value) => normalizeWindowsPath(value))
    .filter(Boolean);

  return Array.from(new Set(roots));
}

function normalizeWindowsPath(value: string) {
  return path
    .resolve(value)
    .replace(/\//g, '\\')
    .replace(/\\+$/, '')
    .toLowerCase();
}

async function readUpdateResponseBuffer(response: Response, manifest: UpdateManifest, win: BrowserWindow) {
  if (!response.body) {
    const buffer = Buffer.from(await response.arrayBuffer());
    sendUpdateStatus(win, {
      phase: 'downloading',
      version: manifest.version,
      percent: 100,
      downloadedBytes: buffer.byteLength,
      totalBytes: manifest.size_bytes,
      message: '업데이트 파일 다운로드 중'
    });
    return buffer;
  }

  const reader = response.body.getReader();
  const chunks: Buffer[] = [];
  let downloadedBytes = 0;

  while (true) {
    const { done, value } = await reader.read();
    if (done) {
      break;
    }
    if (!value) {
      continue;
    }

    const chunk = Buffer.from(value);
    chunks.push(chunk);
    downloadedBytes += chunk.byteLength;
    const percent = manifest.size_bytes > 0
      ? Math.min(100, Math.round((downloadedBytes / manifest.size_bytes) * 100))
      : 0;
    sendUpdateStatus(win, {
      phase: 'downloading',
      version: manifest.version,
      percent,
      downloadedBytes,
      totalBytes: manifest.size_bytes,
      message: '업데이트 파일 다운로드 중'
    });
  }

  return Buffer.concat(chunks);
}

function sendUpdateStatus(win: BrowserWindow, status: UpdateStatusPayload) {
  if (win.isDestroyed()) {
    return;
  }
  win.webContents.send('update:status', status);
}

async function fetchWithTimeout(url: string, timeoutMs = updateRequestTimeoutMs) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(url, {
      method: 'GET',
      cache: 'no-store',
      signal: controller.signal
    });
  } finally {
    clearTimeout(timeout);
  }
}

function registerIpcHandlers() {
  ipcMain.handle('photos:select', selectPhotos);
  ipcMain.handle('photos:select-folder', selectPhotoFolder);
  ipcMain.handle('photos:resolve-dropped', (_event, paths: string[]) => resolveDroppedPhotos(paths));
  ipcMain.handle('clipboard:paste-image', pasteClipboardImage);
  ipcMain.handle('folder:select-save', selectSaveFolder);
  ipcMain.handle('folder:open', (_event, folderPath: string) => openFolder(folderPath));
  ipcMain.handle('image:data-url', (_event, photoPath: string) => getImageDataUrl(photoPath));
  ipcMain.handle('photos:read-date-times', (_event, photoPaths: string[]) => readPhotoDateTimes(photoPaths));
  ipcMain.handle('sheet:import-date-times', importDateTimeSheet);
  ipcMain.handle('images:process', (_event, payload: ProcessImagesPayload) => processImages(payload));
  ipcMain.handle('images:copy-preview', (_event, payload: CopyPreviewImagePayload) => copyPreviewImage(payload));
  ipcMain.handle('images:print-preview', (_event, payload: PrintPreviewImagePayload) => printPreviewImage(payload));
  ipcMain.handle('window:resize', (event, size: { width: number; height: number }) => resizeWindow(event.sender, size));
  ipcMain.handle('auth:get-device-fingerprint', getDeviceIdentity);
  ipcMain.handle('auth:get-app-version', () => app.getVersion());
  ipcMain.handle('auth:open-oauth-url', (_event, url: string) => openOAuthUrl(url));
  ipcMain.handle('auth:get-remembered-login', getRememberedLogin);
  ipcMain.handle('auth:save-remembered-login', (_event, payload: RememberedLoginPayload) => saveRememberedLogin(payload));
  ipcMain.handle('auth:clear-remembered-login', clearRememberedLogin);
}

function registerOAuthProtocol() {
  if (process.defaultApp && process.argv.length >= 2) {
    app.setAsDefaultProtocolClient(oauthProtocol, process.execPath, [path.resolve(process.argv[1])]);
    return;
  }
  app.setAsDefaultProtocolClient(oauthProtocol);
}

async function openOAuthUrl(url: string): Promise<{ ok: boolean; error?: string }> {
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== 'https:' || !isAllowedOAuthHost(parsed.hostname)) {
      return { ok: false, error: '허용되지 않은 로그인 주소입니다.' };
    }
    await shell.openExternal(parsed.toString());
    return { ok: true };
  } catch (error) {
    return { ok: false, error: toErrorMessage(error) };
  }
}

function isAllowedOAuthHost(hostname: string) {
  const normalized = hostname.toLowerCase();
  return normalized === 'supabase.co' || normalized.endsWith('.supabase.co');
}

async function getRememberedLogin(): Promise<RememberedLoginResult> {
  try {
    const raw = await fs.readFile(getRememberedLoginPath(), 'utf8').catch((error: NodeJS.ErrnoException) => {
      if (error.code === 'ENOENT') return '';
      throw error;
    });
    if (!raw) {
      return { ok: true, remember: false, email: '', password: '', passwordAvailable: safeStorage.isEncryptionAvailable() };
    }

    const parsed = JSON.parse(raw) as { email?: string; encryptedPassword?: string };
    if (!parsed.encryptedPassword || !safeStorage.isEncryptionAvailable()) {
      return {
        ok: true,
        remember: Boolean(parsed.email),
        email: parsed.email ?? '',
        password: '',
        passwordAvailable: false
      };
    }

    const password = safeStorage.decryptString(Buffer.from(parsed.encryptedPassword, 'base64'));
    return {
      ok: true,
      remember: true,
      email: parsed.email ?? '',
      password,
      passwordAvailable: true
    };
  } catch (error) {
    return { ok: false, remember: false, error: toErrorMessage(error), passwordAvailable: safeStorage.isEncryptionAvailable() };
  }
}

async function saveRememberedLogin(payload: RememberedLoginPayload): Promise<RememberedLoginResult> {
  try {
    if (!payload.remember) {
      return clearRememberedLogin();
    }
    if (!safeStorage.isEncryptionAvailable()) {
      return {
        ok: false,
        remember: false,
        error: '이 PC에서 비밀번호 암호화 저장소를 사용할 수 없습니다.',
        passwordAvailable: false
      };
    }

    const email = String(payload.email ?? '').trim();
    const password = String(payload.password ?? '');
    const encryptedPassword = safeStorage.encryptString(password).toString('base64');
    await fs.mkdir(path.dirname(getRememberedLoginPath()), { recursive: true });
    await fs.writeFile(
      getRememberedLoginPath(),
      JSON.stringify({ email, encryptedPassword, updatedAt: new Date().toISOString() }, null, 2),
      'utf8'
    );

    return { ok: true, remember: true, email, password, passwordAvailable: true };
  } catch (error) {
    return { ok: false, remember: false, error: toErrorMessage(error), passwordAvailable: safeStorage.isEncryptionAvailable() };
  }
}

async function clearRememberedLogin(): Promise<RememberedLoginResult> {
  try {
    await fs.rm(getRememberedLoginPath(), { force: true });
    return { ok: true, remember: false, email: '', password: '', passwordAvailable: safeStorage.isEncryptionAvailable() };
  } catch (error) {
    return { ok: false, remember: false, error: toErrorMessage(error), passwordAvailable: safeStorage.isEncryptionAvailable() };
  }
}

function getRememberedLoginPath() {
  return path.join(app.getPath('userData'), 'remembered-login.json');
}

function findOAuthCallbackUrl(argv: string[]) {
  return argv.find(isOAuthCallbackUrl);
}

function isOAuthCallbackUrl(value: string | undefined) {
  if (!value) {
    return false;
  }
  try {
    const parsed = new URL(value);
    return parsed.protocol === `${oauthProtocol}:` && parsed.hostname === 'auth' && parsed.pathname.startsWith('/callback');
  } catch {
    return false;
  }
}

function handleOAuthCallbackUrl(url: string) {
  if (!isOAuthCallbackUrl(url)) {
    return;
  }

  pendingOAuthCallbackUrl = url;
  if (mainWindow && !mainWindow.isDestroyed()) {
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.show();
    mainWindow.focus();
    setTimeout(() => flushPendingOAuthCallback(), 300);
  }
}

function flushPendingOAuthCallback() {
  if (!pendingOAuthCallbackUrl || !mainWindow || mainWindow.isDestroyed()) {
    return;
  }
  if (mainWindow.webContents.isLoading()) {
    return;
  }

  mainWindow.webContents.send('auth:oauth-callback', pendingOAuthCallbackUrl);
  pendingOAuthCallbackUrl = null;
}

function getDeviceIdentity() {
  try {
    const username = os.userInfo().username || 'unknown-user';
    const hostname = os.hostname() || 'unknown-host';
    const machineGuid = readWindowsMachineGuid();
    const stableIdentity = [
      'epyeonhan-board-device-v2',
      process.platform,
      machineGuid ? `machine:${machineGuid}` : `host:${hostname}|user:${username}`
    ].join('|');
    const fingerprint = createHash('sha256').update(stableIdentity).digest('hex');
    const knownFingerprints = uniqueValues([
      fingerprint,
      ...getLegacyDeviceFingerprints(hostname, username)
    ]);

    return {
      ok: true,
      fingerprint,
      knownFingerprints,
      deviceName: `${hostname} / ${username}`,
      appVersion: app.getVersion()
    };
  } catch (error) {
    return { ok: false, error: toErrorMessage(error) };
  }
}

function readWindowsMachineGuid() {
  if (process.platform !== 'win32') return null;

  try {
    const result = spawnSync('reg', ['query', 'HKLM\\SOFTWARE\\Microsoft\\Cryptography', '/v', 'MachineGuid'], {
      encoding: 'utf8',
      windowsHide: true
    });
    const output = `${result.stdout ?? ''}\n${result.stderr ?? ''}`;
    const match = output.match(/MachineGuid\s+REG_\w+\s+([^\r\n]+)/i);
    return match?.[1]?.trim().toLowerCase() || null;
  } catch {
    return null;
  }
}

function getLegacyDeviceFingerprints(hostname: string, username: string) {
  const appDataPath = app.getPath('appData');
  const programFiles = process.env.ProgramFiles || 'C:\\Program Files';
  const localAppData = process.env.LOCALAPPDATA || path.join(os.homedir(), 'AppData', 'Local');
  const legacyUserDataPaths = uniqueValues([
    app.getPath('userData'),
    path.join(appDataPath, 'PEDIT (페딧)'),
    path.join(appDataPath, 'PEDIT'),
    path.join(appDataPath, 'e편한보드'),
    path.join(appDataPath, 'E편한보드 VER1.0'),
    path.join(appDataPath, 'epyeonhan-board')
  ]);
  const legacyExePaths = uniqueValues([
    app.getPath('exe'),
    path.join(programFiles, 'epyeonhan-board', 'PEDIT (페딧).exe'),
    path.join(programFiles, 'epyeonhan-board', 'PEDIT.exe'),
    path.join(programFiles, 'PEDIT (페딧)', 'PEDIT (페딧).exe'),
    path.join(programFiles, 'PEDIT', 'PEDIT.exe'),
    path.join(programFiles, 'epyeonhan-board', 'e편한보드.exe'),
    path.join(programFiles, 'epyeonhan-board', 'E편한보드 VER1.0.exe'),
    path.join(programFiles, 'e편한보드', 'e편한보드.exe'),
    path.join(localAppData, 'Programs', 'epyeonhan-board', 'e편한보드.exe')
  ]);

  const fingerprints: string[] = [];
  for (const userDataPath of legacyUserDataPaths) {
    for (const exePath of legacyExePaths) {
      const legacyIdentity = [hostname, username, userDataPath, exePath].join('|');
      fingerprints.push(createHash('sha256').update(legacyIdentity).digest('hex'));
    }
  }
  return uniqueValues(fingerprints);
}

function uniqueValues(values: string[]) {
  return Array.from(new Set(values.filter((value) => value && value.trim())));
}

function resizeWindow(webContents: WebContents, size: { width: number; height: number }) {
  try {
    const win = BrowserWindow.fromWebContents(webContents);
    if (!win) {
      return { ok: false, error: '창 정보를 찾을 수 없습니다.' };
    }

    const width = clamp(Math.round(size.width), 998, 998);
    const height = clamp(Math.round(size.height), 826, 826);
    const platformAdjustedHeight = process.platform === 'win32' && height === 1033 ? height + 1 : height;
    const [currentWidth, currentHeight] = win.getSize();

    if (currentWidth !== width || currentHeight !== platformAdjustedHeight) {
      win.setSize(width, platformAdjustedHeight, true);
      win.center();
    }

    return { ok: true };
  } catch (error) {
    return { ok: false, error: toErrorMessage(error) };
  }
}

function hardenWebContents(win: BrowserWindow) {
  win.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  win.webContents.session.setPermissionRequestHandler((_webContents, _permission, callback) => {
    callback(false);
  });
  win.webContents.on('will-navigate', (event, navigationUrl) => {
    if (!isAllowedAppNavigationUrl(navigationUrl)) {
      event.preventDefault();
    }
  });
}

function isAllowedAppNavigationUrl(navigationUrl: string) {
  try {
    const parsed = new URL(navigationUrl);
    const devServerUrl = process.env.VITE_DEV_SERVER_URL;
    if (devServerUrl && hasSameOrigin(parsed, new URL(devServerUrl))) {
      return true;
    }
    return parsed.protocol === 'file:';
  } catch {
    return false;
  }
}

function hasSameOrigin(left: URL, right: URL) {
  return left.protocol === right.protocol && left.hostname === right.hostname && left.port === right.port;
}

async function selectPhotos(): Promise<DialogPhotoResult> {
  const result = await dialog.showOpenDialog({
    title: '보드판을 합성할 사진 선택',
    properties: ['openFile', 'multiSelections'],
    filters: [{ name: '이미지 파일', extensions: ['jpg', 'jpeg', 'png', 'webp'] }]
  });

  if (result.canceled) {
    return { canceled: true, photos: [] };
  }

  return {
    canceled: false,
    photos: result.filePaths.filter(isSupportedImage).map(toPhotoItem)
  };
}

async function selectPhotoFolder(): Promise<DialogPhotoResult> {
  const result = await dialog.showOpenDialog({
    title: '사진 폴더 선택',
    properties: ['openDirectory']
  });

  if (result.canceled || !result.filePaths[0]) {
    return { canceled: true, photos: [] };
  }

  const folderPath = result.filePaths[0];
  const entries = await fs.readdir(folderPath, { withFileTypes: true });
  const photos = entries
    .filter((entry) => entry.isFile())
    .map((entry) => path.join(folderPath, entry.name))
    .filter(isSupportedImage)
    .sort((a, b) => path.basename(a).localeCompare(path.basename(b), 'ko'))
    .map(toPhotoItem);

  return { canceled: false, photos };
}

async function resolveDroppedPhotos(paths: string[]): Promise<DialogPhotoResult> {
  if (!Array.isArray(paths) || paths.length === 0) {
    return { canceled: true, photos: [] };
  }

  const filePaths: string[] = [];
  for (const rawPath of paths.slice(0, maxDroppedPathCount)) {
    const localPath = normalizeLocalPath(rawPath);
    if (!localPath) {
      continue;
    }

    try {
      const stat = await fs.stat(localPath);
      if (stat.isFile() && isSupportedImage(localPath) && stat.size <= maxImageInputBytes) {
        filePaths.push(localPath);
      } else if (stat.isDirectory()) {
        const entries = await fs.readdir(localPath, { withFileTypes: true });
        entries
          .filter((entry) => entry.isFile())
          .slice(0, maxFolderImageCount)
          .map((entry) => path.join(localPath, entry.name))
          .filter(isSupportedImage)
          .forEach((filePath) => filePaths.push(filePath));
      }
    } catch {
      // Dropped paths can include shell shortcuts or inaccessible files. Ignore them.
    }
  }

  const uniquePaths = Array.from(new Set(filePaths)).sort((a, b) => path.basename(a).localeCompare(path.basename(b), 'ko'));
  return {
    canceled: false,
    photos: uniquePaths.map(toPhotoItem)
  };
}

async function pasteClipboardImage(): Promise<DialogPhotoResult> {
  try {
    const image = clipboard.readImage();
    if (image.isEmpty()) {
      return { canceled: false, photos: [], error: '클립보드에 붙여넣을 이미지가 없습니다.' };
    }

    const size = image.getSize();
    if (size.width <= 0 || size.height <= 0 || size.width * size.height > maxClipboardImagePixels) {
      return { canceled: false, photos: [], error: '클립보드 이미지가 너무 큽니다. 더 작은 이미지를 복사한 뒤 다시 시도하세요.' };
    }

    const buffer = image.toPNG();
    if (buffer.byteLength > maxClipboardImageBytes) {
      return { canceled: false, photos: [], error: '클립보드 이미지 용량이 너무 큽니다. 80MB 이하 이미지만 첨부할 수 있습니다.' };
    }

    const folderPath = path.join(app.getPath('userData'), 'clipboard-images');
    await fs.mkdir(folderPath, { recursive: true });
    await pruneClipboardImageCache(folderPath);
    const timestamp = new Date()
      .toISOString()
      .replace(/[-:]/g, '')
      .replace(/\..+$/, '')
      .replace('T', '_');
    const filePath = await nextAvailablePath(folderPath, `clipboard_${timestamp}`, '.png');
    await fs.writeFile(filePath, buffer);
    return { canceled: false, photos: [toPhotoItem(filePath)] };
  } catch (error) {
    return { canceled: false, photos: [], error: toErrorMessage(error) };
  }
}

async function pruneClipboardImageCache(folderPath: string) {
  try {
    const entries = await fs.readdir(folderPath, { withFileTypes: true });
    const files = await Promise.all(
      entries
        .filter((entry) => entry.isFile() && /^clipboard_.+\.(png|jpg|jpeg)$/i.test(entry.name))
        .map(async (entry) => {
          const filePath = path.join(folderPath, entry.name);
          const stat = await fs.stat(filePath);
          return { filePath, mtimeMs: stat.mtimeMs };
        })
    );
    const staleFiles = files
      .sort((left, right) => right.mtimeMs - left.mtimeMs)
      .slice(maxClipboardCacheFiles);
    await Promise.all(staleFiles.map((file) => fs.rm(file.filePath, { force: true })));
  } catch {
    // Cache cleanup is best-effort; failing cleanup should not block paste.
  }
}

async function selectSaveFolder(): Promise<FolderResult> {
  const result = await dialog.showOpenDialog({
    title: '저장 경로 지정',
    properties: ['openDirectory', 'createDirectory']
  });

  if (result.canceled || !result.filePaths[0]) {
    return { canceled: true };
  }

  return { canceled: false, path: result.filePaths[0] };
}

async function openFolder(folderPath: string): Promise<{ ok: boolean; error?: string }> {
  try {
    const localPath = normalizeLocalPath(folderPath);
    if (!localPath) {
      return { ok: false, error: '저장 경로가 지정되지 않았습니다.' };
    }
    const stat = await fs.stat(localPath);
    if (!stat.isDirectory()) {
      return { ok: false, error: '폴더 경로만 열 수 있습니다.' };
    }
    await fs.access(localPath, fsConstants.R_OK);
    const error = await shell.openPath(localPath);
    return error ? { ok: false, error } : { ok: true };
  } catch (error) {
    return { ok: false, error: toErrorMessage(error) };
  }
}

async function getImageDataUrl(photoPath: string) {
  try {
    const localPath = await validateImageFilePath(photoPath);
    if (!localPath) {
      return { ok: false, error: '지원하지 않는 이미지 형식입니다.' };
    }

    const buffer = await sharp(localPath)
      .rotate()
      .flatten({ background: '#ffffff' })
      .jpeg({ quality: 92, mozjpeg: true })
      .toBuffer();

    return { ok: true, dataUrl: `data:image/jpeg;base64,${buffer.toString('base64')}` };
  } catch (error) {
    return { ok: false, error: toErrorMessage(error) };
  }
}

async function readPhotoDateTimes(photoPaths: string[]): Promise<ReadDateTimeResult> {
  try {
    const map: DateTimeMap = {};
    await Promise.all(
      photoPaths.slice(0, maxDroppedPathCount).map(async (photoPath) => {
        const localPath = await validateImageFilePath(photoPath);
        if (!localPath) return;
        const value = await readExifDateTime(localPath);
        if (value) {
          map[normalizeFileName(path.basename(localPath))] = value;
          map[localPath] = value;
        }
      })
    );

    return { ok: true, map };
  } catch (error) {
    return { ok: false, map: {}, error: toErrorMessage(error) };
  }
}

async function importDateTimeSheet(): Promise<ImportSheetResult> {
  const result = await dialog.showOpenDialog({
    title: '사진별 날짜/시간 파일 선택',
    properties: ['openFile'],
    filters: [{ name: 'CSV/XLSX 파일', extensions: ['csv', 'xlsx', 'xls'] }]
  });

  if (result.canceled || !result.filePaths[0]) {
    return { ok: false, canceled: true, map: {} };
  }

  const filePath = result.filePaths[0];

  try {
    const localPath = await validateSheetFilePath(filePath);
    const ext = path.extname(localPath).toLowerCase();
    const rows = ext === '.csv' ? await readCsvRows(localPath) : readWorkbookRows(localPath);
    const map = extractDateTimeMap(rows);
    return { ok: true, canceled: false, filePath, map };
  } catch (error) {
    return { ok: false, canceled: false, filePath, map: {}, error: toErrorMessage(error) };
  }
}

async function processImages(payload: ProcessImagesPayload): Promise<ProcessImagesResult> {
  try {
    const saveDir = normalizeLocalPath(payload.saveDir);
    if (!saveDir) {
      return { ok: false, savedFiles: [], error: '저장 경로를 먼저 지정하세요.' };
    }

    await fs.mkdir(saveDir, { recursive: true });

    const photos = selectPhotosForProcessing(payload);
    if (photos.length === 0) {
      return { ok: false, savedFiles: [], error: '처리할 사진이 없습니다.' };
    }

    const savedFiles: string[] = [];
    const pdfEntries: PhotoLedgerPdfEntry[] = [];
    for (let index = 0; index < photos.length; index += 1) {
      const photo = photos[index];
      const fields = await resolveFieldsForPhoto(photo, index, payload.fields, payload.timeOptions);
      const outputPath = await nextAvailablePath(saveDir, path.basename(photo.name, path.extname(photo.name)), '_board.jpg');
      await renderBoardImage(photo, outputPath, fields, payload.settings);
      savedFiles.push(outputPath);
      pdfEntries.push({ imagePath: outputPath, fields, photoLedger: photo.photoLedger });
    }

    let pdfPath: string | undefined;
    if (payload.settings.createPdf) {
      const pdfTitle = sanitizeFileName(payload.settings.pdfTitle || '사진대지');
      pdfPath = await nextAvailablePath(saveDir, pdfTitle, '.pdf');
      await createPhotoLedgerPdf(pdfEntries, pdfPath, payload.settings.pdfTitle || '사진대지', payload.settings);
    }

    if (payload.settings.openFolderAfterProcessing) {
      await shell.openPath(saveDir);
    }

    return { ok: true, savedFiles, pdfPath };
  } catch (error) {
    return { ok: false, savedFiles: [], error: toErrorMessage(error) };
  }
}

async function copyPreviewImage(payload: CopyPreviewImagePayload): Promise<CopyImageResult> {
  try {
    if (!payload.photo?.path) {
      return { ok: false, error: '복사할 사진을 먼저 선택하세요.' };
    }

    const buffer = await renderBoardCompositeBuffer(payload.photo, payload.fields, payload.settings);
    const image = nativeImage.createFromBuffer(buffer);
    if (image.isEmpty()) {
      return { ok: false, error: '미리보기 이미지를 생성하지 못했습니다.' };
    }

    clipboard.writeImage(image);
    return { ok: true };
  } catch (error) {
    return { ok: false, error: toErrorMessage(error) };
  }
}

async function printPreviewImage(payload: PrintPreviewImagePayload): Promise<PrintImageResult> {
  try {
    if (!payload.photo?.path) {
      return { ok: false, error: '인쇄할 사진을 먼저 선택하세요.' };
    }

    const buffer = await renderBoardCompositeBuffer(payload.photo, payload.fields, payload.settings);
    const metadata = await sharp(buffer).metadata();
    return await printImageBuffer(buffer, metadata.width ?? 0, metadata.height ?? 0);
  } catch (error) {
    return { ok: false, error: toErrorMessage(error) };
  }
}

async function printImageBuffer(buffer: Buffer, imageWidth: number, imageHeight: number): Promise<PrintImageResult> {
  const printWindow = new BrowserWindow({
    width: 900,
    height: 700,
    show: false,
    parent: mainWindow ?? undefined,
    title: 'PEDIT (페딧) 인쇄',
    backgroundColor: '#ffffff',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true
    }
  });
  hardenWebContents(printWindow);

  try {
    await printWindow.loadURL(buildPrintDataUrl(buffer, imageWidth, imageHeight));
    await new Promise((resolve) => setTimeout(resolve, 120));

    return await new Promise<PrintImageResult>((resolve) => {
      printWindow.webContents.print(
        {
          silent: false,
          printBackground: true,
          color: true,
          landscape: imageWidth >= imageHeight,
          pageSize: 'A4',
          margins: { marginType: 'default' }
        },
        (success, failureReason) => {
          if (success) {
            resolve({ ok: true });
            return;
          }
          const reason = failureReason || '인쇄가 취소되었습니다.';
          resolve({
            ok: false,
            canceled: /cancel/i.test(reason) || /취소/.test(reason),
            error: reason
          });
        }
      );
    });
  } finally {
    if (!printWindow.isDestroyed()) {
      printWindow.close();
    }
  }
}

function buildPrintDataUrl(buffer: Buffer, imageWidth: number, imageHeight: number) {
  const orientation = imageWidth >= imageHeight ? 'landscape' : 'portrait';
  const dataUrl = `data:image/png;base64,${buffer.toString('base64')}`;
  const html = `<!doctype html>
<html>
  <head>
    <meta charset="utf-8">
    <title>PEDIT (페딧) 인쇄</title>
    <style>
      @page { size: A4 ${orientation}; margin: 10mm; }
      html, body {
        width: 100%;
        height: 100%;
        margin: 0;
        background: #ffffff;
      }
      body {
        display: flex;
        align-items: center;
        justify-content: center;
      }
      img {
        display: block;
        max-width: 100vw;
        max-height: 100vh;
        width: auto;
        height: auto;
        object-fit: contain;
      }
    </style>
  </head>
  <body>
    <img src="${dataUrl}" alt="PEDIT (페딧) 인쇄 이미지">
  </body>
</html>`;

  return `data:text/html;charset=utf-8,${encodeURIComponent(html)}`;
}

function selectPhotosForProcessing(payload: ProcessImagesPayload): PhotoItem[] {
  if (payload.mode === 'selected') {
    return payload.photos.filter((photo) => photo.path === payload.selectedPhotoPath);
  }

  if (payload.mode === 'checked') {
    return payload.photos.filter((photo) => photo.selectedForProcessing);
  }

  return payload.photos;
}

async function renderBoardImage(photo: PhotoItem, outputPath: string, fields: BoardField[], settings: BoardSettings) {
  const compositeBuffer = await renderBoardCompositeBuffer(photo, fields, settings);
  await sharp(compositeBuffer)
    .jpeg({ quality: clamp(Math.round(settings.jpgQuality), 1, 100), mozjpeg: true })
    .toFile(outputPath);
}

async function renderBoardCompositeBuffer(photo: PhotoItem, fields: BoardField[], settings: BoardSettings) {
  const localPath = await validateImageFilePath(photo.path);
  if (!localPath) {
    throw new Error('지원하지 않는 이미지 파일입니다.');
  }

  let imagePipeline = sharp(localPath).rotate();
  const maxLongEdge = normalizeOutputMaxLongEdge(settings.outputMaxLongEdge);
  if (maxLongEdge > 0) {
    imagePipeline = imagePipeline.resize({
      width: maxLongEdge,
      height: maxLongEdge,
      fit: 'inside',
      withoutEnlargement: true
    });
  }

  const oriented = await imagePipeline.toBuffer({ resolveWithObject: true });
  const imageWidth = oriented.info.width;
  const imageHeight = oriented.info.height;
  const board = buildSharedBoardSvg(imageWidth, imageHeight, fields, settings);
  const position = calculateSharedBoardPosition(imageWidth, imageHeight, board.width, board.height, settings);
  let photoBuffer = oriented.data;

  if (settings.outputGrayscale) {
    photoBuffer = await sharp(photoBuffer).grayscale().toBuffer();
  } else if (photo.highlight?.enabled && photo.highlight.outsideGrayscale) {
    photoBuffer = await applyOutsideGrayscale(photoBuffer, imageWidth, imageHeight, photo.highlight);
  }

  if (photo.highlight?.enabled) {
    photoBuffer = await sharp(photoBuffer)
      .composite([{ input: Buffer.from(buildHighlightSvg(imageWidth, imageHeight, photo.highlight), 'utf8') }])
      .toBuffer();
  }

  return sharp(photoBuffer)
    .composite([{ input: Buffer.from(board.svg, 'utf8'), left: position.left, top: position.top }])
    .flatten({ background: '#ffffff' })
    .png()
    .toBuffer();
}

async function applyOutsideGrayscale(buffer: Buffer, width: number, height: number, highlight: PhotoHighlight) {
  const grayscaleBuffer = await sharp(buffer).grayscale().toBuffer();
  const maskedColorBuffer = await sharp(buffer)
    .ensureAlpha()
    .composite([{ input: Buffer.from(buildHighlightMaskSvg(width, height, highlight), 'utf8'), blend: 'dest-in' }])
    .png()
    .toBuffer();

  return sharp(grayscaleBuffer)
    .composite([{ input: maskedColorBuffer }])
    .toBuffer();
}

function normalizeOutputMaxLongEdge(value: number | undefined) {
  if (!Number.isFinite(value)) {
    return 0;
  }
  return Math.max(0, Math.round(Number(value)));
}

async function resolveFieldsForPhoto(
  photo: PhotoItem,
  index: number,
  fields: BoardField[],
  timeOptions: TimeOptions
): Promise<BoardField[]> {
  let dateTime: DateTimeValue | undefined;

  if (timeOptions.mode === 'exif') {
    dateTime = await readExifDateTime(photo.path);
  } else if (timeOptions.mode === 'sequence') {
    dateTime = calculateSequenceDateTime(index, timeOptions);
  } else if (timeOptions.mode === 'sheet') {
    dateTime =
      timeOptions.sheetMap?.[normalizeFileName(photo.name)] ??
      timeOptions.sheetMap?.[photo.name] ??
      timeOptions.sheetMap?.[photo.path];
  }

  if (!dateTime) {
    return fields;
  }

  return fields.map((field) => {
    if (field.label.includes('날짜')) {
      return { ...field, value: dateTime.date };
    }
    if (field.label.includes('시간')) {
      return { ...field, value: dateTime.time };
    }
    return field;
  });
}

async function readExifDateTime(photoPath: string): Promise<DateTimeValue | undefined> {
  try {
    const localPath = await validateImageFilePath(photoPath);
    if (!localPath) return undefined;
    const data = await exifr.parse(localPath, ['DateTimeOriginal', 'CreateDate', 'ModifyDate', 'DateTimeDigitized']);
    const raw = data?.DateTimeOriginal ?? data?.CreateDate ?? data?.DateTimeDigitized ?? data?.ModifyDate;
    const date = toDate(raw);
    return date ? formatDateTime(date) : undefined;
  } catch {
    return undefined;
  }
}

function calculateSequenceDateTime(index: number, timeOptions: TimeOptions): DateTimeValue | undefined {
  if (!timeOptions.sequenceStartDate || !timeOptions.sequenceStartTime) {
    return undefined;
  }

  const [year, month, day] = timeOptions.sequenceStartDate.split('-').map(Number);
  const [hour, minute] = timeOptions.sequenceStartTime.split(':').map(Number);
  if (![year, month, day, hour, minute].every((value) => Number.isFinite(value))) {
    return undefined;
  }

  const date = new Date(year, month - 1, day, hour, minute);
  date.setMinutes(date.getMinutes() + Math.max(0, timeOptions.sequenceIntervalMinutes || 0) * index);
  return formatDateTime(date);
}

function toDate(raw: unknown): Date | undefined {
  if (raw instanceof Date && !Number.isNaN(raw.getTime())) {
    return raw;
  }

  if (typeof raw === 'string') {
    const match = raw.match(/(\d{4})[:.-](\d{1,2})[:.-](\d{1,2})[ T](\d{1,2}):(\d{1,2})(?::(\d{1,2}))?/);
    if (match) {
      const [, year, month, day, hour, minute, second = '0'] = match;
      const parsed = new Date(Number(year), Number(month) - 1, Number(day), Number(hour), Number(minute), Number(second));
      return Number.isNaN(parsed.getTime()) ? undefined : parsed;
    }

    const parsed = new Date(raw);
    return Number.isNaN(parsed.getTime()) ? undefined : parsed;
  }

  return undefined;
}

function formatDateTime(date: Date): DateTimeValue {
  return {
    date: `${date.getFullYear()}.${pad2(date.getMonth() + 1)}.${pad2(date.getDate())}`,
    time: `${pad2(date.getHours())}:${pad2(date.getMinutes())}`
  };
}

async function readCsvRows(filePath: string): Promise<Record<string, unknown>[]> {
  const localPath = await validateSheetFilePath(filePath);
  const text = await fs.readFile(localPath, 'utf8');
  const parsed = Papa.parse<Record<string, unknown>>(text, {
    header: true,
    skipEmptyLines: true
  });

  if (parsed.errors.length > 0) {
    throw new Error(parsed.errors[0].message);
  }

  return sanitizeParsedRows(parsed.data);
}

function readWorkbookRows(filePath: string): Record<string, unknown>[] {
  const workbook = XLSX.readFile(filePath, { cellDates: true });
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) {
    return [];
  }
  const sheet = workbook.Sheets[sheetName];
  return sanitizeParsedRows(XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '' }));
}

function extractDateTimeMap(rows: Record<string, unknown>[]): DateTimeMap {
  const map: DateTimeMap = {};

  rows.forEach((row) => {
    const keys = Object.keys(row);
    const fileKey = keys.find((key) => {
      const normalized = key.toLowerCase();
      return /(file|filename|name|파일|사진)/.test(normalized) && !/(date|time|날짜|시간)/.test(normalized);
    });
    const dateKey = keys.find((key) => /(date|날짜|일자|촬영일)/i.test(key));
    const timeKey = keys.find((key) => /(time|시간|촬영시간)/i.test(key));

    if (!fileKey || (!dateKey && !timeKey)) {
      return;
    }

    const fileName = normalizeFileName(String(row[fileKey] ?? ''));
    if (!fileName) {
      return;
    }

    const date = formatDateCell(dateKey ? row[dateKey] : undefined);
    const time = formatTimeCell(timeKey ? row[timeKey] : undefined);
    if (date || time) {
      map[fileName] = { date, time };
    }
  });

  return map;
}

function formatDateCell(value: unknown) {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return `${value.getFullYear()}.${pad2(value.getMonth() + 1)}.${pad2(value.getDate())}`;
  }

  if (typeof value === 'number') {
    const parsed = XLSX.SSF.parse_date_code(value);
    if (parsed) {
      return `${parsed.y}.${pad2(parsed.m)}.${pad2(parsed.d)}`;
    }
  }

  const text = String(value ?? '').trim();
  const match = text.match(/(\d{4})[./-](\d{1,2})[./-](\d{1,2})/);
  if (match) {
    return `${match[1]}.${pad2(Number(match[2]))}.${pad2(Number(match[3]))}`;
  }

  return text;
}

function formatTimeCell(value: unknown) {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return `${pad2(value.getHours())}:${pad2(value.getMinutes())}`;
  }

  if (typeof value === 'number') {
    const totalMinutes = Math.round((value % 1) * 24 * 60);
    return `${pad2(Math.floor(totalMinutes / 60))}:${pad2(totalMinutes % 60)}`;
  }

  const text = String(value ?? '').trim();
  const match = text.match(/(\d{1,2}):(\d{2})/);
  if (match) {
    return `${pad2(Number(match[1]))}:${match[2]}`;
  }

  return text;
}

function sanitizeParsedRows(rows: Record<string, unknown>[]) {
  return rows.map((row) => {
    const sanitized = Object.create(null) as Record<string, unknown>;
    Object.entries(row).forEach(([key, value]) => {
      if (!isUnsafeObjectKey(key)) {
        sanitized[key] = value;
      }
    });
    return sanitized;
  });
}

function isUnsafeObjectKey(key: string) {
  return key === '__proto__' || key === 'prototype' || key === 'constructor';
}

function toPhotoItem(filePath: string): PhotoItem {
  const localPath = normalizeLocalPath(filePath) ?? filePath;
  return {
    id: Buffer.from(localPath).toString('base64url'),
    path: localPath,
    name: path.basename(localPath),
    selectedForProcessing: true
  };
}

function isSupportedImage(filePath: string) {
  return imageExtensions.has(path.extname(filePath).toLowerCase());
}

function isSupportedSheet(filePath: string) {
  return sheetExtensions.has(path.extname(filePath).toLowerCase());
}

function normalizeLocalPath(value: unknown) {
  if (typeof value !== 'string') {
    return null;
  }

  const trimmed = value.trim();
  if (!trimmed || trimmed.length > 4096 || trimmed.includes('\0')) {
    return null;
  }

  if (!path.isAbsolute(trimmed)) {
    return null;
  }

  return path.resolve(trimmed);
}

async function validateImageFilePath(filePath: unknown) {
  const localPath = normalizeLocalPath(filePath);
  if (!localPath || !isSupportedImage(localPath)) {
    return null;
  }

  const stat = await fs.stat(localPath);
  if (!stat.isFile() || stat.size > maxImageInputBytes) {
    return null;
  }

  return localPath;
}

async function validateSheetFilePath(filePath: unknown) {
  const localPath = normalizeLocalPath(filePath);
  if (!localPath || !isSupportedSheet(localPath)) {
    throw new Error('지원하지 않는 날짜/시간 파일 형식입니다.');
  }

  const stat = await fs.stat(localPath);
  if (!stat.isFile()) {
    throw new Error('날짜/시간 파일을 찾을 수 없습니다.');
  }
  if (stat.size > maxSheetInputBytes) {
    throw new Error('날짜/시간 파일은 10MB 이하만 불러올 수 있습니다.');
  }

  return localPath;
}

async function nextAvailablePath(folderPath: string, baseName: string, suffix: string) {
  const safeBaseName = sanitizeFileName(baseName) || 'result';
  let index = 0;
  while (index < 10000) {
    const candidate =
      index === 0
        ? path.join(folderPath, `${safeBaseName}${suffix}`)
        : path.join(folderPath, `${safeBaseName}_${String(index + 1).padStart(2, '0')}${suffix}`);

    try {
      await fs.access(candidate);
      index += 1;
    } catch {
      return candidate;
    }
  }
  throw new Error('저장 파일명을 생성할 수 없습니다.');
}

function sanitizeFileName(fileName: string) {
  return fileName.replace(/[<>:"/\\|?*\x00-\x1f]/g, '_').trim();
}

function normalizeFileName(fileName: string) {
  return path.basename(fileName).trim().toLowerCase();
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function pad2(value: number) {
  return String(value).padStart(2, '0');
}

function toErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}
