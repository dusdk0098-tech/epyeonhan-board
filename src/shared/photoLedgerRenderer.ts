import type { BoardField, BoardSettings, PhotoLedgerInfo } from './types';

export interface PhotoLedgerRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface PhotoLedgerResolvedInfo {
  location: string;
  content: string;
  date: string;
}

export interface PhotoLedgerRenderEntry {
  fields: BoardField[];
  photoLedger?: PhotoLedgerInfo;
}

export const PHOTO_LEDGER_PAGE = {
  a4WidthPt: 595.28,
  a4HeightPt: 841.89,
  renderScale: 2,
  width: Math.round(595.28 * 2),
  height: Math.round(841.89 * 2),
  title: '사  진  대  지'
};

export const PHOTO_LEDGER_LAYOUT = {
  outer: { x: 62, y: 128, width: 1066, height: 1466 },
  title: { x: 0, y: 48, width: PHOTO_LEDGER_PAGE.width, height: 80 },
  photoFrames: [
    { x: 142, y: 164, width: 906, height: 542 },
    { x: 142, y: 913, width: 906, height: 542 }
  ],
  infoTables: [
    { x: 62, y: 740, width: 1066, height: 105 },
    { x: 62, y: 1489, width: 1066, height: 105 }
  ]
} satisfies {
  outer: PhotoLedgerRect;
  title: PhotoLedgerRect;
  photoFrames: PhotoLedgerRect[];
  infoTables: PhotoLedgerRect[];
};

export function buildPhotoLedgerPageShellSvg(entries: PhotoLedgerRenderEntry[], settings: BoardSettings) {
  const slotSvg = [0, 1]
    .map((slotIndex) => {
      const entry = entries[slotIndex];
      const info = entry ? resolvePhotoLedgerInfo(entry.fields, settings, entry.photoLedger) : { location: '', content: '', date: '' };
      return `
        ${drawPhotoFrame(PHOTO_LEDGER_LAYOUT.photoFrames[slotIndex])}
        ${drawInfoTable(PHOTO_LEDGER_LAYOUT.infoTables[slotIndex], info)}
      `;
    })
    .join('');

  return `
    <svg xmlns="http://www.w3.org/2000/svg" width="${PHOTO_LEDGER_PAGE.width}" height="${PHOTO_LEDGER_PAGE.height}" viewBox="0 0 ${PHOTO_LEDGER_PAGE.width} ${PHOTO_LEDGER_PAGE.height}">
      <rect width="100%" height="100%" fill="#ffffff"/>
      <text x="${PHOTO_LEDGER_LAYOUT.title.x + PHOTO_LEDGER_LAYOUT.title.width / 2}" y="${PHOTO_LEDGER_LAYOUT.title.y + 54}"
        text-anchor="middle" font-family="Gulim, Malgun Gothic, sans-serif" font-size="50" font-weight="700"
        fill="#111111">${escapeXml(PHOTO_LEDGER_PAGE.title)}</text>
      <rect x="${PHOTO_LEDGER_LAYOUT.outer.x}" y="${PHOTO_LEDGER_LAYOUT.outer.y}" width="${PHOTO_LEDGER_LAYOUT.outer.width}" height="${PHOTO_LEDGER_LAYOUT.outer.height}"
        fill="none" stroke="#111111" stroke-width="3"/>
      ${slotSvg}
    </svg>
  `;
}

export function resolvePhotoLedgerInfo(
  fields: BoardField[],
  settings: BoardSettings,
  photoLedger?: PhotoLedgerInfo
): PhotoLedgerResolvedInfo {
  const photoDate = settings.photoLedgerUsePhotoDate ? photoLedger?.date ?? '' : '';

  if (!settings.photoLedgerUseBoardFields) {
    return {
      location: photoLedger?.location ?? settings.photoLedgerLocation ?? '',
      content: photoLedger?.content ?? settings.photoLedgerContent ?? '',
      date: photoDate || photoLedger?.date || settings.photoLedgerDate || ''
    };
  }

  return {
    location: findFieldValue(fields, /위치/),
    content: findFieldValue(fields, /내용/),
    date: photoDate || findFieldValue(fields, /날짜|일자/)
  };
}

