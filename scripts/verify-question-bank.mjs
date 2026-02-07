#!/usr/bin/env node
/**
 * Lightweight verifier for local JSON question banks.
 *
 * What it checks:
 * - Basic schema and required fields
 * - `correctAnswer` is A/B/C/D
 * - Correct option index matches `correctAnswer`
 * - Explanation includes at least one quoted fragment
 * - Explanation includes a legal anchor (art./artículo/disposición/capítulo/sección)
 * - (Optional) If a corpus text file is provided, every quoted fragment must appear in it
 * - (Heuristic) Explanation overlaps with the correct option (warning only)
 *
 * Usage:
 *   node scripts/verify-question-bank.mjs <questions.json> [corpus.txt] [--strict]
 */

import fs from 'node:fs'

const argv = process.argv.slice(2)
const strict = argv.includes('--strict')
const positionals = argv.filter((a) => !a.startsWith('-'))
const [jsonPath, corpusPath] = positionals

if (!jsonPath) {
  console.error('Usage: node scripts/verify-question-bank.mjs <questions.json> [corpus.txt] [--strict]')
  process.exit(2)
}

const rawJson = fs.readFileSync(jsonPath, 'utf8')
const parsed = JSON.parse(rawJson)

const questions = Array.isArray(parsed?.questions) ? parsed.questions : null
if (!questions) {
  throw new Error('Invalid JSON: expected top-level { questions: [...] }')
}

const corpusTextRaw = corpusPath ? fs.readFileSync(corpusPath, 'utf8') : null

function normalizeWhitespace(s) {
  return String(s).replace(/\s+/g, ' ').trim()
}

const corpusText = corpusTextRaw ? normalizeWhitespace(corpusTextRaw) : null

function getCorrectIndex(letter) {
  return { A: 0, B: 1, C: 2, D: 3 }[letter] ?? -1
}

function extractQuotedFragments(text) {
  // Extract content inside double quotes: "..."
  const out = []
  const re = /"([^"\n]{2,})"/g
  let m
  while ((m = re.exec(text)) !== null) out.push(m[1])
  return out
}

function fragmentInCorpus(fragment) {
  if (!corpusText) return true
  const f = normalizeWhitespace(fragment)
  if (f.length === 0) return true

  // Support "..." (ASCII ellipsis) and Unicode ellipsis as a wildcard.
  if (f.includes('...') || f.includes('…')) {
    const escaped = f
      .replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      .replace(/\\\.\\\.\\\./g, '.*?')
      .replace(/…/g, '.*?')
    const re = new RegExp(escaped, 'i')
    return re.test(corpusText)
  }

  return corpusText.toLowerCase().includes(f.toLowerCase())
}

