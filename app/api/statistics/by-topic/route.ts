import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    // Obtener todas las respuestas del usuario
    // @ts-ignore - Prisma tipos no actualizados
    const answers = await prisma.userAnswer.findMany({
      where: { userId: session.user.id },
      include: {
        question: {
          select: {
            temaCodigo: true,
            temaNumero: true,
            temaParte: true,
            temaTitulo: true,
          } as any,
        },
      },
    }) as any[];

    // Agrupar por tema
    const statsByTopic = new Map<string, {
      codigo: string;
      numero: number | null;
      parte: string | null;
      titulo: string | null;
      totalPreguntas: number;
      correctas: number;
      incorrectas: number;
      porcentajeAcierto: number;
    }>();

    answers.forEach((answer) => {
      const temaCodigo = answer.question.temaCodigo;
      if (!temaCodigo) return; // Skip preguntas sin tema asignado

      if (!statsByTopic.has(temaCodigo)) {
        statsByTopic.set(temaCodigo, {
          codigo: temaCodigo,
          numero: answer.question.temaNumero,
          parte: answer.question.temaParte,
          titulo: answer.question.temaTitulo,
          totalPreguntas: 0,
          correctas: 0,
          incorrectas: 0,
          porcentajeAcierto: 0,
        });
      }

      const stats = statsByTopic.get(temaCodigo)!;
      stats.totalPreguntas++;
      if (answer.isCorrect) {
        stats.correctas++;
      } else {
        stats.incorrectas++;
      }
    });

    // Calcular porcentajes y convertir a array
    const temasArray = Array.from(statsByTopic.values()).map(tema => ({
      ...tema,
      porcentajeAcierto: tema.totalPreguntas > 0 
        ? Math.round((tema.correctas / tema.totalPreguntas) * 100) 
        : 0,
    }));

    // Ordenar por porcentaje de acierto (peores primero)
    temasArray.sort((a, b) => a.porcentajeAcierto - b.porcentajeAcierto);

    return NextResponse.json({
      temas: temasArray,
      totalTemasPracticados: temasArray.length,
    });
  } catch (error) {
    console.error('Error obteniendo estadísticas por tema:', error);
    return NextResponse.json(
      { error: 'Error obteniendo estadísticas' },
      { status: 500 }
    );
  }
}
