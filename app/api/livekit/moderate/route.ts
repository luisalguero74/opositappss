import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { RoomServiceClient } from 'livekit-server-sdk'

const livekitHost = process.env.LIVEKIT_URL || 'ws://localhost:7880'
const apiKey = process.env.LIVEKIT_API_KEY || 'devkey'
const apiSecret = process.env.LIVEKIT_API_SECRET || 'secret'

const roomService = new RoomServiceClient(livekitHost, apiKey, apiSecret)

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

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
    return NextResponse.json({ error: 'Failed to moderate participant' }, { status: 500 })
  }
}
