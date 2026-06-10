export const MIN_BOARD_WIDTH_RATIO = 0.12;
export const MAX_BOARD_WIDTH_RATIO = 0.85;
export const DEFAULT_BOARD_WIDTH_RATIO = 0.675;
export const BOARD_SIZE_RATIO_DIVISOR = 200;
export const BOARD_LABEL_WIDTH_RATIO = 0.26;
export const DEFAULT_LABEL_COLUMN_WIDTH_RATIO = Number((DEFAULT_BOARD_WIDTH_RATIO * BOARD_LABEL_WIDTH_RATIO).toFixed(3));
export const DEFAULT_VALUE_COLUMN_WIDTH_RATIO = Number((DEFAULT_BOARD_WIDTH_RATIO - DEFAULT_LABEL_COLUMN_WIDTH_RATIO).toFixed(3));
export const MIN_LABEL_COLUMN_WIDTH_RATIO = 0.08;
export const MAX_LABEL_COLUMN_WIDTH_RATIO = 0.35;
export const MIN_VALUE_COLUMN_WIDTH_RATIO = 0.12;
export const MAX_VALUE_COLUMN_WIDTH_RATIO = 0.77;

export function clampBoardWidthRatio(value: number | undefined, fallback = DEFAULT_BOARD_WIDTH_RATIO) {
  const next = Number.isFinite(value) ? Number(value) : fallback;
  return Math.min(MAX_BOARD_WIDTH_RATIO, Math.max(MIN_BOARD_WIDTH_RATIO, next));
}

export function boardSizeToWidthRatio(boardSize: number | undefined) {
  const size = Number.isFinite(boardSize) ? Number(boardSize) : DEFAULT_BOARD_WIDTH_RATIO * BOARD_SIZE_RATIO_DIVISOR;
  return Number(clampBoardWidthRatio(size / BOARD_SIZE_RATIO_DIVISOR).toFixed(3));
}

export function widthRatioToBoardSize(widthRatio: number | undefined) {
  return Math.round(clampBoardWidthRatio(widthRatio) * BOARD_SIZE_RATIO_DIVISOR);
}
