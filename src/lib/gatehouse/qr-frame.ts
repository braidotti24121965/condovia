import jsQR from "jsqr";

/**
 * Decodes a QR Code from the RGBA pixels of one camera frame.
 * Returns the encoded text, or null when no code is found in the frame.
 */
export function decodeQrFrame(pixels: Uint8ClampedArray, width: number, height: number): string | null {
  return jsQR(pixels, width, height)?.data ?? null;
}

/**
 * Renders a QR matrix as RGBA pixels with a quiet zone, the way a camera
 * frame of a QR shown on a screen would look. Used by tests.
 */
export function renderQrFrame(
  matrix: { size: number; getModule: (x: number, y: number) => boolean },
  scale = 4,
  border = 4
): { pixels: Uint8ClampedArray; width: number; height: number } {
  const side = (matrix.size + border * 2) * scale;
  const pixels = new Uint8ClampedArray(side * side * 4).fill(255);

  for (let y = 0; y < matrix.size; y++) {
    for (let x = 0; x < matrix.size; x++) {
      if (!matrix.getModule(x, y)) continue;
      for (let dy = 0; dy < scale; dy++) {
        for (let dx = 0; dx < scale; dx++) {
          const px = (y + border) * scale + dy;
          const py = (x + border) * scale + dx;
          const offset = (px * side + py) * 4;
          pixels[offset] = 0;
          pixels[offset + 1] = 0;
          pixels[offset + 2] = 0;
        }
      }
    }
  }

  return { pixels, width: side, height: side };
}
