import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { RoomServiceClient } from 'livekit-server-sdk'

const livekitHost = process.env.LIVEKIT_URL || 'ws://localhost:7880'
const apiKey = process.env.LIVEKIT_API_KEY || 'devkey'
const apiSecret = process.env.LIVEKIT_API_SECRET || 'secret'

const roomService = new RoomServiceClient(livekitHost, apiKey, apiSecret)

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

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
    return NextResponse.json({ error: 'Failed to list rooms' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

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
    return NextResponse.json({ error: 'Failed to create room' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { roomName } = await req.json()
    await roomService.deleteRoom(roomName)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting room:', error)
    return NextResponse.json({ error: 'Failed to delete room' }, { status: 500 })
  }
}
