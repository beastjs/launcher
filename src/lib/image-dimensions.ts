// Fit inside both limits, keeping the aspect ratio and never enlarging an image.
export function constrainDimensions(width: number, height: number, maxWidth?: number, maxHeight?: number) {
  const scale = Math.min(1, (maxWidth ?? width) / width, (maxHeight ?? height) / height)
  return { width: Math.max(1, Math.round(width * scale)), height: Math.max(1, Math.round(height * scale)) }
}