function normalizeForOverlap(s) {
  return String(s)
    .toLowerCase()
    .replace(/[^a-záéíóúüñ0-9\s]/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function wordSet(s) {
  const words = normalizeForOverlap(s)
    .split(' ')
    .filter((w) => w.length >= 5)
  return new Set(words)
}

function overlapCount(a, b) {
  let overlap = 0
  for (const w of a) {
    if (b.has(w)) overlap++
  }
  return overlap
}

let errors = 0
let warnings = 0
let infos = 0

const fileTag = `[${jsonPath}]`

function err(msg) {
  errors++
  console.error(`${fileTag} ERROR: ${msg}`)
}

function warn(msg) {
  warnings++
  console.warn(`${fileTag} WARN: ${msg}`)
}

function info(msg) {
  infos++
  console.log(`${fileTag} INFO: ${msg}`)
}

const dist = { A: 0, B: 0, C: 0, D: 0 }

questions.forEach((q, idx) => {
  if (!q || typeof q !== 'object') return err(`q[${idx}] is not an object`)

  if (typeof q.question !== 'string' || q.question.trim().length < 10) {
    err(`q[${idx}] missing/invalid question`)
  }
  if (!Array.isArray(q.options) || q.options.length !== 4) {
    err(`q[${idx}] options must be an array of length 4`)
  } else {
    const uniq = new Set(q.options.map((x) => String(x).trim()))
    if (uniq.size !== 4) err(`q[${idx}] options must be unique`)
  }

  if (typeof q.correctAnswer !== 'string' || !/^[A-D]$/i.test(q.correctAnswer)) {
    err(`q[${idx}] invalid correctAnswer: ${q.correctAnswer}`)
  } else {
    const letter = q.correctAnswer.toUpperCase()
    dist[letter]++
    const correctIndex = getCorrectIndex(letter)
    if (Array.isArray(q.options)) {
      if (q.options[correctIndex] == null) {
        err(`q[${idx}] correctAnswer ${letter} points outside options`)
      }
    }
  }

  if (typeof q.explanation !== 'string' || q.explanation.trim().length < 40) {
    err(`q[${idx}] missing/invalid explanation`)
  } else {
    const exp = q.explanation

    const fragments = extractQuotedFragments(exp)
    if (fragments.length === 0) err(`q[${idx}] explanation must include at least one quoted fragment`)

    const hasAnchor =
      /\bart\./i.test(exp) ||
      /\bart\u00edculo\b/i.test(exp) ||
      /\bdisposici\u00f3n\b/i.test(exp) ||
      /\bcap\u00edtulo\b/i.test(exp) ||
      /\bsecci\u00f3n\b/i.test(exp) ||
      /\bapartado\b/i.test(exp) ||
      /\bcuadro\b/i.test(exp) ||
      /\btabla\b/i.test(exp) ||
      /\banexo\b/i.test(exp) ||
      /\bgu[i\u00ed]a\b/i.test(exp)
    if (!hasAnchor) err(`q[${idx}] explanation must cite art./artículo/disposición/capítulo/sección`)

    if (corpusText) {
      fragments.forEach((frag) => {
        if (!fragmentInCorpus(frag)) {
          warn(
            `q[${idx}] quoted fragment not found in corpus: "${frag.slice(0, 80)}${frag.length > 80 ? '…' : ''}"`,
          )
        }
      })
    }

    // Heuristic overlap check: explanation should align better with the correct option than distractors.
    // Default: INFO to reduce noise; use --strict to emit WARN.
    if (Array.isArray(q.options) && q.options.length === 4 && typeof q.correctAnswer === 'string' && /^[A-D]$/i.test(q.correctAnswer)) {
      const correctIndex = getCorrectIndex(q.correctAnswer.toUpperCase())
      const eset = wordSet(exp)

      const optionSets = q.options.map((opt) => wordSet(opt))
      const overlaps = optionSets.map((oset) => overlapCount(oset, eset))

      // If the correct option is very short (e.g., "35%.") the overlap metric is not meaningful.
      if ((optionSets[correctIndex]?.size ?? 0) < 4) return

      const correctOverlap = overlaps[correctIndex] ?? 0
      const maxOverlap = Math.max(...overlaps)
      const bestIndex = overlaps.indexOf(maxOverlap)

      // Only flag when a distractor matches substantially better than the correct one.
      if (maxOverlap >= 3 && bestIndex !== correctIndex && maxOverlap >= correctOverlap + 2) {
        const msg = `q[${idx}] explanation overlaps more with option ${String.fromCharCode(65 + bestIndex)} than correct ${q.correctAnswer.toUpperCase()} (best=${maxOverlap}, correct=${correctOverlap})`
        if (strict) warn(msg)
        else info(msg)
      } else if (correctOverlap === 0 && maxOverlap > 0) {
        const msg = `q[${idx}] explanation has no lexical overlap with correct option ${q.correctAnswer.toUpperCase()} (best=${maxOverlap}, correct=0)`
        if (strict) warn(msg)
        else info(msg)
      }
    }
  }
})

console.log(
  `\n${fileTag} Checked ${questions.length} questions. dist=${JSON.stringify(dist)} errors=${errors} warnings=${warnings} infos=${infos}`,
)

process.exit(errors > 0 ? 1 : 0)
