type EmailSendOptions = {
  to: string
  subject: string
  html: string
  text?: string
}

let transporter: any

function normalizeEnv(value: string | undefined): string {
  return String(value ?? '')
    // Algunos entornos/CLIs pueden meter un literal "\\n" al final.
    .replace(/\\n/g, '')
    .trim()
}

function getEmailFrom(): string {
  const from = normalizeEnv(process.env.EMAIL_FROM)
  if (from) return from

  // Fallback legacy: Gmail envs
  const emailUser = normalizeEnv(process.env.EMAIL_USER)
  if (emailUser) return `"opositAPPSS" <${emailUser}>`

  throw new Error('EMAIL_FROM no está configurado')
}

async function sendWithResend(options: EmailSendOptions) {
  const apiKey = normalizeEnv(process.env.RESEND_API_KEY)
  if (!apiKey) throw new Error('RESEND_API_KEY no está configurado')

  const from = getEmailFrom()
  const replyTo = normalizeEnv(process.env.EMAIL_REPLY_TO)

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      from,
      to: [options.to],
      subject: options.subject,
      html: options.html,
      text: options.text,
      ...(replyTo ? { reply_to: replyTo } : {})
    })
  })

  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    const message = String((data as any)?.message || (data as any)?.error || 'Error enviando email')
    throw new Error(`Resend: ${message}`)
  }

  return data
}

async function createTransporter() {
  if (!transporter) {
    const resendKey = normalizeEnv(process.env.RESEND_API_KEY)
    if (resendKey) {
      // Resend se envía por API (fetch). No se usa nodemailer.
      transporter = null
      return transporter
    }

    const nodemailer = (await import('nodemailer')).default
    const smtpHost = normalizeEnv(process.env.SMTP_HOST)

    if (smtpHost) {
      const smtpPort = Number(normalizeEnv(process.env.SMTP_PORT))
      const port = Number.isFinite(smtpPort) && smtpPort > 0 ? smtpPort : 587
      const secure = normalizeEnv(process.env.SMTP_SECURE).toLowerCase() === 'true' || port === 465
      const user = normalizeEnv(process.env.SMTP_USER)
      const pass = normalizeEnv(process.env.SMTP_PASS)

      transporter = nodemailer.createTransport({
        host: smtpHost,
        port,
        secure,
        auth: user ? { user, pass } : undefined,
      })
    } else {
      // Fallback: Gmail (config actual)
      transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: normalizeEnv(process.env.EMAIL_USER),
          pass: normalizeEnv(process.env.EMAIL_PASS),
        },
      })
    }
  }
  return transporter
}

export async function sendVerificationEmail(email: string, token: string) {
  const baseUrl = normalizeEnv(process.env.NEXTAUTH_URL)
  const verificationUrl = `${baseUrl}/api/auth/verify-email?token=${encodeURIComponent(token)}`
  const subject = 'Verifica tu cuenta en opositAPPSS'
  const text = `¡Bienvenido a opositAPPSS! Haz clic en el siguiente enlace para verificar tu email: ${verificationUrl}`
  const html = `<p>¡Bienvenido a <strong>opositAPPSS</strong>!</p><p>Haz clic en el siguiente enlace para verificar tu email:</p><a href="${verificationUrl}">Verificar Email</a>`

  // Prefer Resend if configured
  const resendKey = normalizeEnv(process.env.RESEND_API_KEY)
  if (resendKey) {
    await sendWithResend({ to: email, subject, html, text })
    return
  }

  const transporter = await createTransporter()
  const from = getEmailFrom()
  const mailOptions = { from, to: email, subject, text, html }

  try {
    const info = await transporter.sendMail(mailOptions)
    console.log('Email sent:', info.messageId)
  } catch (error) {
    console.error('Error sending email:', error)
  }
}

export async function sendEmail(options: EmailSendOptions) {
  const resendKey = normalizeEnv(process.env.RESEND_API_KEY)
  if (resendKey) {
    await sendWithResend(options)
    return true
  }

  const transporter = await createTransporter()
  const from = getEmailFrom()
  const mailOptions = {
    from,
    to: options.to,
    subject: options.subject,
    html: options.html,
    text: options.text
  }

  try {
    const info = await transporter.sendMail(mailOptions)
    console.log('Email sent:', info.messageId)
    return true
  } catch (error) {
    console.error('Error sending email:', error)
    throw error
  }
}