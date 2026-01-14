/**
 * Script para generar embeddings retroactivos de documentos existentes
 * Genera embeddings para todos los LegalDocument sin embeddings
 * Uso: npx tsx scripts/generate-missing-embeddings.ts
 */

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// Función para generar embedding (copiada desde embeddings.ts)
async function generateEmbedding(text) {
  const apiKey = process.env.OPENAI_API_KEY;
  
  if (!apiKey) {
    console.warn('⚠️ OPENAI_API_KEY no configurada');
    return [];
  }

  try {
    const truncatedText = text.substring(0, 32000);
    
    const response = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'text-embedding-3-small',
        input: truncatedText,
        encoding_format: 'float'
      })
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`OpenAI API error: ${response.status} - ${error}`);
    }

    const data = await response.json();
    return data.data[0].embedding;
    
  } catch (error) {
    console.error('Error generando embedding:', error.message);
    return [];
  }
}

// Procesar documentos en chunks para evitar timeouts
const CHUNK_SIZE = 5;
const DELAY_MS = 1000; // 1 segundo entre chunks

async function generateMissingEmbeddings() {
  console.log('🔍 Buscando documentos sin embeddings...\n');

  try {
    // Obtener documentos sin embeddings
    const docsWithoutEmbedding = await prisma.legalDocument.findMany({
      where: {
        embedding: null,
        active: true
      },
      select: {
        id: true,
        title: true,
        content: true
      }
    });

    if (docsWithoutEmbedding.length === 0) {
      console.log('✅ Todos los documentos activos ya tienen embeddings');
      return;
    }

    console.log(`📄 Encontrados ${docsWithoutEmbedding.length} documentos sin embeddings\n`);

    let processed = 0;
    let succeeded = 0;
    let failed = 0;

    // Procesar en chunks
    for (let i = 0; i < docsWithoutEmbedding.length; i += CHUNK_SIZE) {
      const chunk = docsWithoutEmbedding.slice(i, i + CHUNK_SIZE);
      console.log(`\n📦 Procesando chunk ${Math.floor(i / CHUNK_SIZE) + 1}/${Math.ceil(docsWithoutEmbedding.length / CHUNK_SIZE)}`);
      console.log(`   (documentos ${i + 1} - ${Math.min(i + CHUNK_SIZE, docsWithoutEmbedding.length)} de ${docsWithoutEmbedding.length})\n`);

      for (const doc of chunk) {
        try {
          processed++;
          console.log(`[${processed}/${docsWithoutEmbedding.length}] Generando embedding para: "${doc.title.substring(0, 50)}..."`);

          // Generar embedding
          const embeddingText = `${doc.title}\n\n${doc.content}`;
          const embeddingArray = await generateEmbedding(embeddingText);

          if (!embeddingArray || embeddingArray.length === 0) {
            console.log(`   ⚠️  No se pudo generar embedding (API key o límite?)`);
            failed++;
            continue;
          }

          // Serializar a string para almacenar en DB
          const embeddingString = JSON.stringify(embeddingArray);

          // Actualizar documento
          await prisma.legalDocument.update({
            where: { id: doc.id },
            data: { embedding: embeddingString }
          });

          succeeded++;
          console.log(`   ✅ Embedding generado y guardado (${embeddingArray.length} dimensiones)`);

        } catch (error) {
          failed++;
          console.error(`   ❌ Error procesando documento ${doc.id}:`, error.message);
        }
      }

      // Delay entre chunks para no saturar API
      if (i + CHUNK_SIZE < docsWithoutEmbedding.length) {
        console.log(`\n⏳ Esperando ${DELAY_MS}ms antes del siguiente chunk...`);
        await new Promise(resolve => setTimeout(resolve, DELAY_MS));
      }
    }

    // Resumen final
    console.log('\n' + '═'.repeat(60));
    console.log('📊 RESUMEN DE GENERACIÓN');
    console.log('═'.repeat(60));
    console.log(`Total procesados: ${processed}`);
    console.log(`✅ Exitosos:      ${succeeded} (${Math.round(succeeded / processed * 100)}%)`);
    console.log(`❌ Fallidos:      ${failed} (${Math.round(failed / processed * 100)}%)`);
    console.log('═'.repeat(60) + '\n');

    // Verificar estado final
    const remainingDocs = await prisma.legalDocument.count({
      where: {
        embedding: null,
        active: true
      }
    });

    if (remainingDocs === 0) {
      console.log('🎉 ¡Todos los documentos activos ahora tienen embeddings!');
    } else {
      console.log(`⚠️  Quedan ${remainingDocs} documentos sin embeddings`);
    }

  } catch (error) {
    console.error('\n❌ Error en el proceso:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Ejecutar
generateMissingEmbeddings()
  .then(() => {
    console.log('\n✅ Proceso completado');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Error fatal:', error);
    process.exit(1);
  });
