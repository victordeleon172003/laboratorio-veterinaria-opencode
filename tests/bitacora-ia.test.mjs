import assert from "node:assert/strict"
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { BitacoraIA } from "../.opencode/plugins/bitacora-ia.js"

const crearMensajeActualizado = (overrides = {}) => ({
  type: "message.updated",
  properties: {
    info: {
      id: "msg_1",
      sessionID: "ses_1",
      role: "user",
      time: { created: 1733000000000 },
      agent: "general",
      model: { providerID: "test", modelID: "test" },
      ...overrides.info,
    },
  },
})

const crearParteTexto = (overrides = {}) => ({
  type: "message.part.updated",
  properties: {
    part: {
      id: "part_1",
      messageID: "msg_1",
      sessionID: "ses_1",
      type: "text",
      text: "Hola mundo",
      ...overrides.part,
    },
  },
})

async function ejecutar() {
  const dir = mkdtempSync(join(tmpdir(), "bitacora-ia-"))
  let contador = 0

  function probar(nombre, fn) {
    contador += 1
    return Promise.resolve().then(fn).then(() => console.log(`ok ${contador} - ${nombre}`))
  }

  try {
    await probar("crea archivo y escribe encabezado con la primera entrada", async () => {
      const hooks = await BitacoraIA({ directory: dir })
      await hooks.event({ event: crearMensajeActualizado() })
      await hooks.event({ event: crearParteTexto() })
      const contenido = readFileSync(join(dir, "bitacora-ia.md"), "utf8")
      assert.ok(contenido.includes("# Bitácora de prompts (IA)"))
      assert.ok(contenido.includes("Hola mundo"))
      const creada = new Date(1733000000000)
      const dos = (n) => String(n).padStart(2, "0")
      const esperado = `${creada.getFullYear()}-${dos(creada.getMonth() + 1)}-${dos(creada.getDate())} ${dos(creada.getHours())}:${dos(creada.getMinutes())}:${dos(creada.getSeconds())}`
      assert.ok(contenido.includes(esperado))
      assert.ok(contenido.includes("Sesion: ses_1"))
    })

    await probar("no registra mensajes del asistente", async () => {
      const hooks = await BitacoraIA({ directory: dir })
      await hooks.event({
        event: crearMensajeActualizado({ info: { role: "assistant", id: "msg_a" } }),
      })
      await hooks.event({
        event: crearParteTexto({
          part: { id: "part_a", messageID: "msg_a", text: "Respuesta del asistente" },
        }),
      })
      const contenido = readFileSync(join(dir, "bitacora-ia.md"), "utf8")
      assert.ok(!contenido.includes("Respuesta del asistente"))
    })

    await probar("no vuelve a registrar una parte ya registrada", async () => {
      const hooks = await BitacoraIA({ directory: dir })
      await hooks.event({
        event: crearMensajeActualizado({ info: { id: "msg_2", time: { created: 1733010000000 } } }),
      })
      await hooks.event({ event: crearParteTexto({ part: { id: "part_dup", messageID: "msg_2", text: "Primer texto" } }) })
      await hooks.event({ event: crearParteTexto({ part: { id: "part_dup", messageID: "msg_2", text: "Texto duplicado" } }) })
      const contenido = readFileSync(join(dir, "bitacora-ia.md"), "utf8")
      const coincidencias = (contenido.match(/Primer texto/g) || []).length
      assert.equal(coincidencias, 1)
      assert.ok(!contenido.includes("Texto duplicado"))
    })

    await probar("omite texto vacío o partes artificiales", async () => {
      const hooks = await BitacoraIA({ directory: dir })
      await hooks.event({ event: crearMensajeActualizado({ info: { id: "msg_3" } }) })
      await hooks.event({ event: crearParteTexto({ part: { id: "part_vacio", messageID: "msg_3", text: "   " } }) })
      await hooks.event({
        event: crearParteTexto({ part: { id: "part_sint", messageID: "msg_3", text: "oculto", synthetic: true } }),
      })
      await hooks.event({
        event: crearParteTexto({ part: { id: "part_ign", messageID: "msg_3", text: "ignorado", ignored: true } }),
      })
      const contenido = readFileSync(join(dir, "bitacora-ia.md"), "utf8")
      assert.ok(!contenido.includes("oculto"))
      assert.ok(!contenido.includes("ignorado"))
    })

    await probar("no registra si no hay mensaje de usuario previo", async () => {
      const hooks = await BitacoraIA({ directory: dir })
      await hooks.event({
        event: crearParteTexto({ part: { id: "part_orfa", messageID: "msg_inexistente", text: "sin contexto" } }),
      })
      const contenido = readFileSync(join(dir, "bitacora-ia.md"), "utf8")
      assert.ok(!contenido.includes("sin contexto"))
    })

    await probar("oculta credenciales comunes", async () => {
      const hooks = await BitacoraIA({ directory: dir })
      await hooks.event({ event: crearMensajeActualizado({ info: { id: "msg_cred" } }) })
      await hooks.event({
        event: crearParteTexto({
          part: {
            id: "part_cred",
            messageID: "msg_cred",
            text: "contrasena: supersecreto123\nsk-proj-ABCDEF1234567890123456789012345678\nsb_secret_1234567890abcdefghijkl",
          },
        }),
      })
      const contenido = readFileSync(join(dir, "bitacora-ia.md"), "utf8")
      const redacciones = (contenido.match(/\[REDACTADO\]/g) || []).length
      assert.ok(contenido.includes("contrasena: [REDACTADO]"))
      assert.ok(redacciones >= 3)
      assert.ok(!contenido.includes("supersecreto123"))
      assert.ok(!contenido.includes("ABCDEF1234567890123456789012345678"))
      assert.ok(!contenido.includes("sb_secret_1234567890abcdefghijkl"))
    })

    await probar("no lanza si la escritura de la bitácora falla", async () => {
      const rutaInvalida = join(dir, "archivo-no-directorio.txt")
      rmSync(rutaInvalida, { force: true })
      writeFileSync(rutaInvalida, "soy un archivo")
      const errorOriginal = console.error
      console.error = () => {}
      try {
        const hooks = await BitacoraIA({ directory: rutaInvalida })
        await hooks.event({ event: crearMensajeActualizado({ info: { id: "msg_fallo" } }) })
        await hooks.event({
          event: crearParteTexto({ part: { id: "part_fallo", messageID: "msg_fallo", text: "prueba" } }),
        })
      } finally {
        console.error = errorOriginal
      }
    })

    console.log(`\n${contador} pruebas de bitacora-ia: todas pasaron.`)
  } catch (error) {
    console.error("Fallo en las pruebas de bitacora-ia:")
    console.error(error)
    process.exitCode = 1
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
}

ejecutar()
