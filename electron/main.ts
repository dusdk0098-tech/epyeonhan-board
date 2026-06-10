import { app, BrowserWindow, Menu, dialog, ipcMain, shell, type WebContents } from 'electron';
import * as fs from 'fs/promises';
import { constants as fsConstants } from 'fs';
import { createHash } from 'crypto';
import path from 'path';
import os from 'os';
import sharp from 'sharp';
import { PDFDocument } from 'pdf-lib';
import * as exifr from 'exifr';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import type {
  BoardField,
  BoardSettings,
  DateTimeMap,
  DateTimeValue,
  DialogPhotoResult,
  FolderResult,
  ImportSheetResult,
  PhotoHighlight,
  PhotoItem,
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
const updateCheckDelayMs = 2500;
const updateRequestTimeoutMs = 15000;
const oauthProtocol = 'epyeonhan-board';
let updateInstallInProgress = false;
let mainWindow: BrowserWindow | null = null;
let pendingOAuthCallbackUrl: string | null = null;
const gotSingleInstanceLock = app.requestSingleInstanceLock();

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
    title: 'e편한보드',
    icon: getWindowIconPath(),
    autoHideMenuBar: true,
    backgroundColor: '#f8f9ff',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  });
  mainWindow = win;
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

    const response = await fetchWithTimeout(manifest.download_url, updateRequestTimeoutMs * 4);
    if (!response.ok) {
      throw new Error(`업데이트 파일을 다운로드할 수 없습니다. (${response.status})`);
    }

    const buffer = Buffer.from(await response.arrayBuffer());
    if (buffer.byteLength !== manifest.size_bytes) {
      throw new Error('다운로드한 파일 크기가 업데이트 정보와 일치하지 않습니다.');
    }

    const actualSha256 = createHash('sha256').update(buffer).digest('hex').toLowerCase();
    if (actualSha256 !== manifest.sha256.toLowerCase()) {
      throw new Error('업데이트 파일 검증에 실패했습니다.');
    }

    const updateDir = path.join(app.getPath('temp'), 'epyeonhan-board-updates');
    await fs.mkdir(updateDir, { recursive: true });
    const installerPath = path.join(updateDir, sanitizeFileName(manifest.file_name) || 'epyeonhan-board-setup.exe');
    await fs.writeFile(installerPath, buffer);

    const openError = await shell.openPath(installerPath);
    if (openError) {
      throw new Error(openError);
    }

    setTimeout(() => app.quit(), 1000);
  } catch (error) {
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
  ipcMain.handle('folder:select-save', selectSaveFolder);
  ipcMain.handle('folder:open', (_event, folderPath: string) => openFolder(folderPath));
  ipcMain.handle('image:data-url', (_event, photoPath: string) => getImageDataUrl(photoPath));
  ipcMain.handle('photos:read-date-times', (_event, photoPaths: string[]) => readPhotoDateTimes(photoPaths));
  ipcMain.handle('sheet:import-date-times', importDateTimeSheet);
  ipcMain.handle('images:process', (_event, payload: ProcessImagesPayload) => processImages(payload));
  ipcMain.handle('window:resize', (event, size: { width: number; height: number }) => resizeWindow(event.sender, size));
  ipcMain.handle('auth:get-device-fingerprint', getDeviceIdentity);
  ipcMain.handle('auth:get-app-version', () => app.getVersion());
  ipcMain.handle('auth:open-oauth-url', (_event, url: string) => openOAuthUrl(url));
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
    if (!['https:', 'http:'].includes(parsed.protocol)) {
      return { ok: false, error: '허용되지 않은 로그인 주소입니다.' };
    }
    await shell.openExternal(parsed.toString());
    return { ok: true };
  } catch (error) {
    return { ok: false, error: toErrorMessage(error) };
  }
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
    const rawIdentity = [hostname, username, app.getPath('userData'), app.getPath('exe')].join('|');
    return {
      ok: true,
      fingerprint: createHash('sha256').update(rawIdentity).digest('hex'),
      deviceName: `${hostname} / ${username}`,
      appVersion: app.getVersion()
    };
  } catch (error) {
    return { ok: false, error: toErrorMessage(error) };
  }
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
    if (!folderPath) {
      return { ok: false, error: '저장 경로가 지정되지 않았습니다.' };
    }
    await fs.access(folderPath, fsConstants.R_OK);
    const error = await shell.openPath(folderPath);
    return error ? { ok: false, error } : { ok: true };
  } catch (error) {
    return { ok: false, error: toErrorMessage(error) };
  }
}

