import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const formData = await req.formData()
    const file = formData.get('file') as File

    if (!file) {
      return NextResponse.json({ error: 'No se proporcionó archivo' }, { status: 400 })
    }

    // Leer contenido del archivo
    const buffer = await file.arrayBuffer()
    let content = Buffer.from(buffer).toString('utf-8')
    
    // Intentar diferentes encodings si UTF-8 falla
    let encoding = 'UTF-8'
    if (content.includes('�') || content.length === 0) {
      content = Buffer.from(buffer).toString('latin1')
      encoding = 'Latin-1'
    }

    // Análisis detallado línea por línea
    const cleanContent = content.replace(/^\uFEFF/, '').replace(/\r\n/g, '\n')
    const allLines = cleanContent.split('\n')
    
    const analysis = {
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type,
      totalLines: allLines.length,
      encoding: 'UTF-8',
      rawPreview: cleanContent.substring(0, 500),
      lines: allLines.slice(0, 50).map((line, index) => ({
        number: index + 1,
        content: line,
        trimmed: line.trim(),
        length: line.length,
        isEmpty: line.trim().length === 0,
        detections: {
          isEnunciado: line.toUpperCase().includes('ENUNCIADO'),
          isPreguntas: line.toUpperCase().includes('PREGUNTAS') && !line.toUpperCase().includes('PREGUNTA '),
          isPregunta: /^PREGUNTA\s+\d+/i.test(line.trim()),
          isOpcion: /^OPCI[OÓ]N\s+[A-D]/i.test(line.trim()),
          isSolucionario: line.toUpperCase().includes('SOLUCIONARIO') || 
                          line.toUpperCase().includes('SOLUCIONES')
        }
      })),
      sections: detectSections(cleanContent),
      suggestions: [] as string[]
    }

    // Añadir sugerencias basadas en el análisis
    if (!analysis.sections.enunciadoFound) {
      analysis.suggestions.push('⚠️ No se detectó la palabra "ENUNCIADO" en el archivo')
    }
    if (!analysis.sections.preguntasFound) {
      analysis.suggestions.push('⚠️ No se detectó la sección "PREGUNTAS"')
    }
    if (!analysis.sections.solucionarioFound) {
      analysis.suggestions.push('⚠️ No se detectó la sección "SOLUCIONARIO"')
    }
    if (analysis.sections.questionsDetected === 0) {
      analysis.suggestions.push('⚠️ No se detectaron preguntas')
    } else if (analysis.sections.questionsDetected > 15) {
      analysis.suggestions.push(`⚠️ Se detectaron ${analysis.sections.questionsDetected} preguntas (máximo: 15)`)
    }

    return NextResponse.json({ analysis })

  } catch (error) {
    console.error('Error analyzing file:', error)
    return NextResponse.json({ 
      error: 'Error al analizar archivo',
      details: error instanceof Error ? error.message : 'Error desconocido'
    }, { status: 500 })
  }
}

function detectSections(content: string) {
  const lines = content.split('\n').map(l => l.trim()).filter(l => l)
  
  let enunciadoFound = false
  let preguntasFound = false
  let solucionarioFound = false
  let questionsDetected = 0
  let enunciadoLine = -1
  let preguntasLine = -1
  let solucionarioLine = -1
  
  lines.forEach((line, index) => {
    const upper = line.toUpperCase()
    
    if (upper.includes('ENUNCIADO')) {
      enunciadoFound = true
      enunciadoLine = index + 1
    }
    if (upper.includes('PREGUNTAS') && !upper.includes('PREGUNTA ')) {
      preguntasFound = true
      preguntasLine = index + 1
    }
    if (upper.includes('SOLUCIONARIO') || upper.includes('SOLUCIONES')) {
      solucionarioFound = true
      solucionarioLine = index + 1
    }
    if (/^PREGUNTA\s+\d+/i.test(line)) {
      questionsDetected++
    }
  })
  
  return {
    enunciadoFound,
    preguntasFound,
    solucionarioFound,
    questionsDetected,
    enunciadoLine,
    preguntasLine,
    solucionarioLine
  }
}
