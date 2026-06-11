import type { BoardField, BoardSettings, BoardTextColor } from './types';
import {
  BOARD_LABEL_WIDTH_RATIO,
  DEFAULT_LABEL_COLUMN_WIDTH_RATIO,
  DEFAULT_BOARD_WIDTH_RATIO,
  DEFAULT_VALUE_COLUMN_WIDTH_RATIO,
  MAX_LABEL_COLUMN_WIDTH_RATIO,
  MAX_VALUE_COLUMN_WIDTH_RATIO,
  MIN_LABEL_COLUMN_WIDTH_RATIO,
  MIN_VALUE_COLUMN_WIDTH_RATIO,
  boardSizeToWidthRatio,
  clampBoardWidthRatio
} from './boardConstants';

export interface BoardSvgResult {
  svg: string;
  width: number;
  height: number;
}

export interface BoardPositionResult {
  left: number;
  top: number;
}

export function buildBoardSvg(imageWidth: number, imageHeight: number, fields: BoardField[], settings: BoardSettings): BoardSvgResult {
  if (settings.boardLayoutMode === 'bottom-strip') {
    return buildBottomStripBoardSvg(imageWidth, imageHeight, fields, settings);
  }

  const columnLayout = resolveColumnLayout(settings);
  const ratio = columnLayout.totalRatio;
  const baseBoardWidth = Math.max(1, Math.round(imageWidth * DEFAULT_BOARD_WIDTH_RATIO));
  const requestedBoardWidth = Math.max(1, Math.round(imageWidth * ratio));
  const requestedBoardScale = requestedBoardWidth / baseBoardWidth;
  const labelWidth = Math.round(baseBoardWidth * columnLayout.labelShare);
  const borderBase = settings.borderWeight === 'bold' ? 2 : 1;
  const borderWidth = Math.max(1, Math.round((baseBoardWidth / 1300) * borderBase));
  const fontWeight = settings.fontWeight === 'bold' ? 700 : 400;
  const fontFamily = settings.fontFamily || '맑은 고딕';
  const backgroundOpacity = normalizeOpacity(settings.boardBackgroundOpacity);
  const labelTextColor = resolveBoardTextColor(settings.labelTextColor);
  const valueTextColor = resolveBoardTextColor(settings.valueTextColor);
  const effectiveFontSize = Math.max(8, Math.round(baseBoardWidth * (settings.fontSize / 640)));
  const layout = createBoardLayout(fields, settings, baseBoardWidth, labelWidth, effectiveFontSize);
  const availableWidth = Math.max(1, imageWidth);
  const availableHeight = Math.max(1, imageHeight);
  const boardScale = Math.min(requestedBoardScale, availableWidth / baseBoardWidth, availableHeight / layout.height);
  let boardWidth = Math.max(1, Math.floor(baseBoardWidth * boardScale));
  let actualScale = boardWidth / baseBoardWidth;
  let boardHeight = Math.max(1, Math.round(layout.height * actualScale));

  if (boardHeight > availableHeight) {
    boardHeight = Math.max(1, Math.floor(availableHeight));
    actualScale = boardHeight / layout.height;
    boardWidth = Math.max(1, Math.floor(baseBoardWidth * actualScale));
  }

  const scaledLabelWidth = Math.round(labelWidth * actualScale);
  const scaledBorderWidth = Math.max(1, Math.round(borderWidth * actualScale));
  const scaledFontSize = Math.max(6, Math.round(effectiveFontSize * actualScale));
  const parts: string[] = [];

  parts.push(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${boardWidth}" height="${boardHeight}" viewBox="0 0 ${boardWidth} ${boardHeight}" preserveAspectRatio="none" shape-rendering="crispEdges" text-rendering="geometricPrecision">`
  );

  let y = 0;
  let baseY = 0;
  layout.rows.forEach((row, index) => {
    const isLast = index === layout.rows.length - 1;
    const nextY = isLast ? boardHeight : Math.round((baseY + row.height) * actualScale);
    const rowHeight = Math.max(1, nextY - y);
    parts.push(`<rect x="0" y="${y}" width="${scaledLabelWidth}" height="${rowHeight}" fill="#ffffff" fill-opacity="${backgroundOpacity}"/>`);
    parts.push(`<rect x="${scaledLabelWidth}" y="${y}" width="${boardWidth - scaledLabelWidth}" height="${rowHeight}" fill="#ffffff" fill-opacity="${backgroundOpacity}"/>`);
    parts.push(`<line x1="0" y1="${y}" x2="${boardWidth}" y2="${y}" stroke="#1f2937" stroke-width="${scaledBorderWidth}"/>`);
    parts.push(`<line x1="${scaledLabelWidth}" y1="${y}" x2="${scaledLabelWidth}" y2="${y + rowHeight}" stroke="#1f2937" stroke-width="${scaledBorderWidth}"/>`);
    parts.push(renderTextLines(row.labelLines, 0, y, scaledLabelWidth, rowHeight, scaledFontSize, fontFamily, fontWeight, settings.itemAlign, labelTextColor));
    parts.push(
      renderTextLines(
        row.valueLines,
        scaledLabelWidth,
        y,
        boardWidth - scaledLabelWidth,
        rowHeight,
        scaledFontSize,
        fontFamily,
        fontWeight,
        settings.contentAlign,
        valueTextColor
      )
    );

    if (isLast) {
      parts.push(`<line x1="0" y1="${y + rowHeight}" x2="${boardWidth}" y2="${y + rowHeight}" stroke="#1f2937" stroke-width="${scaledBorderWidth}"/>`);
    }

    y = nextY;
    baseY += row.height;
  });

  parts.push(`<line x1="${scaledLabelWidth}" y1="0" x2="${scaledLabelWidth}" y2="${boardHeight}" stroke="#1f2937" stroke-width="${scaledBorderWidth}"/>`);
  parts.push(
    `<rect x="${scaledBorderWidth / 2}" y="${scaledBorderWidth / 2}" width="${boardWidth - scaledBorderWidth}" height="${boardHeight - scaledBorderWidth}" fill="none" stroke="#1f2937" stroke-width="${scaledBorderWidth}"/>`
  );
  parts.push('</svg>');

  return { svg: parts.join(''), width: boardWidth, height: boardHeight };
}

