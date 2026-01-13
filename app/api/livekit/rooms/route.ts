import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { RoomServiceClient } from 'livekit-server-sdk'

function normalizeLivekitHost(url: string): string {
  const raw = String(url || '').trim()
  if (!raw) return ''
  if (raw.startsWith('wss://')) return raw.replace(/^wss:\/\//, 'https://')
  if (raw.startsWith('ws://')) return raw.replace(/^ws:\/\//, 'http://')
  return raw
}

const livekitHost = normalizeLivekitHost(process.env.LIVEKIT_URL || '')
const rawApiKey = String(process.env.LIVEKIT_API_KEY || '')
const rawApiSecret = String(process.env.LIVEKIT_API_SECRET || '')
const apiKey = rawApiKey.trim()
const apiSecret = rawApiSecret.trim()

function hasWhitespace(value: string): boolean {
  return /\s/.test(String(value || ''))
}

function assertLivekitConfigured() {
  // In production we should never silently fall back to localhost/dev keys.
  if (!livekitHost || !apiKey || !apiSecret) {
    throw new Error('LIVEKIT no configurado (LIVEKIT_URL / LIVEKIT_API_KEY / LIVEKIT_API_SECRET)')
  }
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session || String(session.user.role || '').toLowerCase() !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    assertLivekitConfigured()

    const roomService = new RoomServiceClient(livekitHost, apiKey, apiSecret)

    const rooms = await roomService.listRooms()
    const roomsWithParticipants = await Promise.all(
      rooms.map(async (room) => {
        const participants = await roomService.listParticipants(room.name)
        return {
          name: room.name,
          sid: room.sid,
          numParticipants: room.numParticipants,
          participants: participants.map(p => ({
            identity: p.identity,
            name: p.name,
            sid: p.sid,
            isMuted: false,
            isCameraOff: false
          }))
        }
      })
    )

    return NextResponse.json({ rooms: roomsWithParticipants })
  } catch (error) {
    console.error('Error listing rooms:', error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to list rooms',
        details: {
          host: livekitHost || null,
          hasKey: Boolean(apiKey),
          hasSecret: Boolean(apiSecret),
          keyLength: apiKey ? apiKey.length : 0,
          secretLength: apiSecret ? apiSecret.length : 0,
          rawKeyLength: rawApiKey ? rawApiKey.length : 0,
          rawSecretLength: rawApiSecret ? rawApiSecret.length : 0,
          rawKeyHasWhitespace: hasWhitespace(rawApiKey),
          rawSecretHasWhitespace: hasWhitespace(rawApiSecret)
        }
      },
      { status: 500 }
    )
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || String(session.user.role || '').toLowerCase() !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    assertLivekitConfigured()
    const roomService = new RoomServiceClient(livekitHost, apiKey, apiSecret)

    const { roomName, metadata, maxParticipants, emptyTimeout } = await req.json()
    if (!roomName) {
      return NextResponse.json({ error: 'Room name required' }, { status: 400 })
    }

    await roomService.createRoom({
      name: roomName,
      metadata: metadata || '',
      maxParticipants: maxParticipants || 50,
      emptyTimeout: emptyTimeout || 300 // seconds
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error creating room:', error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to create room',
        details: {
          host: livekitHost || null,
          hasKey: Boolean(apiKey),
          hasSecret: Boolean(apiSecret),
          keyLength: apiKey ? apiKey.length : 0,
          secretLength: apiSecret ? apiSecret.length : 0,
          rawKeyLength: rawApiKey ? rawApiKey.length : 0,
          rawSecretLength: rawApiSecret ? rawApiSecret.length : 0,
          rawKeyHasWhitespace: hasWhitespace(rawApiKey),
          rawSecretHasWhitespace: hasWhitespace(rawApiSecret)
        }
      },
      { status: 500 }
    )
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || String(session.user.role || '').toLowerCase() !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    assertLivekitConfigured()
    const roomService = new RoomServiceClient(livekitHost, apiKey, apiSecret)

    const { roomName } = await req.json()
    await roomService.deleteRoom(roomName)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting room:', error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to delete room',
        details: {
          host: livekitHost || null,
          hasKey: Boolean(apiKey),
          hasSecret: Boolean(apiSecret),
          keyLength: apiKey ? apiKey.length : 0,
          secretLength: apiSecret ? apiSecret.length : 0,
          rawKeyLength: rawApiKey ? rawApiKey.length : 0,
          rawSecretLength: rawApiSecret ? rawApiSecret.length : 0,
          rawKeyHasWhitespace: hasWhitespace(rawApiKey),
          rawSecretHasWhitespace: hasWhitespace(rawApiSecret)
        }
      },
      { status: 500 }
    )
  }
}
