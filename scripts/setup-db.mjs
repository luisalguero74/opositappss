import fs from 'fs';
import { execSync } from 'child_process';
import readline from 'readline';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

rl.question('Ingresa tu DATABASE_URL de Supabase: ', (databaseUrl) => {
  if (!databaseUrl) {
    console.log('DATABASE_URL es requerida.');
    rl.close();
    return;
  }

  // Actualizar .env
  const envPath = '.env';
  let envContent = '';
  if (fs.existsSync(envPath)) {
    envContent = fs.readFileSync(envPath, 'utf8');
  }
  const lines = envContent.split('\n');
  const updatedLines = lines.map(line => {
    if (line.startsWith('DATABASE_URL=')) {
      return `DATABASE_URL="${databaseUrl}"`;
    }
    return line;
  });
  if (!updatedLines.some(line => line.startsWith('DATABASE_URL='))) {
    updatedLines.push(`DATABASE_URL="${databaseUrl}"`);
  }
  fs.writeFileSync(envPath, updatedLines.join('\n'));

  console.log('Actualizando .env con DATABASE_URL...');

  // Ejecutar Prisma migrate
  try {
    console.log('Ejecutando Prisma migrate deploy...');
    execSync('npx prisma migrate deploy', { stdio: 'inherit' });
    console.log('Migraciones aplicadas.');
  } catch (error) {
    console.error('Error en migrate:', error.message);
  }

  // Ejecutar Prisma generate
  try {
    console.log('Generando Prisma client...');
    execSync('npx prisma generate', { stdio: 'inherit' });
    console.log('Prisma client generado.');
  } catch (error) {
    console.error('Error en generate:', error.message);
  }

  // Ejecutar seed
  try {
    console.log('Ejecutando seed para crear usuario admin...');
    execSync('npm run db:seed', { stdio: 'inherit' });
    console.log('Usuario admin creado.');
  } catch (error) {
    console.error('Error en seed:', error.message);
  }

  console.log('Configuración de DB completada. Ahora configura DATABASE_URL en Vercel.');
  rl.close();
});