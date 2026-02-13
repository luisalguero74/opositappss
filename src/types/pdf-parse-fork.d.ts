declare module 'pdf-parse-fork' {
  const pdfParse: (dataBuffer: Buffer | Uint8Array | ArrayBuffer) => Promise<{
    text: string
    numpages?: number
    numrender?: number
    info?: unknown
    metadata?: unknown
    version?: string
  }>

  export default pdfParse
}
