/**
 * Utilidades de Seguridad para OpositApp
 * 
 * Incluye funciones para:
 * - Sanitización de inputs
 * - Validación de datos
 * - Prevención de inyecciones
 * - Encriptación
 */

import crypto from 'crypto'

/**
 * Sanitiza un string para prevenir XSS
 */
export function sanitizeString(input: string): string {
  if (typeof input !== 'string') return ''
  
  return input
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;')
    .trim()
}

/**
 * Sanitiza un objeto recursivamente
 */
export function sanitizeObject<T extends Record<string, any>>(obj: T): T {
  const sanitized: any = {}
  
  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === 'string') {
      sanitized[key] = sanitizeString(value)
    } else if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      sanitized[key] = sanitizeObject(value)
    } else if (Array.isArray(value)) {
      sanitized[key] = value.map(item => 
        typeof item === 'string' ? sanitizeString(item) :
        typeof item === 'object' ? sanitizeObject(item) :
        item
      )
    } else {
      sanitized[key] = value
    }
  }
  
  return sanitized as T
}

/**
 * Valida que un email sea válido
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

/**
 * Valida que un teléfono español sea válido
 */
export function isValidSpanishPhone(phone: string): boolean {
  // Formato: +34XXXXXXXXX (9 dígitos después del +34)
  const phoneRegex = /^\+34[6-9]\d{8}$/
  return phoneRegex.test(phone)
}

/**
 * Valida que una contraseña sea segura
 */
export function isValidPassword(password: string): {
  valid: boolean
  errors: string[]
} {
  const errors: string[] = []
  
  if (password.length < 8) {
    errors.push('La contraseña debe tener al menos 8 caracteres')
  }
  
  if (!/[a-z]/.test(password)) {
    errors.push('La contraseña debe contener al menos una minúscula')
  }
  
  if (!/[A-Z]/.test(password)) {
    errors.push('La contraseña debe contener al menos una mayúscula')
  }
  
  if (!/\d/.test(password)) {
    errors.push('La contraseña debe contener al menos un número')
  }
  
  if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    errors.push('La contraseña debe contener al menos un carácter especial')
  }
  
  return {
    valid: errors.length === 0,
    errors,
  }
}

/**
 * Previene SQL injection limpiando una cadena
 */
export function escapeSql(input: string): string {
  if (typeof input !== 'string') return ''
  
  return input
    .replace(/'/g, "''")
    .replace(/\\/g, '\\\\')
    .replace(/\0/g, '\\0')
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '\\r')
    .replace(/\x1a/g, '\\Z')
}

/**
 * Genera un token seguro aleatorio
 */
export function generateSecureToken(length: number = 32): string {
  return crypto.randomBytes(length).toString('hex')
}

/**
 * Hashea un valor con SHA-256
 */
export function hashValue(value: string): string {
  return crypto.createHash('sha256').update(value).digest('hex')
}

/**
 * Encripta un valor con AES-256
 */
export function encrypt(text: string, key: string): string {
  const algorithm = 'aes-256-cbc'
  const keyHash = crypto.createHash('sha256').update(key).digest()
  const iv = crypto.randomBytes(16)
  
  const cipher = crypto.createCipheriv(algorithm, keyHash, iv)
  let encrypted = cipher.update(text, 'utf8', 'hex')
  encrypted += cipher.final('hex')
  
  return iv.toString('hex') + ':' + encrypted
}

/**
 * Desencripta un valor con AES-256
 */
export function decrypt(encryptedText: string, key: string): string {
  const algorithm = 'aes-256-cbc'
  const keyHash = crypto.createHash('sha256').update(key).digest()
  
  const parts = encryptedText.split(':')
  const iv = Buffer.from(parts[0], 'hex')
  const encrypted = parts[1]
  
  const decipher = crypto.createDecipheriv(algorithm, keyHash, iv)
  let decrypted = decipher.update(encrypted, 'hex', 'utf8')
  decrypted += decipher.final('utf8')
  
  return decrypted
}

/**
 * Valida que un UUID sea válido
 */
export function isValidUUID(uuid: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
  return uuidRegex.test(uuid)
}

/**
 * Valida que un código de tema sea válido
 */
export function isValidTemaCodigo(codigo: string): boolean {
  // Formato: G1-G25 o E1-E15
  const temaRegex = /^[GE]\d{1,2}$/
  return temaRegex.test(codigo)
}

