import fs from 'fs';

const filePath = 'app/admin/page.tsx';
let content = fs.readFileSync(filePath, 'utf8');

// Encontrar el inicio de la sección "Otras Herramientas"
const sectionStart = content.indexOf('📊 SECCIÓN: OTRAS HERRAMIENTAS');
if (sectionStart === -1) {
  console.log('No se encontró la sección');
  process.exit(1);
}

// Encontrar el final de esa sección (antes del form manual)
const sectionEnd = content.indexOf('{message.text && (', sectionStart);

// Extraer solo esa sección
const before = content.substring(0, sectionStart);
const section = content.substring(sectionStart, sectionEnd);
const after = content.substring(sectionEnd);

// Transformar las tarjetas en esa sección
let transformedSection = section
  // Reducir clases de contenedor
  .replace(/rounded-2xl shadow-lg overflow-hidden hover:shadow-xl transition transform hover:scale-105/g, 'rounded-lg shadow-md overflow-hidden hover:shadow-lg transition')
  // Cambiar altura fija por padding
  .replace(/ h-32 flex items-center justify-center/g, ' p-3 flex flex-col items-center justify-center')
  // Reducir iconos
  .replace(/text-5xl/g, 'text-3xl mb-1')
  // Reducir padding
  .replace(/<div className="p-6">/g, '<div className="p-3">')
  // Mover títulos al header y reducir texto
  .replace(/<h2 className="text-xl font-bold text-gray-800 mb-3">([^<]+)<\/h2>/g, '<h2 className="text-xs font-bold text-white text-center">$1</h2>')
  // Reducir descripciones
  .replace(/text-gray-600 mb-4 text-sm/g, 'text-gray-600 text-xs text-center mb-3')
  // Hacer botones full-width
  .replace(/inline-block bg-gradient/g, 'inline-block w-full text-center bg-gradient')
  // Reducir padding de botones
  .replace(/ px-5 py-2 /g, ' px-3 py-2 ')
  // Reducir texto de botones
  .replace(/transition text-sm/g, 'transition text-xs');

// Ahora movemos los h2 del contenido al header
transformedSection = transformedSection.replace(
  /(<div className="bg-gradient-to-r[^>]+p-3 flex flex-col items-center justify-center">[\s\S]*?<div className="text-white text-3xl mb-1">[^<]+<\/div>\s*<\/div>\s*<div className="p-3">)\s*<h2 className="text-xs font-bold text-white text-center">([^<]+)<\/h2>/g,
  (match, header, title) => {
    // Insertar el título en el header, justo después del icono
    return header.replace(/(<div className="text-white text-3xl mb-1">[^<]+<\/div>)/, `$1\n                <h2 className="text-xs font-bold text-white text-center">${title}</h2>`) + '\n              <div className="p-3">';
  }
);

// Reconstruir el archivo
const newContent = before + transformedSection + after;

fs.writeFileSync(filePath, newContent, 'utf8');
console.log('✅ Tarjetas reducidas exitosamente');