export function calculateBoardPosition(
  imageWidth: number,
  imageHeight: number,
  boardWidth: number,
  boardHeight: number,
  settings: BoardSettings
): BoardPositionResult {
  if (settings.boardLayoutMode === 'bottom-strip') {
    return {
      left: 0,
      top: clamp(imageHeight - boardHeight, 0, Math.max(0, imageHeight - boardHeight))
    };
  }

  const left = settings.position.endsWith('right') ? imageWidth - boardWidth : 0;
  const top = settings.position.startsWith('bottom') ? imageHeight - boardHeight : 0;

  return {
    left: clamp(left, 0, Math.max(0, imageWidth - boardWidth)),
    top: clamp(top, 0, Math.max(0, imageHeight - boardHeight))
  };
}

function buildBottomStripBoardSvg(imageWidth: number, imageHeight: number, fields: BoardField[], settings: BoardSettings): BoardSvgResult {
  const rows = fields.length > 0 ? fields : [{ id: 'empty', label: '항목', value: '' }];
  const columnLayout = resolveColumnLayout(settings);
  const boardWidth = Math.max(1, Math.round(imageWidth));
  const baseBoardWidth = Math.max(1, Math.round(imageWidth * DEFAULT_BOARD_WIDTH_RATIO));
  const borderBase = settings.borderWeight === 'bold' ? 2 : 1;
  const borderWidth = Math.max(1, Math.round((baseBoardWidth / 1300) * borderBase));
  const fontWeight = settings.fontWeight === 'bold' ? 700 : 400;
  const fontFamily = settings.fontFamily || '맑은 고딕';
  const backgroundOpacity = normalizeOpacity(settings.boardBackgroundOpacity);
  const labelTextColor = resolveBoardTextColor(settings.labelTextColor);
  const valueTextColor = resolveBoardTextColor(settings.valueTextColor);
  const baseFontSize = Math.max(8, Math.round(baseBoardWidth * (settings.fontSize / 640)));
  const padding = calculateBoardTextPadding(baseFontSize);
  const baseRowHeight = Math.max(1, Math.round(settings.rowHeight * (baseBoardWidth / 720)));
  const labelWidth = Math.max(1, Math.round(boardWidth * columnLayout.labelShare));
  const layoutRows = rows.map((field) => {
    const valueTextWidth = Math.max(4, boardWidth - labelWidth - padding * 2);
    const valueLines = wrapText(field.value || ' ', valueTextWidth, baseFontSize, false);
    return {
      labelLines: [field.label || ' '],
      valueLines,
      height: baseRowHeight
    };
  });
  const preferredBoardHeight = layoutRows.reduce((sum, row) => sum + row.height, 0);
  const heightScale = Math.min(1, Math.max(1, imageHeight) / Math.max(1, preferredBoardHeight));
  const boardHeight = Math.max(1, Math.round(preferredBoardHeight * heightScale));
  const scaledBorderWidth = Math.max(1, Math.round(borderWidth * heightScale));
  const scaledFontSize = Math.max(6, Math.round(baseFontSize * heightScale));
  const parts: string[] = [];

  parts.push(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${boardWidth}" height="${boardHeight}" viewBox="0 0 ${boardWidth} ${boardHeight}" preserveAspectRatio="none" shape-rendering="crispEdges" text-rendering="geometricPrecision">`
  );
  parts.push(`<rect x="0" y="0" width="${boardWidth}" height="${boardHeight}" fill="#ffffff" fill-opacity="${backgroundOpacity}"/>`);

  let y = 0;
  let baseY = 0;
  layoutRows.forEach((row, index) => {
    const isLast = index === layoutRows.length - 1;
    const nextY = isLast ? boardHeight : Math.round((baseY + row.height) * heightScale);
    const rowHeight = Math.max(1, nextY - y);
    parts.push(`<line x1="0" y1="${y}" x2="${boardWidth}" y2="${y}" stroke="#1f2937" stroke-width="${scaledBorderWidth}"/>`);
    parts.push(
      `<line x1="${labelWidth}" y1="${y}" x2="${labelWidth}" y2="${y + rowHeight}" stroke="#1f2937" stroke-width="${scaledBorderWidth}"/>`
    );
    parts.push(renderTextLines(row.labelLines, 0, y, labelWidth, rowHeight, scaledFontSize, fontFamily, fontWeight, settings.itemAlign, labelTextColor));
    parts.push(
      renderTextLines(
        row.valueLines,
        labelWidth,
        y,
        boardWidth - labelWidth,
        rowHeight,
        scaledFontSize,
        fontFamily,
        fontWeight,
        settings.contentAlign,
        valueTextColor
      )
    );
    if (isLast) {
      parts.push(`<line x1="0" y1="${y + rowHeight}" x2="${boardWidth}" y2="${y + rowHeight}" stroke="#1f2937" stroke-width="${scaledBorderWidth}"/>`);
    }
    y = nextY;
    baseY += row.height;
  });

  parts.push(`<line x1="${labelWidth}" y1="0" x2="${labelWidth}" y2="${boardHeight}" stroke="#1f2937" stroke-width="${scaledBorderWidth}"/>`);
  parts.push(
    `<rect x="${scaledBorderWidth / 2}" y="${scaledBorderWidth / 2}" width="${boardWidth - scaledBorderWidth}" height="${boardHeight - scaledBorderWidth}" fill="none" stroke="#1f2937" stroke-width="${scaledBorderWidth}"/>`
  );
  parts.push('</svg>');

  return { svg: parts.join(''), width: boardWidth, height: boardHeight };
}