async function getImageDataUrl(photoPath: string) {
  try {
    if (!isSupportedImage(photoPath)) {
      return { ok: false, error: '지원하지 않는 이미지 형식입니다.' };
    }

    const buffer = await sharp(photoPath)
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
      photoPaths.map(async (photoPath) => {
        const value = await readExifDateTime(photoPath);
        if (value) {
          map[normalizeFileName(path.basename(photoPath))] = value;
          map[photoPath] = value;
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
    const ext = path.extname(filePath).toLowerCase();
    const rows = ext === '.csv' ? await readCsvRows(filePath) : readWorkbookRows(filePath);
    const map = extractDateTimeMap(rows);
    return { ok: true, canceled: false, filePath, map };
  } catch (error) {
    return { ok: false, canceled: false, filePath, map: {}, error: toErrorMessage(error) };
  }
}

async function processImages(payload: ProcessImagesPayload): Promise<ProcessImagesResult> {
  try {
    if (!payload.saveDir) {
      return { ok: false, savedFiles: [], error: '저장 경로를 먼저 지정하세요.' };
    }

    await fs.mkdir(payload.saveDir, { recursive: true });

    const photos = selectPhotosForProcessing(payload);
    if (photos.length === 0) {
      return { ok: false, savedFiles: [], error: '처리할 사진이 없습니다.' };
    }

    const savedFiles: string[] = [];
    for (let index = 0; index < photos.length; index += 1) {
      const photo = photos[index];
      const fields = await resolveFieldsForPhoto(photo, index, payload.fields, payload.timeOptions);
      const outputPath = await nextAvailablePath(payload.saveDir, path.basename(photo.name, path.extname(photo.name)), '_board.jpg');
      await renderBoardImage(photo, outputPath, fields, payload.settings);
      savedFiles.push(outputPath);
    }

    let pdfPath: string | undefined;
    if (payload.settings.createPdf) {
      const pdfTitle = sanitizeFileName(payload.settings.pdfTitle || '사진대지');
      pdfPath = await nextAvailablePath(payload.saveDir, pdfTitle, '.pdf');
      await createPdf(savedFiles, pdfPath, payload.settings.pdfTitle || '사진대지');
    }

    if (payload.settings.openFolderAfterProcessing) {
      await shell.openPath(payload.saveDir);
    }

    return { ok: true, savedFiles, pdfPath };
  } catch (error) {
    return { ok: false, savedFiles: [], error: toErrorMessage(error) };
  }
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
  let imagePipeline = sharp(photo.path).rotate();
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

  await sharp(photoBuffer)
    .composite([{ input: Buffer.from(board.svg, 'utf8'), left: position.left, top: position.top }])
    .flatten({ background: '#ffffff' })
    .jpeg({ quality: clamp(Math.round(settings.jpgQuality), 1, 100), mozjpeg: true })
    .toFile(outputPath);
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

async function createPdf(imagePaths: string[], outputPath: string, title: string) {
  const pdfDoc = await PDFDocument.create();
  pdfDoc.setTitle(title);

  for (const imagePath of imagePaths) {
    const bytes = await fs.readFile(imagePath);
    const jpg = await pdfDoc.embedJpg(bytes);
    const page = pdfDoc.addPage([jpg.width, jpg.height]);
    page.drawImage(jpg, { x: 0, y: 0, width: jpg.width, height: jpg.height });
  }

  const pdfBytes = await pdfDoc.save();
  await fs.writeFile(outputPath, pdfBytes);
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
    const data = await exifr.parse(photoPath, ['DateTimeOriginal', 'CreateDate', 'ModifyDate', 'DateTimeDigitized']);
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
  const text = await fs.readFile(filePath, 'utf8');
  const parsed = Papa.parse<Record<string, unknown>>(text, {
    header: true,
    skipEmptyLines: true
  });

  if (parsed.errors.length > 0) {
    throw new Error(parsed.errors[0].message);
  }

  return parsed.data;
}

function readWorkbookRows(filePath: string): Record<string, unknown>[] {
  const workbook = XLSX.readFile(filePath, { cellDates: true });
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) {
    return [];
  }
  const sheet = workbook.Sheets[sheetName];
  return XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '' });
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

function toPhotoItem(filePath: string): PhotoItem {
  return {
    id: Buffer.from(filePath).toString('base64url'),
    path: filePath,
    name: path.basename(filePath),
    selectedForProcessing: true
  };
}

function isSupportedImage(filePath: string) {
  return imageExtensions.has(path.extname(filePath).toLowerCase());
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
