import { appendFile, stat } from "node:fs/promises"
import { join } from "node:path"

const ARCHIVO_BITACORA = "bitacora-ia.md"
const ENCABEZADO =
  "# Bitácora de prompts (IA)\n\nCada entrada corresponde a un prompt enviado por el usuario.\n\n"

const PATRONES_CREDENCIALES = [
  [
    /((?:contrasena|contraseña|clave|secreto|credencial|password|passwd|pwd|secret|token|api[_-]?key|apikey|access[_-]?key|private[_-]?key|client[_-]?secret|authorization|credential)\w*\s*[:=]\s*)(\S+)/gi,
    "$1[REDACTADO]",
  ],
  [/\b(bearer\s+)[A-Za-z0-9._~+/=-]{8,}/gi, "$1[REDACTADO]"],
  [/\bAKIA[0-9A-Z]{16}\b/g, "[REDACTADO]"],
  [/\bgh[pousr]_[A-Za-z0-9]{20,}\b/g, "[REDACTADO]"],
  [/\bgithub_pat_[A-Za-z0-9_]{20,}\b/g, "[REDACTADO]"],
  [/\beyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\b/g, "[REDACTADO]"],
  [/\bsb_(?:publishable|secret)_[A-Za-z0-9]{10,}\b/g, "[REDACTADO]"],
  [/\bsk-[A-Za-z0-9_-]{20,}\b/g, "[REDACTADO]"],
]

const ocultarCredenciales = (texto) =>
  PATRONES_CREDENCIALES.reduce(
    (acumulado, [patron, reemplazo]) => acumulado.replace(patron, reemplazo),
    texto,
  )

const formatearFecha = (milisegundos) => {
  const fecha = new Date(milisegundos)
  const dos = (numero) => String(numero).padStart(2, "0")
  return `${fecha.getFullYear()}-${dos(fecha.getMonth() + 1)}-${dos(fecha.getDate())} ${dos(fecha.getHours())}:${dos(fecha.getMinutes())}:${dos(fecha.getSeconds())}`
}

export const BitacoraIA = async ({ directory }) => {
  const mensajesUsuario = new Map()
  const partesRegistradas = new Set()
  const rutaBitacora = join(directory, ARCHIVO_BITACORA)

  const escribir = async (entrada) => {
    try {
      let existe = true
      try {
        await stat(rutaBitacora)
      } catch {
        existe = false
      }
      await appendFile(rutaBitacora, existe ? entrada : ENCABEZADO + entrada, "utf8")
    } catch (error) {
      console.error(`[bitacora-ia] No se pudo escribir la bitácora: ${error.message}`)
    }
  }

  return {
    event: async ({ event }) => {
      try {
        if (event.type === "message.updated") {
          const info = event.properties.info
          if (info.role === "user") {
            mensajesUsuario.set(info.id, info.time?.created ?? Date.now())
          }
          return
        }

        if (event.type !== "message.part.updated") return

        const part = event.properties.part
        if (part.type !== "text") return
        if (part.synthetic === true || part.ignored === true) return
        if (!mensajesUsuario.has(part.messageID)) return
        if (partesRegistradas.has(part.id)) return

        const texto = typeof part.text === "string" ? part.text.trim() : ""
        if (texto === "") return

        partesRegistradas.add(part.id)

        const creada = mensajesUsuario.get(part.messageID) ?? Date.now()
        const textoSeguro = ocultarCredenciales(texto)
        const entrada =
          `## ${formatearFecha(creada)}\n\n` +
          `- Sesion: ${part.sessionID}\n` +
          `- Mensaje: ${part.messageID}\n\n` +
          `${textoSeguro}\n\n---\n\n`

        await escribir(entrada)
      } catch (error) {
        console.error(`[bitacora-ia] Error al procesar el evento: ${error.message}`)
      }
    },
  }
}