function createBoardLayout(
  fields: BoardField[],
  settings: BoardSettings,
  boardWidth: number,
  labelWidth: number,
  fontSize: number
) {
  const rows = fields.length > 0 ? fields : [{ id: 'empty', label: '항목', value: '' }];
  const padding = calculateBoardTextPadding(fontSize);
  const baseRowHeight = Math.max(1, Math.round(settings.rowHeight * (boardWidth / 720)));

  const layoutRows = rows.map((field) => {
    const valueTextWidth = Math.max(4, boardWidth - labelWidth - padding * 2);
    const labelLines = [field.label || ' '];
    const valueLines = wrapText(field.value || ' ', valueTextWidth, fontSize, false);
    return {
      labelLines,
      valueLines,
      height: baseRowHeight
    };
  });

  return {
    rows: layoutRows,
    height: layoutRows.reduce((sum, row) => sum + row.height, 0)
  };
}

function renderTextLines(
  lines: string[],
  x: number,
  y: number,
  width: number,
  height: number,
  fontSize: number,
  fontFamily: string,
  fontWeight: number,
  align: 'left' | 'center',
  color: string
) {
  const padding = calculateBoardTextPadding(fontSize);
  const lineHeight = Math.round(fontSize * 1.38);
  const availableWidth = Math.max(1, width - padding * 2);
  const availableHeight = Math.max(1, height - padding * 2);
  const maxLineCount = Math.max(1, Math.floor((availableHeight + lineHeight * 0.2) / lineHeight));
  const sourceLines = lines.length > 0 ? lines : [' '];
  const displayLines = sourceLines.slice(0, maxLineCount).map((line) => truncateTextToFit(line, availableWidth, fontSize, false));

  if (sourceLines.length > maxLineCount) {
    const lastVisibleSourceLine = sourceLines[maxLineCount - 1] ?? '';
    displayLines[displayLines.length - 1] = truncateTextToFit(`${lastVisibleSourceLine}...`, availableWidth, fontSize, false);
  }

  const anchor = align === 'center' ? 'middle' : 'start';
  const textX = align === 'center' ? x + width / 2 : x + padding;
  const totalTextHeight = (displayLines.length - 1) * lineHeight;
  const startY = y + height / 2 - totalTextHeight / 2 + fontSize * 0.36;
  const familyStack = formatSvgFontFamily(fontFamily);
  const tspans = displayLines
    .map((line, index) => {
      const dy = index === 0 ? 0 : lineHeight;
      return `<tspan x="${textX}" dy="${dy}">${escapeXml(line)}</tspan>`;
    })
    .join('');

  return `<text x="${textX}" y="${startY}" font-family="${familyStack}" font-size="${fontSize}" font-weight="${fontWeight}" fill="${color}" text-anchor="${anchor}">${tspans}</text>`;
}

