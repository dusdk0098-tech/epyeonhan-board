import * as fs from 'fs/promises';
import { PDFDocument } from 'pdf-lib';
import sharp from 'sharp';
import type { BoardField, BoardSettings, PhotoLedgerInfo } from '../src/shared/types';
import {
  buildPhotoLedgerPageShellSvg,
  PHOTO_LEDGER_LAYOUT,
  PHOTO_LEDGER_PAGE,
  resolvePhotoLedgerInfo
} from '../src/shared/photoLedgerRenderer';

export interface PhotoLedgerPdfEntry {
  imagePath?: string;
  imageBuffer?: Buffer;
  fields: BoardField[];
  photoLedger?: PhotoLedgerInfo;
}

interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export { resolvePhotoLedgerInfo };

export async function createPhotoLedgerPdf(
  entries: PhotoLedgerPdfEntry[],
  outputPath: string,
  title: string,
  settings: BoardSettings
) {
  const pdfDoc = await PDFDocument.create();
  pdfDoc.setTitle(title);

  for (let pageIndex = 0; pageIndex < Math.max(1, Math.ceil(entries.length / 2)); pageIndex += 1) {
    const pageEntries = entries.slice(pageIndex * 2, pageIndex * 2 + 2);
    const pagePng = await renderPhotoLedgerPage(pageEntries, settings);
    const embeddedPage = await pdfDoc.embedPng(pagePng);
    const page = pdfDoc.addPage([PHOTO_LEDGER_PAGE.a4WidthPt, PHOTO_LEDGER_PAGE.a4HeightPt]);
    page.drawImage(embeddedPage, { x: 0, y: 0, width: PHOTO_LEDGER_PAGE.a4WidthPt, height: PHOTO_LEDGER_PAGE.a4HeightPt });
  }

  const pdfBytes = await pdfDoc.save();
  await fs.writeFile(outputPath, pdfBytes);
}

async function renderPhotoLedgerPage(entries: PhotoLedgerPdfEntry[], settings: BoardSettings) {
  const baseSvg = buildPhotoLedgerPageShellSvg(entries, settings);
  const composites = [];

  for (let index = 0; index < entries.length; index += 1) {
    const frame = PHOTO_LEDGER_LAYOUT.photoFrames[index];
    if (!frame) continue;

    const imageInput = entries[index].imageBuffer ?? entries[index].imagePath;
    if (!imageInput) continue;

    const photo = await renderPhotoForFrame(imageInput, frame);
    composites.push({ input: photo.buffer, left: photo.left, top: photo.top });
  }

  return sharp(Buffer.from(baseSvg, 'utf8'))
    .composite(composites)
    .png()
    .toBuffer();
}

async function renderPhotoForFrame(imageInput: string | Buffer, frame: Rect) {
  const inset = 8;
  const rendered = await sharp(imageInput)
    .rotate()
    .resize({
      width: frame.width - inset * 2,
      height: frame.height - inset * 2,
      fit: 'inside',
      withoutEnlargement: false
    })
    .flatten({ background: '#ffffff' })
    .png()
    .toBuffer({ resolveWithObject: true });

  return {
    buffer: rendered.data,
    left: Math.round(frame.x + (frame.width - rendered.info.width) / 2),
    top: Math.round(frame.y + (frame.height - rendered.info.height) / 2)
  };
}
