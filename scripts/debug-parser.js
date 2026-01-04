const fs = require('fs');

const content = fs.readFileSync('public/ejemplos/EJEMPLO_SUPUESTO_PRACTICO_CORRECTO.txt', 'utf-8');
const normalized = content.replace(/^\uFEFF/, '').replace(/\r\n/g, '\n');
const allLines = normalized.split('\n').map(l => l.trim());
const lines = allLines.filter(l => l.length > 0);

const solutions = {};
let lastSolutionNumber = 0;
let inSolutions = false;

for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  const upper = line.toUpperCase();
  
  if (upper.match(/^(SOLUCIONARIO|SOLUCIONES|RESPUESTAS)[\s:]*$/)) {
    inSolutions = true;
    console.log('SECTION: SOLUCIONARIO found at line', i);
    continue;
  }
  
  if (inSolutions) {
    const solMatch = line.match(/^(?:PREGUNTA\s*)?(\d+)[\s:.\-]+([A-D])(?:\s|$)/i);
    if (solMatch) {
      const num = parseInt(solMatch[1]);
      const ans = solMatch[2].toUpperCase();
      const remainingText = line.replace(/^(?:PREGUNTA\s*)?(\d+)[\s:.\-]+([A-D])\s*/i, '').trim();
      solutions[num] = { answer: ans, explanation: remainingText || '' };
      lastSolutionNumber = num;
      console.log(`Line ${i}: FOUND PREGUNTA ${num}: ${ans} | Remaining: '${remainingText.substring(0, 50)}'`);
      continue;
    }
    
    const isPreguntaLine = line.toUpperCase().match(/^PREGUNTA\s*\d+[\s:]/);
    if (lastSolutionNumber > 0 && solutions[lastSolutionNumber] && !isPreguntaLine) {
      const prev = solutions[lastSolutionNumber].explanation;
      solutions[lastSolutionNumber].explanation = prev ? prev + ' ' + line : line;
      console.log(`Line ${i}: APPENDING to P${lastSolutionNumber}: '${line.substring(0, 50)}'`);
    } else if (lastSolutionNumber > 0 && isPreguntaLine) {
      console.log(`Line ${i}: SKIPPING (new PREGUNTA detected): '${line.substring(0, 50)}'`);
    }
  }
}

console.log('\n=== SOLUCIONES FINALES ===');
Object.keys(solutions).forEach(k => {
  console.log(`P${k}: ${solutions[k].answer} | Explicación: ${solutions[k].explanation.length} chars`);
  console.log(`  Preview: ${solutions[k].explanation.substring(0, 100)}...`);
});