function formatSvgFontFamily(fontFamily: string) {
  const primary = String(fontFamily || '맑은 고딕').trim();
  const fallbackMap: Record<string, string[]> = {
    '맑은 고딕': ['Malgun Gothic'],
    '맑은 고딕 Semilight': ['Malgun Gothic Semilight', 'Malgun Gothic'],
    굴림: ['Gulim'],
    돋움: ['Dotum'],
    바탕: ['Batang'],
    궁서: ['Gungsuh'],
    나눔고딕: ['NanumGothic', 'Nanum Gothic'],
    나눔명조: ['NanumMyeongjo', 'Nanum Myeongjo'],
    본고딕: ['Noto Sans KR', 'Noto Sans CJK KR'],
    본명조: ['Noto Serif KR', 'Noto Serif CJK KR'],
    프리텐다드: ['Pretendard'],
    수트: ['SUIT'],
    함초롬돋움: ['HCR Dotum'],
    함초롬바탕: ['HCR Batang'],
    HY견고딕: ['HY견고딕'],
    HY헤드라인M: ['HYHeadLine-M'],
    휴먼고딕: ['Human Gothic'],
    휴먼명조: ['Human Myeongjo']
  };
  const families = [
    primary,
    ...(fallbackMap[primary] ?? []),
    '맑은 고딕',
    'Malgun Gothic',
    '굴림',
    'Gulim',
    '돋움',
    'Dotum',
    'Arial',
    'sans-serif'
  ];
  const uniqueFamilies = families.filter((family, index) => family && families.indexOf(family) === index);
  return uniqueFamilies.map((family) => (family.includes(' ') ? `'${escapeXml(family)}'` : escapeXml(family))).join(', ');
}

function normalizeOpacity(value: number | undefined) {
  const numeric = Number.isFinite(value) ? Number(value) : 100;
  return clamp(numeric, 0, 100) / 100;
}

function resolveBoardTextColor(color: BoardTextColor | undefined) {
  switch (color) {
    case 'blue':
      return '#0052b8';
    case 'red':
      return '#d00000';
    case 'green':
      return '#008060';
    case 'black':
    default:
      return '#111827';
  }
}

