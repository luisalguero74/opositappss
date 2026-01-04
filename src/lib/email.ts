import nodemailer from 'nodemailer'

let transporter: nodemailer.Transporter

async function createTransporter() {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    })
  }
  return transporter
}

export async function sendVerificationEmail(email: string, token: string) {
  const transporter = await createTransporter()
  const verificationUrl = `${process.env.NEXTAUTH_URL}/api/auth/verify-email?token=${token}`
  const mailOptions = {
    from: `"opositAPPSS" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: 'Verifica tu cuenta en opositAPPSS',
    text: `¡Bienvenido a opositAPPSS! Haz clic en el siguiente enlace para verificar tu email: ${verificationUrl}`,
    html: `<p>¡Bienvenido a <strong>opositAPPSS</strong>!</p><p>Haz clic en el siguiente enlace para verificar tu email:</p><a href="${verificationUrl}">Verificar Email</a>`,
  }

  try {
    const info = await transporter.sendMail(mailOptions)
    console.log('Email sent:', info.messageId)
    console.log('Preview URL:', nodemailer.getTestMessageUrl(info))
  } catch (error) {
    console.error('Error sending email:', error)
  }
}

export async function sendEmail(options: {
  to: string
  subject: string
  html: string
}) {
  const transporter = await createTransporter()
  const mailOptions = {
    from: `"opositAPPSS" <${process.env.EMAIL_USER}>`,
    to: options.to,
    subject: options.subject,
    html: options.html,
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