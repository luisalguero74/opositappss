import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { normalizeTemaCodigo } from '@/lib/tema-codigo';
import { getPgPool, getUserAnswerColumnInfo } from '@/lib/pg';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    const pool = getPgPool();
    const { answerColumn } = await getUserAnswerColumnInfo(pool);

    const res = await pool.query(
      `
      select
        ua."isCorrect" as "isCorrect",
        q."temaCodigo" as "temaCodigo",
        q."temaNumero" as "temaNumero",
        q."temaParte" as "temaParte",
        q."temaTitulo" as "temaTitulo",
        ua."${answerColumn}" as "answer"
      from "UserAnswer" ua
      join "Question" q on q.id = ua."questionId"
      where ua."userId" = $1
      `,
      [session.user.id]
    );

    const answers = res.rows as any[];

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
      const temaCodigo = answer.temaCodigo;
      if (!temaCodigo) return; // Skip preguntas sin tema asignado

      const normalized = normalizeTemaCodigo(String(temaCodigo)) || String(temaCodigo);

      if (!statsByTopic.has(normalized)) {
        statsByTopic.set(normalized, {
          codigo: normalized,
          numero: answer.temaNumero,
          parte: answer.temaParte,
          titulo: answer.temaTitulo,
          totalPreguntas: 0,
          correctas: 0,
          incorrectas: 0,
          porcentajeAcierto: 0,
        });
      }

      const stats = statsByTopic.get(normalized)!;
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