function resolveColumnLayout(settings: BoardSettings) {
  const fallbackTotalRatio = clampBoardWidthRatio(settings.widthRatio, boardSizeToWidthRatio(settings.boardSize));
  const hasConfiguredColumns =
    Number.isFinite(settings.labelColumnWidthRatio) && Number.isFinite(settings.valueColumnWidthRatio);
  if (!hasConfiguredColumns) {
    return {
      totalRatio: fallbackTotalRatio,
      labelShare: BOARD_LABEL_WIDTH_RATIO
    };
  }

  const configuredLabel = Number.isFinite(settings.labelColumnWidthRatio)
    ? Number(settings.labelColumnWidthRatio)
    : DEFAULT_LABEL_COLUMN_WIDTH_RATIO;
  const configuredValue = Number.isFinite(settings.valueColumnWidthRatio)
    ? Number(settings.valueColumnWidthRatio)
    : DEFAULT_VALUE_COLUMN_WIDTH_RATIO;
  const labelRatio = clamp(configuredLabel, MIN_LABEL_COLUMN_WIDTH_RATIO, MAX_LABEL_COLUMN_WIDTH_RATIO);
  const valueRatio = clamp(configuredValue, MIN_VALUE_COLUMN_WIDTH_RATIO, MAX_VALUE_COLUMN_WIDTH_RATIO);
  const configuredTotalRatio = labelRatio + valueRatio;

  if (!Number.isFinite(configuredTotalRatio) || configuredTotalRatio <= 0) {
    return {
      totalRatio: fallbackTotalRatio,
      labelShare: BOARD_LABEL_WIDTH_RATIO
    };
  }

  return {
    totalRatio: fallbackTotalRatio,
    labelShare: clamp(labelRatio / configuredTotalRatio, 0.05, 0.85)
  };
}

function calculateBoardTextPadding(fontSize: number) {
  return Math.max(4, Math.round(fontSize * 0.72));
}

function wrapText(text: string, maxWidth: number, fontSize: number, compact: boolean) {
  const normalized = String(text).replace(/\r/g, '').split('\n');
  const lines: string[] = [];

  normalized.forEach((segment) => {
    const words = segment.split(/(\s+)/).filter(Boolean);
    let current = '';

    if (words.length === 0) {
      lines.push(' ');
      return;
    }

    words.forEach((word) => {
      const candidate = current ? `${current}${word}` : word.trimStart();
      if (measureTextWidth(candidate, fontSize, compact) <= maxWidth || !current) {
        current = candidate;
        return;
      }

      lines.push(current.trimEnd());
      current = word.trimStart();

      while (measureTextWidth(current, fontSize, compact) > maxWidth && current.length > 1) {
        const next = splitLongText(current, maxWidth, fontSize, compact);
        lines.push(next.fit);
        current = next.rest;
      }
    });

    if (current) {
      lines.push(current.trimEnd());
    }
  });

  return lines.length > 0 ? lines : [' '];
}

function splitLongText(text: string, maxWidth: number, fontSize: number, compact: boolean) {
  let fit = '';
  for (const char of text) {
    if (measureTextWidth(fit + char, fontSize, compact) > maxWidth && fit.length > 0) {
      return { fit, rest: text.slice(fit.length) };
    }
    fit += char;
  }
  return { fit, rest: '' };
}

function truncateTextToFit(text: string, maxWidth: number, fontSize: number, compact: boolean) {
  if (measureTextWidth(text, fontSize, compact) <= maxWidth) {
    return text;
  }

  const ellipsis = '...';
  const ellipsisWidth = measureTextWidth(ellipsis, fontSize, compact);
  if (ellipsisWidth >= maxWidth) {
    return '';
  }

  let next = '';
  for (const char of text) {
    if (measureTextWidth(next + char, fontSize, compact) + ellipsisWidth > maxWidth) {
      break;
    }
    next += char;
  }

  return `${next}${ellipsis}`;
}

function measureTextWidth(text: string, fontSize: number, compact: boolean) {
  let width = 0;
  for (const char of text) {
    if (/[가-힣ㄱ-ㅎㅏ-ㅣ]/.test(char)) {
      width += fontSize * 0.94;
    } else if (/[A-Z0-9]/.test(char)) {
      width += fontSize * 0.62;
    } else if (/\s/.test(char)) {
      width += fontSize * 0.34;
    } else {
      width += fontSize * (compact ? 0.5 : 0.55);
    }
  }
  return width;
}

function escapeXml(value: string) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}
