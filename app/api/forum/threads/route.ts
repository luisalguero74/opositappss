import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const threads = await prisma.forumThread.findMany({
    orderBy: { updatedAt: 'desc' },
    include: { _count: { select: { posts: true } } }
  })
  return NextResponse.json(threads)
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { title } = await request.json()
  if (!title || title.trim().length < 3) {
    return NextResponse.json({ error: 'Título inválido' }, { status: 400 })
  }

  const thread = await prisma.forumThread.create({
    data: { title: title.trim(), userId: session.user.id }
  })
  return NextResponse.json(thread, { status: 201 })
}
