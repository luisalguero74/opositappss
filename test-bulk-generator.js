// Test rápido del generador bulk
const testUrl = 'http://localhost:3000/api/admin/generate-bulk-questions';

async function testBulkGenerator() {
  console.log('🧪 Testing bulk generator...\n');
  
  // 1. Start - crear cuestionario
  console.log('1️⃣ Iniciando generación...');
  const startRes = await fetch(testUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action: 'start',
      categoria: 'lgss',
      preguntasPorTema: 5  // Solo 5 para prueba
    })
  });
  
  const startData = await startRes.json();
  console.log('✅ Start response:', startData);
  
  if (!startRes.ok) {
    console.error('❌ Error en start:', startData);
    return;
  }
  
  const { questionnaireId } = startData;
  
  // 2. Generar chunk de preguntas
  console.log('\n2️⃣ Generando preguntas...');
  const chunkRes = await fetch(testUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action: 'chunk',
      categoria: 'lgss',
      preguntasPorTema: 5,
      questionnaireId,
      preguntasChunkSize: 5
    })
  });
  
  const chunkData = await chunkRes.json();
  console.log('✅ Chunk response:', JSON.stringify(chunkData, null, 2));
  
  if (!chunkRes.ok) {
    console.error('❌ Error en chunk:', chunkData);
  }
}

testBulkGenerator().catch(console.error);
