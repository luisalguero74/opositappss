import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { use } from 'react';

export async function GET(
  request: Request,
  context: { params: Promise<{ codigo: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    const { codigo } = await context.params;

    // Obtener respuestas del usuario para este tema
    // @ts-ignore - Prisma tipos no actualizados
    const answers = await prisma.userAnswer.findMany({
      where: {
        userId: session.user.id,
        question: {
          temaCodigo: codigo,
        } as any,
      },
      include: {
        question: {
          select: {
            id: true,
            text: true,
            temaCodigo: true,
            temaNumero: true,
            temaParte: true,
            temaTitulo: true,
            answers: {
              select: {
                id: true,
                text: true,
                isCorrect: true,
              },
            },
          } as any,
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    }) as any[];

    if (answers.length === 0) {
      return NextResponse.json({
        codigo,
        mensaje: 'No has practicado preguntas de este tema aún',
        estadisticas: null,
      });
    }

    // Calcular estadísticas generales
    const totalPreguntas = answers.length;
    const correctas = answers.filter((a) => a.isCorrect).length;
    const incorrectas = totalPreguntas - correctas;
    const porcentajeAcierto = Math.round((correctas / totalPreguntas) * 100);

    // Obtener información del tema de la primera respuesta
    const temaInfo = {
      codigo: answers[0].question.temaCodigo,
      numero: answers[0].question.temaNumero,
      parte: answers[0].question.temaParte,
      titulo: answers[0].question.temaTitulo,
    };

    // Identificar preguntas que falló
    const preguntasFalladas = answers
      .filter((a: any) => !a.isCorrect)
      .map((a: any) => ({
        id: a.question.id,
        pregunta: a.question.text,
        respuestaCorrecta: a.question.answers.find((ans: any) => ans.isCorrect)?.text || '',
        tuRespuesta: a.answer,
      }));

    // Generar recomendaciones basadas en el rendimiento
    const recomendaciones = [];
    
    if (porcentajeAcierto < 50) {
      recomendaciones.push({
        tipo: 'critico',
        mensaje: `Tu rendimiento en este tema es bajo (${porcentajeAcierto}%). Te recomendamos revisar la teoría completa antes de continuar practicando.`,
      });
      recomendaciones.push({
        tipo: 'accion',
        mensaje: 'Dedica al menos 2 horas a estudiar este tema antes de hacer más tests.',
      });
    } else if (porcentajeAcierto < 70) {
      recomendaciones.push({
        tipo: 'mejora',
        mensaje: `Tu rendimiento es mejorable (${porcentajeAcierto}%). Repasa las preguntas que has fallado y refuerza los conceptos clave.`,
      });
      recomendaciones.push({
        tipo: 'accion',
        mensaje: 'Practica 10-15 preguntas más de este tema para consolidar conocimientos.',
      });
    } else if (porcentajeAcierto < 85) {
      recomendaciones.push({
        tipo: 'bien',
        mensaje: `Buen rendimiento (${porcentajeAcierto}%). Sigue practicando para alcanzar la excelencia.`,
      });
      recomendaciones.push({
        tipo: 'accion',
        mensaje: 'Revisa las preguntas falladas y haz un repaso rápido del tema.',
      });
    } else {
      recomendaciones.push({
        tipo: 'excelente',
        mensaje: `¡Excelente dominio del tema! (${porcentajeAcierto}%). Mantén este nivel y practica ocasionalmente para no olvidar.`,
      });
      recomendaciones.push({
        tipo: 'accion',
        mensaje: 'Puedes enfocarte en otros temas donde tengas menor rendimiento.',
      });
    }

    // Recomendación específica si tiene muchas preguntas falladas
    if (preguntasFalladas.length > 5) {
      recomendaciones.push({
        tipo: 'atencion',
        mensaje: `Has fallado ${preguntasFalladas.length} preguntas. Revisa los errores comunes y practica más.`,
      });
    }

    return NextResponse.json({
      tema: temaInfo,
      estadisticas: {
        totalPreguntas,
        correctas,
        incorrectas,
        porcentajeAcierto,
      },
      preguntasFalladas: preguntasFalladas.slice(0, 10), // Últimas 10 falladas
      recomendaciones,
    });
  } catch (error) {
    console.error('Error obteniendo estadísticas del tema:', error);
    return NextResponse.json(
      { error: 'Error obteniendo estadísticas' },
      { status: 500 }
    );
  }
}
