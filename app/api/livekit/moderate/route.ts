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
  if (!livekitHost || !apiKey || !apiSecret) {
    throw new Error('LIVEKIT no configurado (LIVEKIT_URL / LIVEKIT_API_KEY / LIVEKIT_API_SECRET)')
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

    const { roomName, identity, action } = await req.json()

    switch (action) {
      case 'mute':
        await roomService.mutePublishedTrack(roomName, identity, 'audio', true)
        break
      case 'unmute':
        await roomService.mutePublishedTrack(roomName, identity, 'audio', false)
        break
      case 'disableCamera':
        await roomService.mutePublishedTrack(roomName, identity, 'video', true)
        break
      case 'enableCamera':
        await roomService.mutePublishedTrack(roomName, identity, 'video', false)
        break
      case 'kick':
        await roomService.removeParticipant(roomName, identity)
        break
      case 'muteAll': {
        const participants = await roomService.listParticipants(roomName)
        await Promise.all(participants.map(p => roomService.mutePublishedTrack(roomName, p.identity, 'audio', true)))
        break
      }
      case 'unmuteAll': {
        const participants = await roomService.listParticipants(roomName)
        await Promise.all(participants.map(p => roomService.mutePublishedTrack(roomName, p.identity, 'audio', false)))
        break
      }
      case 'disableAllCameras': {
        const participants = await roomService.listParticipants(roomName)
        await Promise.all(participants.map(p => roomService.mutePublishedTrack(roomName, p.identity, 'video', true)))
        break
      }
      case 'enableAllCameras': {
        const participants = await roomService.listParticipants(roomName)
        await Promise.all(participants.map(p => roomService.mutePublishedTrack(roomName, p.identity, 'video', false)))
        break
      }
      case 'kickAll': {
        const participants = await roomService.listParticipants(roomName)
        await Promise.all(participants.map(p => roomService.removeParticipant(roomName, p.identity)))
        break
      }
      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error moderating participant:', error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to moderate participant',
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
