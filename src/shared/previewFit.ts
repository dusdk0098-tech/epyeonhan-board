export interface PreviewFitSize {
  width: number;
  height: number;
}

export function calculateContainedSize(
  source: PreviewFitSize | null | undefined,
  container: PreviewFitSize | null | undefined
): PreviewFitSize | null {
  if (!source || !container) return null;
  if (source.width <= 0 || source.height <= 0 || container.width <= 0 || container.height <= 0) return null;

  const scale = Math.min(container.width / source.width, container.height / source.height);
  if (!Number.isFinite(scale) || scale <= 0) return null;

  return {
    width: Math.max(1, Math.floor(source.width * scale)),
    height: Math.max(1, Math.floor(source.height * scale))
  };
}
