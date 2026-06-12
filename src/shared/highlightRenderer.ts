import type { HighlightColor, PhotoHighlight } from './types';

export interface HighlightCircle {
  x: number;
  y: number;
  radius: number;
}

export function resolveHighlightCircle(width: number, height: number, highlight: PhotoHighlight): HighlightCircle {
  const radiusBase = Math.min(width, height);
  return {
    x: clamp(Math.round(highlight.xRatio * width), 0, width),
    y: clamp(Math.round(highlight.yRatio * height), 0, height),
    radius: clamp(Math.round(highlight.radiusRatio * radiusBase), 1, Math.max(width, height))
  };
}

export function buildHighlightSvg(width: number, height: number, highlight: PhotoHighlight) {
  const circle = resolveHighlightCircle(width, height, highlight);
  const strokeWidth = Math.max(4, Math.round(Math.min(width, height) * 0.008));
  const dash = Math.max(10, strokeWidth * 3);
  const gap = Math.max(7, strokeWidth * 2);
  const strokeColor = resolveHighlightStrokeColor(highlight.color);

  return [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">`,
    `<circle cx="${circle.x}" cy="${circle.y}" r="${circle.radius}" fill="none" stroke="${strokeColor}" stroke-width="${strokeWidth}" stroke-dasharray="${dash} ${gap}" stroke-linecap="round"/>`,
    '</svg>'
  ].join('');
}

export function buildHighlightMaskSvg(width: number, height: number, highlight: PhotoHighlight) {
  const circle = resolveHighlightCircle(width, height, highlight);
  return [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">`,
    `<circle cx="${circle.x}" cy="${circle.y}" r="${circle.radius}" fill="#ffffff"/>`,
    '</svg>'
  ].join('');
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

export function resolveHighlightStrokeColor(color: HighlightColor | undefined) {
  switch (color) {
    case 'blue':
      return '#0052b8';
    case 'green':
      return '#008060';
    case 'yellow':
      return '#facc15';
    case 'black':
      return '#111827';
    case 'red':
    default:
      return '#ff0000';
  }
}
