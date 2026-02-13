import NextAuth from 'next-auth/next'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { authOptions } from '@/lib/auth'

export const runtime = 'nodejs'

type RouteHandlerContext = { params: Promise<{ nextauth: string[] }> }

async function safeHandler(req: NextRequest, ctx: RouteHandlerContext) {
	try {
		const params = await ctx.params
		return await NextAuth(req, { params }, authOptions)
	} catch (error) {
		console.error('[NextAuth] Unhandled error in /api/auth/*', error)

		const message =
			error instanceof Error
				? error.message
				: typeof error === 'string'
					? error
					: 'Unknown error'

		return NextResponse.json(
			{ error: 'NEXTAUTH_RUNTIME_ERROR', message },
			{ status: 500 }
		)
	}
}

export { safeHandler as GET, safeHandler as POST }