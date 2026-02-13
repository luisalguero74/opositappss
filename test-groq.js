let fetch;
try {
    fetch = require('node-fetch');
} catch (e) {
    console.error('node-fetch no está instalado o no se pudo importar. Instálalo con: npm install node-fetch');
    process.exit(1);
}

const GROQ_API_KEY = process.env.GROQ_API_KEY;
const endpoint = 'https://api.groq.com/openai/v1/chat/completions';


const modelos = [
    'llama-3.3-70b-versatile'
];

async function testModel(model) {
    console.log(`\n--- Probando modelo: ${model} ---`);
    const body = {
        model,
        messages: [
            { role: 'system', content: 'Eres un generador de preguntas tipo test.' },
            { role: 'user', content: 'Genera una pregunta tipo test de ejemplo sobre historia de España.' }
        ],
        max_tokens: 256,
        temperature: 0.7
    };
    try {
        const res = await fetch(endpoint, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${GROQ_API_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(body)
        });
        console.log('Código de estado HTTP:', res.status);
        let data;
        try {
            data = await res.json();
        } catch (e) {
            console.error('No se pudo parsear la respuesta como JSON. Respuesta cruda:');
            const text = await res.text();
            console.error(text);
            return false;
        }
        if (res.ok && data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content) {
            console.log('✅ Respuesta de Groq:');
            console.log(data.choices[0].message.content);
            return true;
        } else {
            console.error('❌ Error de Groq o respuesta inesperada:', data);
            return false;
        }
    } catch (err) {
        console.error('❌ Error de red o fetch:', err);
        return false;
    }
}

async function testGroq() {
    console.log('--- Diagnóstico test-groq.js ---');
    if (!GROQ_API_KEY) {
        console.error('❌ Falta la variable de entorno GROQ_API_KEY. Usa: export GROQ_API_KEY=tu_clave');
        return;
    } else {
        console.log('✅ GROQ_API_KEY detectada.');
    }

    let algunoFunciona = false;
    for (const modelo of modelos) {
        const ok = await testModel(modelo);
        if (ok) {
            console.log(`✅ El modelo '${modelo}' funciona con tu clave.`);
            algunoFunciona = true;
            break;
        }
    }
    if (!algunoFunciona) {
        console.error('❌ Ningún modelo de la lista funciona con tu clave. Revisa tu cuenta Groq para ver los modelos disponibles.');
    }
}

testGroq();