/**
 * Limita el tamaño de un string
 */
export function limitString(input: string, maxLength: number): string {
  if (typeof input !== 'string') return ''
  return input.slice(0, maxLength)
}

/**
 * Valida que un objeto tenga las propiedades requeridas
 */
export function validateRequiredFields<T extends Record<string, any>>(
  obj: T,
  requiredFields: (keyof T)[]
): { valid: boolean; missing: string[] } {
  const missing: string[] = []
  
  for (const field of requiredFields) {
    if (!(field in obj) || obj[field] === undefined || obj[field] === null) {
      missing.push(String(field))
    }
  }
  
  return {
    valid: missing.length === 0,
    missing,
  }
}

/**
 * Previene ReDoS (Regular Expression Denial of Service)
 */
export function safeRegexTest(pattern: RegExp, input: string, timeoutMs: number = 100): boolean {
  return new Promise<boolean>((resolve) => {
    const timeout = setTimeout(() => {
      resolve(false)
    }, timeoutMs)
    
    try {
      const result = pattern.test(input)
      clearTimeout(timeout)
      resolve(result)
    } catch (error) {
      clearTimeout(timeout)
      resolve(false)
    }
  }) as any
}

/**
 * Filtra caracteres peligrosos para nombres de archivo
 */
export function sanitizeFilename(filename: string): string {
  return filename
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .replace(/_{2,}/g, '_')
    .slice(0, 255)
}

/**
 * Verifica si una URL es segura (mismo dominio o lista blanca)
 */
export function isSafeUrl(url: string, allowedDomains: string[] = []): boolean {
  try {
    const parsedUrl = new URL(url)
    
    // Permitir URLs relativas
    if (url.startsWith('/')) return true
    
    // Verificar protocolo
    if (!['http:', 'https:'].includes(parsedUrl.protocol)) return false
    
    // Verificar dominio permitido
    return allowedDomains.some(domain => parsedUrl.hostname.endsWith(domain))
  } catch {
    return false
  }
}

/**
 * Genera un CSRF token
 */
export function generateCsrfToken(): string {
  return generateSecureToken(32)
}

/**
 * Verifica un CSRF token
 */
export function verifyCsrfToken(token: string, expected: string): boolean {
  if (!token || !expected) return false
  
  // Comparación de tiempo constante para prevenir timing attacks
  const tokenBuffer = Buffer.from(token, 'utf8')
  const expectedBuffer = Buffer.from(expected, 'utf8')
  
  if (tokenBuffer.length !== expectedBuffer.length) return false
  
  return crypto.timingSafeEqual(tokenBuffer, expectedBuffer)
}

/**
 * Sanitiza datos de entrada de formularios
 */
export function sanitizeFormData(data: Record<string, any>): Record<string, any> {
  const sanitized: Record<string, any> = {}
  
  for (const [key, value] of Object.entries(data)) {
    if (typeof value === 'string') {
      // Sanitizar strings
      sanitized[key] = sanitizeString(value)
    } else if (typeof value === 'number') {
      // Validar números
      sanitized[key] = isFinite(value) ? value : 0
    } else if (typeof value === 'boolean') {
      sanitized[key] = Boolean(value)
    } else if (Array.isArray(value)) {
      // Sanitizar arrays
      sanitized[key] = value.map(item => 
        typeof item === 'string' ? sanitizeString(item) : item
      )
    } else if (typeof value === 'object' && value !== null) {
      // Recursivo para objetos
      sanitized[key] = sanitizeFormData(value)
    }
  }
  
  return sanitized
}

/**
 * Valida que un número esté en un rango
 */
export function isInRange(value: number, min: number, max: number): boolean {
  return typeof value === 'number' && value >= min && value <= max
}

/**
 * Previene prototype pollution
 */
export function isSafeKey(key: string): boolean {
  const dangerousKeys = ['__proto__', 'constructor', 'prototype']
  return !dangerousKeys.includes(key)
}

/**
 * Merge seguro de objetos (previene prototype pollution)
 */
export function safeMerge<T extends Record<string, any>>(
  target: T,
  source: Partial<T>
): T {
  const result = { ...target }
  
  for (const [key, value] of Object.entries(source)) {
    if (isSafeKey(key)) {
      result[key as keyof T] = value as T[keyof T]
    }
  }
  
  return result
}
