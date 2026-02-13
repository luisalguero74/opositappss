import { PDFDocument, StandardFonts, degrees, rgb } from 'pdf-lib'

export type WatermarkOptions = {
  text: string
  opacity?: number
  fontSize?: number
  rotationDegrees?: number
  tileStep?: number
}

function clampNumber(value: number, min: number, max: number) {
  if (Number.isNaN(value)) return min
  return Math.max(min, Math.min(max, value))
}

export async function addPdfWatermark(inputPdfBytes: Uint8Array, options: WatermarkOptions): Promise<Uint8Array> {
  const text = String(options.text || '').trim()
  if (!text) return inputPdfBytes

  const opacity = clampNumber(options.opacity ?? 0.18, 0.05, 0.5)
  const fontSize = clampNumber(options.fontSize ?? 44, 10, 120)
  const rotation = degrees(options.rotationDegrees ?? -28)
  const tileStep = clampNumber(options.tileStep ?? 260, 120, 600)

  const pdfDoc = await PDFDocument.load(inputPdfBytes, { ignoreEncryption: false })
  const font = await pdfDoc.embedFont(StandardFonts.HelveticaBold)

  const pages = pdfDoc.getPages()
  for (const page of pages) {
    const { width, height } = page.getSize()

    // Start a little outside the page to cover corners after rotation.
    for (let y = -height; y < height * 2; y += tileStep) {
      for (let x = -width; x < width * 2; x += tileStep) {
        page.drawText(text, {
          x,
          y,
          size: fontSize,
          font,
          color: rgb(0.45, 0.45, 0.45),
          opacity,
          rotate: rotation,
        })
      }
    }
  }

  const out = await pdfDoc.save({ useObjectStreams: true })
  return out
}
