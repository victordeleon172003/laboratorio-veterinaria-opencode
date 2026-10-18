import assert from "node:assert/strict"
import { spawnSync } from "node:child_process"
import { mkdtempSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { CalidadCodigo } from "../.opencode/plugins/calidad-codigo.js"

function unirPlantilla(plantillas, valores) {
  return plantillas.reduce(
    (acc, parte, i) => acc + parte + (i < valores.length ? String(valores[i]) : ""),
    "",
  )
}

function crearShellMock({ stdout = "", stderr = "", exitCode = 0, retardoMs = 0 } = {}) {
  const llamadas = []
  const $ = (plantillas, ...valores) => {
    llamadas.push(unirPlantilla(plantillas, valores))
    const espera =
      retardoMs > 0 ? new Promise((resolve) => setTimeout(resolve, retardoMs)) : Promise.resolve()
    return {
      nothrow: () => espera.then(() => ({ stdout, stderr, exitCode })),
    }
  }
  return { $, llamadas }
}

function shellReal(plantillas, ...valores) {
  const comando = unirPlantilla(plantillas, valores)
  const resultado = spawnSync(comando, { shell: true, encoding: "utf8", windowsHide: true })
  return {
    nothrow: () =>
      Promise.resolve({
        stdout: resultado.stdout ?? "",
        stderr: resultado.stderr ?? "",
        exitCode: resultado.status ?? 1,
      }),
  }
}

const crearOutput = (texto = "resultado de la herramienta") => ({
  title: "edit",
  output: texto,
  metadata: {},
})

const dir = mkdtempSync(join(tmpdir(), "calidad-codigo-"))
let contador = 0

function probar(nombre, funcion) {
  contador += 1
  return Promise.resolve()
    .then(funcion)
    .then(() => console.log(`ok ${contador} - ${nombre}`))
}

async function principal() {
  await probar("ignora herramientas que no crean ni modifican archivos", async () => {
    const { $, llamadas } = crearShellMock({ exitCode: 1 })
    const hooks = await CalidadCodigo({ $, directory: dir })
    const output = crearOutput()
    await hooks["tool.execute.after"](
      { tool: "read", args: { filePath: join(dir, "App.jsx") } },
      output,
    )
    assert.equal(llamadas.length, 0)
    assert.equal(output.output, "resultado de la herramienta")
  })

  await probar("ignora archivos que no son .js ni .jsx", async () => {
    const ruta = join(dir, "estilos.css")
    writeFileSync(ruta, "body { color: red; }")
    const { $, llamadas } = crearShellMock({ exitCode: 1 })
    const hooks = await CalidadCodigo({ $, directory: dir })
    const output = crearOutput()
    await hooks["tool.execute.after"]({ tool: "write", args: { filePath: ruta } }, output)
    assert.equal(llamadas.length, 0)
    assert.equal(output.output, "resultado de la herramienta")
  })

  await probar("ignora archivos inexistentes", async () => {
    const { $, llamadas } = crearShellMock({ exitCode: 1 })
    const hooks = await CalidadCodigo({ $, directory: dir })
    const output = crearOutput()
    await hooks["tool.execute.after"](
      { tool: "write", args: { filePath: join(dir, "fantasma.jsx") } },
      output,
    )
    assert.equal(llamadas.length, 0)
  })

  await probar("ejecuta oxlint y comunica los errores al agente", async () => {
    const ruta = join(dir, "malo.jsx")
    writeFileSync(ruta, "export function Malo() { debugger; return null }")
    const diagnostico = "malo.jsx:1:26: warning eslint(no-debugger): `debugger` statement is not allowed"
    const { $, llamadas } = crearShellMock({ stdout: diagnostico, exitCode: 1 })
    const hooks = await CalidadCodigo({ $, directory: dir })
    const output = crearOutput()
    await hooks["tool.execute.after"]({ tool: "edit", args: { filePath: ruta } }, output)
    assert.equal(llamadas.length, 1)
    assert.ok(llamadas[0].includes("oxlint --deny-warnings"))
    assert.ok(llamadas[0].includes("malo.jsx"))
    assert.ok(output.output.includes("[calidad-codigo]"))
    assert.ok(output.output.includes("no-debugger"))
    assert.ok(output.output.includes("Corrige estos problemas"))
    assert.equal(output.metadata.calidad_codigo.ok, false)
    assert.equal(output.metadata.calidad_codigo.exitCode, 1)
  })

  await probar("no toca el resultado cuando el archivo está limpio", async () => {
    const ruta = join(dir, "bien.jsx")
    writeFileSync(ruta, "export function Bien() { return null }")
    const { $, llamadas } = crearShellMock({ stdout: "", exitCode: 0 })
    const hooks = await CalidadCodigo({ $, directory: dir })
    const output = crearOutput()
    await hooks["tool.execute.after"]({ tool: "write", args: { filePath: ruta } }, output)
    assert.equal(llamadas.length, 1)
    assert.equal(output.output, "resultado de la herramienta")
    assert.deepEqual(output.metadata, {})
  })

  await probar("evita ejecuciones recursivas o duplicadas sobre el mismo archivo", async () => {
    const ruta = join(dir, "malo.jsx")
    const { $, llamadas } = crearShellMock({ stdout: "error", exitCode: 1, retardoMs: 80 })
    const hooks = await CalidadCodigo({ $, directory: dir })
    const salidaA = crearOutput()
    const salidaB = crearOutput()
    await Promise.all([
      hooks["tool.execute.after"]({ tool: "edit", args: { filePath: ruta } }, salidaA),
      hooks["tool.execute.after"]({ tool: "edit", args: { filePath: ruta } }, salidaB),
    ])
    assert.equal(llamadas.length, 1)
    assert.ok(salidaA.output.includes("[calidad-codigo]"))
    assert.equal(salidaB.output, "resultado de la herramienta")
  })

  await probar("integración real: oxlint detecta un error en un archivo temporal", async () => {
    const ruta = join(dir, "integracion.jsx")
    writeFileSync(ruta, "export function Integracion() { debugger; return null }")
    const hooks = await CalidadCodigo({ $: shellReal, directory: dir })
    const output = crearOutput()
    await hooks["tool.execute.after"]({ tool: "write", args: { filePath: ruta } }, output)
    assert.ok(output.output.includes("[calidad-codigo]"))
    assert.ok(output.output.includes("no-debugger"))
    assert.equal(output.metadata.calidad_codigo.exitCode, 1)
  })

  await probar("integración real: archivo limpio no genera aviso", async () => {
    const ruta = join(dir, "integracion-limpia.jsx")
    writeFileSync(ruta, "export function IntegracionLimpia() { return null }")
    const hooks = await CalidadCodigo({ $: shellReal, directory: dir })
    const output = crearOutput()
    await hooks["tool.execute.after"]({ tool: "write", args: { filePath: ruta } }, output)
    assert.equal(output.output, "resultado de la herramienta")
    assert.deepEqual(output.metadata, {})
  })

  console.log(`\n${contador} pruebas de calidad-codigo: todas pasaron.`)
}

principal().catch((error) => {
  console.error("Fallo en las pruebas de calidad-codigo:")
  console.error(error)
  process.exitCode = 1
}).finally(() => {
  rmSync(dir, { recursive: true, force: true })
})
