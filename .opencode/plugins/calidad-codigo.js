import { existsSync } from "node:fs"
import { isAbsolute, join } from "node:path"

const HERRAMIENTAS_DE_ESCRITURA = new Set(["write", "edit", "patch"])
const ARCHIVO_JS = /\.(js|jsx)$/i

export const CalidadCodigo = async ({ $, directory }) => {
  const enRevision = new Set()

  return {
    "tool.execute.after": async (input, output) => {
      const ruta = typeof input.args?.filePath === "string" ? input.args.filePath : null

      try {
        if (!HERRAMIENTAS_DE_ESCRITURA.has(input.tool)) return
        if (ruta === null || !ARCHIVO_JS.test(ruta)) return
        if (enRevision.has(ruta)) return

        enRevision.add(ruta)
        try {
          const rutaAbsoluta = isAbsolute(ruta) ? ruta : join(directory, ruta)
          if (!existsSync(rutaAbsoluta)) return

          const resultado = await $`npx oxlint --deny-warnings ${rutaAbsoluta}`.nothrow()
          if (resultado.exitCode === 0) return

          const diagnostico = `${resultado.stdout ?? ""}${resultado.stderr ?? ""}`.trim()
          output.output += [
            "",
            "",
            `[calidad-codigo] oxlint encontró problemas en ${ruta} (código de salida ${resultado.exitCode}).`,
            diagnostico || "(sin salida detallada)",
            "Corrige estos problemas antes de continuar.",
          ].join("\n")
          output.metadata = {
            ...output.metadata,
            calidad_codigo: { ruta, exitCode: resultado.exitCode, ok: false },
          }
        } finally {
          enRevision.delete(ruta)
        }
      } catch (error) {
        output.output += `\n\n[calidad-codigo] No se pudo ejecutar oxlint sobre ${ruta}: ${error.message}`
      }
    },
  }
}
