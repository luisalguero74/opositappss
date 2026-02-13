import { prisma } from '@/lib/prisma'
import { fetchBoeSumario, formatBoeDateYYYYMMDD } from '@/lib/boe-datosabiertos'
import { detectSecuritySocialBoeItem } from '@/lib/boe-ss-detector'
import { sendEmail } from '@/lib/email'
import { ensureBoeMonitorTablesExist } from '@/lib/boe-db'

const JOB = 'boe-ss'

function normalizeEnv(value: string | undefined | null): string {
  return String(value ?? '').trim()
}

function getAdminBoeEmails(): string[] {
  const primary = normalizeEnv(process.env.ADMIN_BOE_EMAILS)
  const fallback = normalizeEnv(process.env.ADMIN_ERROR_EMAILS)
  const raw = primary || fallback
  if (!raw) return []
  return raw
    .split(',')
    .map(s => s.trim())
    .filter(Boolean)
}

function yyyymmddToUtcDate(yyyymmdd: string): Date {
  const y = Number(yyyymmdd.slice(0, 4))
  const m = Number(yyyymmdd.slice(4, 6))
  const d = Number(yyyymmdd.slice(6, 8))
  if (!Number.isFinite(y) || !Number.isFinite(m) || !Number.isFinite(d)) {
    throw new Error(`Invalid date format (expected YYYYMMDD): ${yyyymmdd}`)
  }
  return new Date(Date.UTC(y, m - 1, d, 0, 0, 0, 0))
}

export type BoeMonitorResult = {
  publicationDateYYYYMMDD: string
  scannedItems: number
  matchedItems: number
  newItems: number
  runId: string
}

export async function runBoeSecuritySocialMonitor(input?: {
  dateYYYYMMDD?: string
  notifyAdmins?: boolean
}): Promise<BoeMonitorResult> {
  await ensureBoeMonitorTablesExist()

  const now = new Date()
  const dateYYYYMMDD = input?.dateYYYYMMDD || formatBoeDateYYYYMMDD(now)
  const notifyAdmins = input?.notifyAdmins ?? false

  const { publicationDateYYYYMMDD, items } = await fetchBoeSumario(dateYYYYMMDD)
  const publicationDate = yyyymmddToUtcDate(publicationDateYYYYMMDD)

  const scannedItems = items.length
  const detections = items
    .map(it => ({ it, det: detectSecuritySocialBoeItem(it) }))
    .filter(x => x.det.matched)
    .sort((a, b) => b.det.score - a.det.score)

  const matchedItems = detections.length

  const run = await prisma.boeMonitorRun.upsert({
    where: {
      job_publicationDate: {
        job: JOB,
        publicationDate
      }
    },
    update: {
      success: false,
      scannedItems,
      matchedItems,
      error: null
    },
    create: {
      job: JOB,
      publicationDate,
      success: false,
      scannedItems,
      matchedItems,
      newItems: 0
    }
  })

  let newItems = 0
  const newlyCreated: Array<{ title: string; identificador: string; urlHtml: string; score: number }> = []

  for (const { it, det } of detections) {
    const boeId = it.identificador || null
    const canonicalKey = boeId ? boeId : `${publicationDateYYYYMMDD}:${it.urlHtml}`

    try {
      await prisma.boeAlertItem.create({
        data: {
          runId: run.id,
          publicationDate,
          canonicalKey,
          boeId,
          title: it.titulo,
          urlHtml: it.urlHtml,
          urlPdf: it.urlPdf ?? null,
          section: it.section ?? null,
          department: it.department ?? null,
          epigrafe: it.epigrafe ?? null,
          score: Math.max(0, Math.floor(det.score)),
          reasons: det.reasons.length ? JSON.stringify(det.reasons.slice(0, 30)) : null,
          isRead: false
        }
      })
      newItems += 1
      newlyCreated.push({
        title: it.titulo,
        identificador: it.identificador,
        urlHtml: it.urlHtml,
        score: Math.max(0, Math.floor(det.score))
      })
    } catch (e: any) {
      // Ignore duplicates by canonicalKey.
      const msg = String(e?.message || '')
      if (msg.includes('Unique constraint') || msg.toLowerCase().includes('unique')) {
        continue
      }
      throw e
    }
  }

  await prisma.boeMonitorRun.update({
    where: { id: run.id },
    data: {
      success: true,
      newItems,
      scannedItems,
      matchedItems,
      error: null
    }
  })

  if (notifyAdmins && newItems > 0) {
    const to = getAdminBoeEmails()
    if (to.length > 0) {
      const top = newlyCreated
        .slice()
        .sort((a, b) => b.score - a.score)
        .slice(0, 10)
      const subject = `opositAPPSS: ${newItems} nuevas disposiciones BOE (Seguridad Social) - ${publicationDateYYYYMMDD}`
      const lines = top
        .map(x => `• [${x.score}] ${x.title} (${x.identificador})\n  ${x.urlHtml}`)
        .join('\n\n')

      const text =
        `Se han detectado ${newItems} nuevas disposiciones potencialmente relacionadas con Seguridad Social.\n\n` +
        `Fecha BOE: ${publicationDateYYYYMMDD}\n` +
        `Revisar en el panel: https://www.opositapp.site/admin/actualizaciones-boe\n\n` +
        `Top resultados:\n${lines}\n`

      const html =
        `<p>Se han detectado <strong>${newItems}</strong> nuevas disposiciones potencialmente relacionadas con <strong>Seguridad Social</strong>.</p>` +
        `<p>Fecha BOE: <strong>${publicationDateYYYYMMDD}</strong></p>` +
        `<p><a href="https://www.opositapp.site/admin/actualizaciones-boe">Abrir panel de alertas</a></p>` +
        `<hr/>` +
        top
          .map(x => {
            const safeTitle = String(x.title || '').replace(/</g, '&lt;').replace(/>/g, '&gt;')
            return `<p><strong>[${x.score}]</strong> ${safeTitle}<br/><a href="${x.urlHtml}">${x.identificador}</a></p>`
          })
          .join('')

      for (const email of to) {
        await sendEmail({ to: email, subject, html, text })
      }
    }
  }

  return {
    publicationDateYYYYMMDD,
    scannedItems,
    matchedItems,
    newItems,
    runId: run.id
  }
}
