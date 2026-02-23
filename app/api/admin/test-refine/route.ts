// Endpoint de prueba para verificar configuración de refinamiento
import { NextResponse } from 'next/server'
import Groq from 'groq-sdk'
import OpenAI from 'openai'

export async function GET() {
  const diagnostics: any = {
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    checks: {}
  }

  // 1. Verificar API keys
  diagnostics.checks.groqKeyPresent = !!process.env.GROQ_API_KEY
  diagnostics.checks.groqKeyLength = process.env.GROQ_API_KEY?.length || 0
  diagnostics.checks.openaiKeyPresent = !!process.env.OPENAI_API_KEY
  diagnostics.checks.openaiKeyLength = process.env.OPENAI_API_KEY?.length || 0

  // 2. Intentar inicializar clientes
  try {
    const groq = new Groq({ apiKey: process.env.GROQ_API_KEY || '' })
    diagnostics.checks.groqClient = '✅ Inicializado'
  } catch (error) {
    diagnostics.checks.groqClient = `❌ Error: ${error instanceof Error ? error.message : 'Unknown'}`
  }

  try {
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY || '' })
    diagnostics.checks.openaiClient = '✅ Inicializado'
  } catch (error) {
    diagnostics.checks.openaiClient = `❌ Error: ${error instanceof Error ? error.message : 'Unknown'}`
  }

  // 3. Test simple de Groq
  if (process.env.GROQ_API_KEY) {
    try {
      const groq = new Groq({ apiKey: process.env.GROQ_API_KEY })
      const response = await groq.chat.completions.create({
        messages: [
          { role: 'system', content: 'Responde solo con JSON.' },
          { role: 'user', content: 'Di "test": true en JSON' }
        ],
        model: 'llama-3.3-70b-versatile',
        temperature: 0.1,
        response_format: { type: 'json_object' },
      })
      
      const content = response.choices[0].message.content
      diagnostics.checks.groqTest = content ? '✅ Respuesta OK' : '❌ Sin contenido'
      diagnostics.groqResponse = content
    } catch (error) {
      diagnostics.checks.groqTest = `❌ ${error instanceof Error ? error.message : 'Unknown'}`
    }
  } else {
    diagnostics.checks.groqTest = '⚠️ API key no presente'
  }

  // 4. Test simple de OpenAI
  if (process.env.OPENAI_API_KEY) {
    try {
      const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
      const response = await openai.chat.completions.create({
        model: 'gpt-4o-mini',  // Usar mini para prueba económica
        messages: [
          { role: 'system', content: 'Responde solo con JSON.' },
          { role: 'user', content: 'Di "test": true en JSON' }
        ],
        temperature: 0.1,
        response_format: { type: 'json_object' },
      })
      
      const content = response.choices[0].message.content
      diagnostics.checks.openaiTest = content ? '✅ Respuesta OK' : '❌ Sin contenido'
      diagnostics.openaiResponse = content
    } catch (error) {
      diagnostics.checks.openaiTest = `❌ ${error instanceof Error ? error.message : 'Unknown'}`
    }
  } else {
    diagnostics.checks.openaiTest = '⚠️ API key no presente'
  }

  return NextResponse.json(diagnostics, { status: 200 })
}
