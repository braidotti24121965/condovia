import { Ecc, QrCode } from "./qrcode";

/**
 * Renders a QR Code as a PNG file in the browser, so it can be attached to a
 * message. Uses the project's QR encoder, the same one shown on screen.
 */
export async function qrPngBlob(text: string, size = 480): Promise<Blob> {
  const svg = QrCode.encodeText(text, Ecc.MEDIUM).toSvgString(4);
  const image = new Image();
  image.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
  await image.decode();

  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Não foi possível gerar a imagem do QR Code.");
  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, size, size);
  context.drawImage(image, 0, 0, size, size);

  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("Não foi possível gerar a imagem do QR Code."))), "image/png");
  });
}
