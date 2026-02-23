import { NextResponse } from 'next/server'
import OpenAI from 'openai'

export async function GET() {
  try {
    console.log('[Test OpenAI] Iniciando prueba...')
    
    const apiKey = process.env.OPENAI_API_KEY
    if (!apiKey) {
      return NextResponse.json({ 
        success: false, 
        error: 'OPENAI_API_KEY no configurada' 
      }, { status: 500 })
    }

    console.log('[Test OpenAI] API Key encontrada:', apiKey.substring(0, 10) + '...')

    const openai = new OpenAI({ apiKey })
    console.log('[Test OpenAI] Cliente OpenAI inicializado')

    console.log('[Test OpenAI] Llamando a API...')
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: 'Eres un asistente útil. Responde con JSON.'
        },
        {
          role: 'user',
          content: 'Dame un ejemplo de pregunta de oposición de Seguridad Social sobre incapacidad temporal. Responde con JSON: { "pregunta": "texto", "respuesta": "texto" }'
        }
      ],
      temperature: 0.3,
      response_format: { type: 'json_object' },
      max_tokens: 500
    })

    console.log('[Test OpenAI] Respuesta recibida')
    
    const content = response.choices[0].message.content
    if (!content) {
      return NextResponse.json({ 
        success: false, 
        error: 'Sin contenido en respuesta' 
      }, { status: 500 })
    }

    const parsed = JSON.parse(content)
    
    return NextResponse.json({ 
      success: true, 
      message: 'OpenAI funcionando correctamente',
      result: parsed,
      usage: response.usage
    })

  } catch (error: any) {
    console.error('[Test OpenAI] ERROR:', error)
    console.error('[Test OpenAI] Error message:', error.message)
    console.error('[Test OpenAI] Error code:', error.code)
    console.error('[Test OpenAI] Error type:', error.type)
    console.error('[Test OpenAI] Stack:', error.stack)
    
    return NextResponse.json({ 
      success: false, 
      error: error.message,
      code: error.code,
      type: error.type,
      details: String(error)
    }, { status: 500 })
  }
}
