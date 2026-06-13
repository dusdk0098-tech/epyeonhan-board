export type BoardPosition = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
export type HorizontalAlign = 'left' | 'center';
export type FontWeight = 'normal' | 'bold';
export type BorderWeight = 'normal' | 'bold';
export type TimeMode = 'manual' | 'exif' | 'sequence' | 'sheet';
export type BoardTextColor = 'black' | 'blue' | 'red' | 'green';
export type BoardLineColor = BoardTextColor;
export type HighlightColor = BoardTextColor | 'yellow';
export type BoardLayoutMode = 'table' | 'bottom-strip';
export type PhotoRotation = 0 | 90 | 180 | 270;

export interface PhotoHighlight {
  enabled: boolean;
  xRatio: number;
  yRatio: number;
  radiusRatio: number;
  outsideGrayscale: boolean;
  color: HighlightColor;
}

export interface PhotoLedgerInfo {
  location: string;
  content: string;
  date: string;
}

export interface PhotoItem {
  id: string;
  path: string;
  name: string;
  selectedForProcessing: boolean;
  rotation?: PhotoRotation;
  highlight?: PhotoHighlight;
  photoLedger?: PhotoLedgerInfo;
}

export interface BoardField {
  id: string;
  label: string;
  value: string;
}

export interface BoardSettings {
  showBoard: boolean;
  boardLayoutMode: BoardLayoutMode;
  bottomStripShowLabels: boolean;
  position: BoardPosition;
  widthRatio: number;
  margin: number;
  boardSize: number;
  labelColumnWidthRatio: number;
  valueColumnWidthRatio: number;
  fontFamily: string;
  fontSize: number;
  itemAlign: HorizontalAlign;
  contentAlign: HorizontalAlign;
  fontWeight: FontWeight;
  rowHeight: number;
  borderWeight: BorderWeight;
  borderColor: BoardLineColor;
  jpgQuality: number;
  boardBackgroundOpacity: number;
  labelTextColor: BoardTextColor;
  valueTextColor: BoardTextColor;
  outputMaxLongEdge: number;
  outputGrayscale: boolean;
  openFolderAfterProcessing: boolean;
  createPdf: boolean;
  pdfTitle: string;
  photoLedgerUseBoardFields: boolean;
  photoLedgerUsePhotoDate: boolean;
  photoLedgerLocation: string;
  photoLedgerContent: string;
  photoLedgerDate: string;
}

export interface DateTimeValue {
  date: string;
  time: string;
}

export type DateTimeMap = Record<string, DateTimeValue>;

export interface TimeOptions {
  mode: TimeMode;
  sequenceStartDate: string;
  sequenceStartTime: string;
  sequenceIntervalMinutes: number;
  sheetPath?: string;
  sheetMap?: DateTimeMap;
}

export interface ProcessImagesPayload {
  photos: PhotoItem[];
  selectedPhotoPath?: string;
  mode: 'selected' | 'all' | 'checked';
  saveDir: string;
  fields: BoardField[];
  settings: BoardSettings;
  timeOptions: TimeOptions;
}

export interface ProcessImagesResult {
  ok: boolean;
  savedFiles: string[];
  pdfPath?: string;
  error?: string;
}

export interface CopyPreviewImagePayload {
  photo: PhotoItem;
  fields: BoardField[];
  settings: BoardSettings;
}

export interface CopyImageResult {
  ok: boolean;
  error?: string;
}

export type PrintPreviewImagePayload = CopyPreviewImagePayload;
export type RenderPreviewImagePayload = CopyPreviewImagePayload;

export interface PrintImageResult {
  ok: boolean;
  canceled?: boolean;
  error?: string;
}

export interface DialogPhotoResult {
  canceled: boolean;
  photos: PhotoItem[];
  error?: string;
}

export interface FolderResult {
  canceled: boolean;
  path?: string;
}

export interface ImageDataResult {
  ok: boolean;
  dataUrl?: string;
  error?: string;
}

export type ImageDataSource = string | Pick<PhotoItem, 'path' | 'rotation'>;

export type RenderPreviewImageResult = ImageDataResult;

export interface ReadDateTimeResult {
  ok: boolean;
  map: DateTimeMap;
  error?: string;
}

export interface ImportSheetResult {
  ok: boolean;
  canceled: boolean;
  filePath?: string;
  map: DateTimeMap;
  error?: string;
}
