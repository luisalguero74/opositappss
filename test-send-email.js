import { sendVerificationEmail } from './src/lib/email';

(async () => {
  const email = process.env.TEST_EMAIL || 'tu_email_destino@gmail.com';
  const token = 'test-token-123';
  try {
    const ok = await sendVerificationEmail(email, token);
    console.log('Verification email sent:', ok);
    console.log('Correo de prueba enviado correctamente.');
  } catch (err) {
    console.error('Error enviando correo de prueba:', err);
  }
})();
