import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

interface Params {
  params: Promise<{ id: string }>
}

export async function GET(_req: Request, { params }: Params) {
  const { id } = await params
  const posts = await prisma.forumPost.findMany({
    where: { threadId: id },
    orderBy: { createdAt: 'asc' },
    include: { user: { select: { email: true, id: true } } }
  })
  return NextResponse.json(posts)
}

export async function POST(request: Request, { params }: Params) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { content } = await request.json()
  if (!content || content.trim().length < 1) {
    return NextResponse.json({ error: 'Contenido requerido' }, { status: 400 })
  }

  const { id } = await params
  const post = await prisma.forumPost.create({
    data: {
      threadId: id,
      userId: session.user.id,
      content: content.trim()
    }
  })
  await prisma.forumThread.update({ where: { id }, data: { updatedAt: new Date() } })
  return NextResponse.json(post, { status: 201 })
}
