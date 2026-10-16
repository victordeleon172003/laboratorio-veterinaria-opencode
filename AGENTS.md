# AGENTS.md

## Proyecto

- Plantilla Vite + React 19 en **JavaScript/JSX** (no TypeScript). No migrar a TS salvo que se pida.
- Entrypoint: `src/main.jsx` → `src/App.jsx`. Estilo en `src/index.css` y `src/App.css`. Estáticos en `public/` (p. ej. `icons.svg`, referenciado con `/icons.svg#...`).
- **Objetivo activo: Sistema de Citas Veterinarias** (Laboratorio 23 de Programación Comercial), desarrollado con Spec-Driven Development (SDD). Stack obligatorio: React, Vite, JavaScript y Supabase mediante `@supabase/supabase-js`.
- `@supabase/supabase-js` está en `dependencies` pero **aún no se usa**: no hay cliente Supabase ni archivos `.env`. Si se añade, crear el cliente en un módulo propio bajo `src/` y usar prefijo `VITE_` en las variables (Vite solo expone esas al cliente). `*.local` está en `.gitignore` (usar `.env.local` para secretos locales).
- React Compiler no está habilitado (decisión de la plantilla, ver `README.md`).

## Laboratorio 23 — planificación (nada implementado aún)

**Fase actual: solo planificación.** No crear plugins, subagentes, specs, tablas ni componentes de frontend hasta que se indique.

### Modelo de datos (por crear)

| tabla | columnas | llave foránea |
|---|---|---|
| `propietarios` | id, nombre, telefono, correo | — |
| `mascotas` | id, nombre, especie, raza, propietario_id | `propietario_id` → `propietarios.id` |
| `citas` | id, mascota_id, fecha, motivo, estado | `mascota_id` → `mascotas.id` |

Las tablas las crea el subagente `arquitecto-bd` (vía MCP de Supabase), no a mano.

### Flujo SDD

- Dos specs con **exactamente estas 6 secciones**:
  1. Objetivo en una frase.
  2. Alcance.
  3. Modelo de datos (spec 01) / Interfaz y componentes del frontend (spec 02).
  4. Plan de implementación.
  5. Criterios de aceptación.
  6. Decisiones tomadas y descartadas.
- Rutas fijas: `specs/01-modelo-datos.md` y `specs/02-frontend.md`.
- **Regla**: cada spec debe estar confirmada (commiteada) en Git **antes** de implementar su alcance.

### Hooks planificados → `.opencode/plugins/*.js`

En OpenCode los "hooks" son plugins JS auto-cargados de `.opencode/plugins/` (sin `npm install` si no importan dependencias externas):

1. **guardian-bd** — `tool.execute.before`: si la herramienta pertenece al MCP de Supabase y el SQL contiene `DROP TABLE`, `DROP SCHEMA`, `TRUNCATE` o `DELETE` sin `WHERE`, hacer `throw new Error(motivo)` para bloquear la llamada y explicar por qué.
2. **calidad-codigo** — `tool.execute.after`: si se creó o editó un `.js`/`.jsx`, ejecutar oxlint sobre el archivo con la shell `$` y comunicar los errores al agente para que los corrija.
3. **bitacora-ia** — hook `event`: registrar cada prompt del usuario con fecha y hora en `bitacora-ia.md`, dentro de `try/catch` para nunca bloquear. **`bitacora-ia.md` se versiona con Git** como evidencia del uso de inteligencia artificial.

### Subagentes planificados → `.opencode/agents/<nombre>.md` (`mode: subagent`)

Permisos mínimos necesarios:

- **arquitecto-bd**: `edit: deny`, `bash: deny`; solo MCP de Supabase y lectura de specs. Crea tablas, llaves foráneas, GRANT y registros de ejemplo; verifica con `list_tables`; no modifica archivos del proyecto.
- **revisor-spec**: `edit: deny`, `bash: deny`. Comprueba los criterios de aceptación de las specs y reporta cuáles cumplen o no con archivo y línea; no modifica archivos.
- **verificador**: `edit: deny`; `bash` con allow **solo** para `npm run lint` y `npm run build` (en `permission.bash` la regla `"*": "deny"` va primero y las específicas al final: OpenCode evalúa la última coincidencia). Verifica con `SELECT` que los registros creados desde la aplicación existen en Supabase; solo reporta resultados.

### Configuración previa pendiente

- Crear `opencode.json` con `"$schema": "https://opencode.ai/config.json"` y el MCP de Supabase (`mcp.supabase`, `type: "remote"`).
- Autenticación MCP: **OAuth automático de OpenCode** (tokens guardados en `~/.local/share/opencode/mcp-auth.json`, fuera del repo; se lanza con `opencode mcp auth supabase`) o, si el servidor exige API key, header con `{env:VAR}`. **Nunca tokens ni contraseñas en Git.**
- Restringir herramientas MCP por subagente con `tools` (globs `supabase_*`) en su configuración, si aplica.
- La configuración de OpenCode **no se recarga en caliente**: reiniciar OpenCode tras crear o cambiarla.

## Comandos

```bash
npm run dev      # servidor de desarrollo con HMR
npm run build    # build de producción (vite build)
npm run lint     # oxlint
npm run preview  # sirve el build de dist/ (requiere build previo)
```

- **No hay** scripts de test, typecheck ni CI (`.github/` no existe). No inventar comandos de verificación: verificar con `npm run lint` y `npm run build`.
- Orden recomendado tras cambios: `npm run lint` → `npm run build`.

## Lint

- Config en `.oxlintrc.json`: plugins `react` y `oxc`; `react/rules-of-hooks` es **error**.
- Oxlint no formatea: el formato lo decide Vite/el editor; no introducir Prettier u otros formateadores sin pedirlo.

## Convenciones

- Responder siempre en español.
- Antes de cambios grandes, explicar brevemente el plan.
- No instalar dependencias sin pedir autorización.
- Explicar el motivo de cada decisión técnica.
- Indicar qué archivos fueron modificados y cómo probar los cambios.
