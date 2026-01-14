/**
 * Script simplificado para generar embeddings retroactivos
 * Uso: node scripts/generate-missing-embeddings-simple.mjs
 */

import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';

// Cargar variables de entorno
dotenv.config({ path: '.env.local' });

const prisma = new PrismaClient();

// Función para generar embedding usando OpenAI API
async function generateEmbedding(text) {
  const apiKey = process.env.OPENAI_API_KEY;
  
  if (!apiKey) {
    console.warn('⚠️ OPENAI_API_KEY no configurada');
    return [];
  }

  try {
    // Límite más conservador: 8192 tokens ≈ 24000 caracteres en español
    // Usamos 20000 para estar seguros
    const truncatedText = text.substring(0, 20000);
    
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

const CHUNK_SIZE = 5;
const DELAY_MS = 1000;

async function generateMissingEmbeddings() {
  console.log('🔍 Buscando documentos sin embeddings...\n');

  try {
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

    for (let i = 0; i < docsWithoutEmbedding.length; i += CHUNK_SIZE) {
      const chunk = docsWithoutEmbedding.slice(i, i + CHUNK_SIZE);
      console.log(`\n📦 Procesando chunk ${Math.floor(i / CHUNK_SIZE) + 1}/${Math.ceil(docsWithoutEmbedding.length / CHUNK_SIZE)}`);
      console.log(`   (documentos ${i + 1} - ${Math.min(i + CHUNK_SIZE, docsWithoutEmbedding.length)} de ${docsWithoutEmbedding.length})\n`);

      for (const doc of chunk) {
        try {
          processed++;
          console.log(`[${processed}/${docsWithoutEmbedding.length}] "${doc.title.substring(0, 50)}..."`);

          const embeddingText = `${doc.title}\n\n${doc.content}`;
          const embeddingArray = await generateEmbedding(embeddingText);

          if (!embeddingArray || embeddingArray.length === 0) {
            console.log(`   ⚠️  No se pudo generar embedding`);
            failed++;
            continue;
          }

          const embeddingString = JSON.stringify(embeddingArray);

          await prisma.legalDocument.update({
            where: { id: doc.id },
            data: { embedding: embeddingString }
          });

          succeeded++;
          console.log(`   ✅ Embedding guardado (${embeddingArray.length} dims)`);

        } catch (error) {
          failed++;
          console.error(`   ❌ Error:`, error.message);
        }
      }

      if (i + CHUNK_SIZE < docsWithoutEmbedding.length) {
        console.log(`\n⏳ Esperando ${DELAY_MS}ms...`);
        await new Promise(resolve => setTimeout(resolve, DELAY_MS));
      }
    }

    console.log('\n' + '═'.repeat(60));
    console.log('📊 RESUMEN');
    console.log('═'.repeat(60));
    console.log(`Total:    ${processed}`);
    console.log(`✅ Éxito: ${succeeded} (${Math.round(succeeded / processed * 100)}%)`);
    console.log(`❌ Error: ${failed} (${Math.round(failed / processed * 100)}%)`);
    console.log('═'.repeat(60) + '\n');

    const remaining = await prisma.legalDocument.count({
      where: { embedding: null, active: true }
    });

    if (remaining === 0) {
      console.log('🎉 ¡Todos los documentos activos tienen embeddings!');
    } else {
      console.log(`⚠️  Quedan ${remaining} documentos sin embeddings`);
    }

  } catch (error) {
    console.error('\n❌ Error:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

generateMissingEmbeddings()
  .then(() => {
    console.log('\n✅ Proceso completado');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Error fatal:', error);
    process.exit(1);
  });
