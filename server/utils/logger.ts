import winston from 'winston'
import DailyRotateFile from 'winston-daily-rotate-file'

// Extraer los formatos que necesitamos
const { combine, timestamp, printf, colorize, json, errors } = winston.format

// Filtro de enmascaramiento de datos sensibles
const redactFormat = winston.format((info) => {
  const SENSITIVE_KEYS = ['password', 'token', 'passwordhash', 'jwt', 'auth_token']
  
  const redact = (obj: any, depth = 0) => {
    if (!obj || typeof obj !== 'object' || depth > 5) return
    for (const key of Object.keys(obj)) {
      if (SENSITIVE_KEYS.includes(key.toLowerCase())) {
        obj[key] = '[REDACTED]'
      } else if (typeof obj[key] === 'object') {
        redact(obj[key], depth + 1)
      }
    }
  }

  redact(info)
  return info
})

// Formato personalizado para la consola (desarrollo humano)
const consoleFormat = combine(
  redactFormat(),
  colorize(),
  timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  printf(({ level, message, timestamp, stack, ...meta }) => {
    // Si es una petición HTTP, darle un formato especial y limpio en la consola
    if (level.includes('http') && meta.statusCode) {
      // Usar colores ANSI para el status code
      const color = meta.statusCode >= 500 ? '\x1b[31m' : meta.statusCode >= 400 ? '\x1b[33m' : '\x1b[32m'
      const reset = '\x1b[0m'
      return `[${timestamp}] [${level}] ${message} - ${color}${meta.statusCode}${reset} (${meta.responseTimeMs}ms)`
    }
    
    let log = `[${timestamp}] [${level}] ${message}`
    
    // Si hay un error y tiene StackTrace, añadirlo visualmente
    if (stack) {
      log += `\n      ↳ ${stack}`
    } else if (Object.keys(meta).length > 0) {
      // Solo mostramos metadata extra en la consola si es WARN o ERROR, para no hacer ruido
      if (level.includes('warn') || level.includes('error')) {
        log += `\n      ↳ Datos Adicionales: ${JSON.stringify(meta)}`
      }
    }
    
    return log
  })
)

// Formato para los archivos (máquina / JSON)
const fileFormat = combine(
  redactFormat(),
  timestamp(),
  errors({ stack: true }), // Asegura que el stack se vuelva string dentro del JSON
  json()
)

// Configurar los transportes (donde se guardan los logs)
const transports = []

// Transporte 1: Archivo de Errores Críticos (Rota diariamente)
transports.push(
  new DailyRotateFile({
    filename: 'logs/error-%DATE%.log',
    datePattern: 'YYYY-MM-DD',
    level: 'error',
    maxFiles: '14d', // Mantener por 14 días
    format: fileFormat,
  })
)

// Transporte 2: Archivo General (Todo el tráfico)
transports.push(
  new DailyRotateFile({
    filename: 'logs/combined-%DATE%.log',
    datePattern: 'YYYY-MM-DD',
    maxFiles: '14d',
    format: fileFormat,
  })
)

// Transporte 3: Consola (para desarrollo y logs efímeros de Render/Docker)
transports.push(
  new winston.transports.Console({
    format: consoleFormat,
  })
)

// Exportar la instancia del logger
export const logger = winston.createLogger({
  level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
  transports,
  // Para evitar que una excepción no capturada tumbe el Node de forma ruidosa sin guardar
  exceptionHandlers: [
    new DailyRotateFile({
      filename: 'logs/exceptions-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      maxFiles: '14d',
      format: fileFormat,
    }),
    new winston.transports.Console({ format: consoleFormat })
  ],
  rejectionHandlers: [
    new DailyRotateFile({
      filename: 'logs/rejections-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      maxFiles: '14d',
      format: fileFormat,
    }),
    new winston.transports.Console({ format: consoleFormat })
  ]
})