function drawPhotoFrame(frame: PhotoLedgerRect) {
  return `
    <rect x="${frame.x}" y="${frame.y}" width="${frame.width}" height="${frame.height}"
      fill="#ffffff" stroke="#111111" stroke-width="2"/>
  `;
}

function drawInfoTable(table: PhotoLedgerRect, info: PhotoLedgerResolvedInfo) {
  const rowHeight = table.height / 2;
  const labelWidth = 150;
  const dateLabelWidth = 154;
  const dateValueWidth = 170;
  const dateLabelX = table.x + table.width - dateLabelWidth - dateValueWidth;
  const dateValueX = table.x + table.width - dateValueWidth;
  const contentWidth = dateLabelX - (table.x + labelWidth);

  return `
    <rect x="${table.x}" y="${table.y}" width="${table.width}" height="${table.height}" fill="#ffffff" stroke="#111111" stroke-width="3"/>
    <line x1="${table.x}" y1="${table.y + rowHeight}" x2="${table.x + table.width}" y2="${table.y + rowHeight}" stroke="#111111" stroke-width="2"/>
    <line x1="${table.x + labelWidth}" y1="${table.y}" x2="${table.x + labelWidth}" y2="${table.y + table.height}" stroke="#111111" stroke-width="2"/>
    <line x1="${dateLabelX}" y1="${table.y + rowHeight}" x2="${dateLabelX}" y2="${table.y + table.height}" stroke="#111111" stroke-width="2"/>
    <line x1="${dateValueX}" y1="${table.y + rowHeight}" x2="${dateValueX}" y2="${table.y + table.height}" stroke="#111111" stroke-width="2"/>
    ${drawCenteredText('위  치', table.x, table.y, labelWidth, rowHeight, 24, 700)}
    ${drawLeftText(info.location, table.x + labelWidth + 14, table.y, table.width - labelWidth - 24, rowHeight, 24)}
    ${drawCenteredText('사진내용', table.x, table.y + rowHeight, labelWidth, rowHeight, 24, 700)}
    ${drawLeftText(info.content, table.x + labelWidth + 14, table.y + rowHeight, contentWidth - 24, rowHeight, 24)}
    ${drawCenteredText('촬영일자', dateLabelX, table.y + rowHeight, dateLabelWidth, rowHeight, 24, 700)}
    ${drawCenteredText(info.date, dateValueX, table.y + rowHeight, dateValueWidth, rowHeight, 23, 500)}
  `;
}

function drawCenteredText(text: string, x: number, y: number, width: number, height: number, fontSize: number, weight: number) {
  const nextFontSize = fitFontSize(text, width - 12, fontSize, 15, true);
  return `
    <text x="${x + width / 2}" y="${y + height / 2 + nextFontSize * 0.36}" text-anchor="middle"
      font-family="Gulim, Malgun Gothic, sans-serif" font-size="${nextFontSize}" font-weight="${weight}"
      fill="#111111">${escapeXml(text)}</text>
  `;
}

function drawLeftText(text: string, x: number, y: number, width: number, height: number, fontSize: number) {
  const nextFontSize = fitFontSize(text, width, fontSize, 14, false);
  return `
    <text x="${x}" y="${y + height / 2 + nextFontSize * 0.36}" text-anchor="start"
      font-family="Gulim, Malgun Gothic, sans-serif" font-size="${nextFontSize}" font-weight="500"
      fill="#111111">${escapeXml(text)}</text>
  `;
}

function fitFontSize(text: string, width: number, baseSize: number, minSize: number, compact: boolean) {
  const estimated = estimateTextWidth(text, baseSize, compact);
  if (estimated <= width) return baseSize;
  return Math.max(minSize, Math.floor((baseSize * width) / Math.max(1, estimated)));
}

function estimateTextWidth(text: string, fontSize: number, compact: boolean) {
  let units = 0;
  for (const char of text) {
    if (/\s/.test(char)) {
      units += compact ? 0.25 : 0.35;
    } else if (/[\u3131-\uD79D]/.test(char)) {
      units += 0.95;
    } else {
      units += 0.58;
    }
  }
  return units * fontSize;
}

function findFieldValue(fields: BoardField[], pattern: RegExp) {
  return fields.find((field) => pattern.test(field.label))?.value ?? '';
}

function escapeXml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}
