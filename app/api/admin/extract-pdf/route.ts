import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function POST(req: NextRequest) {
  try {
    // Verificar autenticación admin
    const session = await getServerSession(authOptions)
    const role = session?.user?.role?.toUpperCase()
    
    if (!session || role !== 'ADMIN') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const formData = await req.formData()
    const file = formData.get('file') as File
    
    if (!file) {
      return NextResponse.json({ error: 'No se recibió archivo' }, { status: 400 })
    }

    // Verificar que es PDF
    if (!file.name.endsWith('.pdf')) {
      return NextResponse.json({ error: 'Solo se aceptan archivos PDF' }, { status: 400 })
    }

    // Convertir a buffer
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    // Extraer texto con pdf-parse-fork
    const pdfParse = (await import('pdf-parse-fork')).default
    const pdfData = await pdfParse(buffer)
    
    let content = pdfData.text

    // Limitar a 500k caracteres
    if (content.length > 500000) {
      content = content.substring(0, 500000)
    }

    return NextResponse.json({
      success: true,
      content,
      fileName: file.name,
      pages: pdfData.numpages,
      contentLength: content.length
    })

  } catch (error: any) {
    console.error('Error extrayendo PDF:', error)
    return NextResponse.json({
      error: 'Error procesando PDF',
      details: error.message
    }, { status: 500 })
  }
}
