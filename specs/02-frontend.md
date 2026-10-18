# 1. Objetivo en una frase

Definir la interfaz del frontend del Sistema de Citas Veterinarias (Laboratorio 23) que consuma los datos de las tablas `propietarios`, `mascotas` y `citas` desde Supabase y permita registrar nuevas citas, con una UI sencilla, responsiva y verificable.

# 2. Alcance

- Crear el cliente de Supabase en `src/lib/supabaseClient.js` usando `@supabase/supabase-js` con las variables de entorno `VITE_SUPABASE_URL` y `VITE_SUPABASE_PUBLISHABLE_KEY` (leídas vía `import.meta.env`).
- Crear `src/.env.local`/`.env.local` en la raíz con dichas variables; `*.local` ya está en `.gitignore` y **nunca** se subirá a Git.
- Listar los registros de las tres tablas: propietarios (nombre, teléfono, correo), mascotas (nombre, especie, raza y **nombre del propietario**), citas (fecha, motivo, estado y **nombre de la mascota**, nunca solo su ID).
- Mostrar formulario para crear nuevas citas: desplegable de mascotas (nombre, sin escribir ID manualmente), campos de fecha, motivo y estado.
- Guardar realmente las citas en Supabase (`INSERT`) y actualizar el listado tras el registro.
- Mostrar mensajes sencillos de éxito y error al usuario.
- Interfaz sencilla, agradable, ordenada y responsiva (mobile-first).
- Utilizar los datos de ejemplo ya existentes en Supabase (no se insertan datos adicionales desde el código).
- **No incluye:** autenticación, edición ni borrado de registros, RLS, nuevos triggers/RPC, cambios de esquema, migración a TypeScript ni enrutamiento con librerías externas.

# 3. Interfaz y componentes del frontend

## Estructura de archivos propuesta

```
src/
├── lib/
│   └── supabaseClient.js      # createClient(...) con import.meta.env
├── components/
│   ├── ListaPropietarios.jsx  # listado de propietarios
│   ├── ListaMascotas.jsx      # listado de mascotas con propietario
│   ├── ListaCitas.jsx         # listado de citas con mascota
│   ├── FormularioCita.jsx     # formulario de nueva cita
│   └── Mensaje.jsx            # mensaje de éxito/error
├── App.jsx                    # orquesta carga de datos y composición
├── main.jsx                   # entrypoint (sin cambios estructurales)
└── index.css / App.css        # estilos responsivos
```

## Componentes y responsabilidades

| Componente | Responsabilidad |
|---|---|
| `App.jsx` | Montar el cliente, cargar las tres tablas en paralelo (`Promise.all`), manejar estados de carga y error, refrescar citas tras un INSERT exitoso. |
| `ListaPropietarios` | Renderizar tabla/tarjetas: nombre, teléfono, correo. |
| `ListaMascotas` | Renderizar nombre, especie, raza y **nombre del propietario** (obtenido con JOIN o combinando por `propietario_id`). |
| `ListaCitas` | Renderizar fecha, motivo, estado y **nombre de la mascota** (nunca solo `mascota_id`). |
| `FormularioCita` | Select de mascotas (etiqueta = nombre + especie, value = id), `input` tipo `datetime-local` para fecha, `input` texto para motivo, `select` de estado (`programada` por defecto; opciones: `programada`, `completada`, `cancelada`). Al enviar: validar, convertir la fecha a ISO 8601, hacer `INSERT` en `citas`, notificar éxito y pedir a `App` que recargue la lista. |
| `Mensaje` | Mostrar mensaje de éxito (verde) o error (rojo) de forma efímera/simple. |

## Consultas a Supabase

- **Mascotas con propietario:** `select('*, propietarios(nombre)')` (foreign table join) o `select('*, propietarios:id(nombre)')` según conveniencia de `supabase-js`.
- **Citas con mascota:** `select('*, mascotas(nombre)')` ordenado por `fecha`.
- **Select del formulario:** `select('id, nombre, especie')` de `mascotas` ordenado por nombre.
- **Alta de cita:** `insert({ mascota_id, fecha, motivo, estado })` con `select().single()` para confirmar la fila creada.

## Comportamiento de la interfaz

- Estados visibles: cargando…, error de red/consulta, éxito al guardar, error de validación o de Supabase.
- Validación mínima del formulario: mascota requerida, fecha requerida, motivo no vacío.
- Diseño responsivo: columnas apiladas en móvil, rejilla en escritorio; tipografía y espaciado legibles.
- Después de un `INSERT` exitoso: limpiar el formulario, mostrar mensaje de éxito y refrescar la lista de citas.

# 4. Plan de implementación

1. Aprobar esta especificación (`specs/02-frontend.md`) y hacer **commit antes de implementar** su alcance (regla SDD del laboratorio).
2. Crear `.env.local` en la raíz con `VITE_SUPABASE_URL` y `VITE_SUPABASE_PUBLISHABLE_KEY` (publishable key, **nunca** secret key); verificar que `.gitignore` cubre `*.local`.
3. Crear `src/lib/supabaseClient.js` exportando una única instancia `createClient(...)`.
4. Implementar los componentes en `src/components/` y conectarlos en `App.jsx`, manteniendo la entrada `main.jsx`.
5. Aplicar estilos responsivos en `index.css`/`App.css` (sin librerías de UI externas nuevas, salvo autorización).
6. Ejecutar `npm run lint` (oxlint) y corregir hallazgos.
7. Ejecutar `npm run build` y corregir hallazgos.
8. Invocar al subagente `@verificador` para `npm run lint`, `npm run build` y verificación con `SELECT` en Supabase de la cita creada desde la aplicación.
9. Commit final del frontend una vez aprobada la verificación.

# 5. Criterios de aceptación

| # | Criterio | Cómo se verifica |
|---|----------|------------------|
| 1 | `specs/02-frontend.md` existe con las 6 secciones obligatorias. | Leer el archivo y comprobar los títulos «1. Objetivo en una frase», «2. Alcance», «3. Interfaz y componentes del frontend», «4. Plan de implementación», «5. Criterios de aceptación», «6. Decisiones tomadas y descartadas». |
| 2 | Existe `src/lib/supabaseClient.js` que usa `createClient` con `VITE_SUPABASE_URL` y `VITE_SUPABASE_PUBLISHABLE_KEY`. | Leer el archivo; comprobar `import.meta.env.VITE_...` y ausencia de valores literales. |
| 3 | No hay llaves secretas en el código ni en Git. | `grep` en `src/` sin coincidencias de `sb_secret_` ni JWT; `git status`/`git check-ignore .env.local` confirma que `.env.local` no se versiona. |
| 4 | Se listan los propietarios con nombre, teléfono y correo. | Ejecutar la app y contrastar con `SELECT * FROM propietarios` en Supabase. |
| 5 | Se listan las mascotas mostrando el **nombre del propietario** de cada una. | UI muestra nombre de propietario; contrastar con JOIN `mascotas → propietarios`. |
| 6 | Se listan las citas mostrando el **nombre de la mascota** (no solo el ID), fecha, motivo y estado. | UI de la lista de citas sin IDs sueltos; contrastar con JOIN `citas → mascotas`. |
| 7 | El formulario usa un desplegable de mascotas cargado desde Supabase con el nombre de cada mascota. | Inspeccionar el `select` y su origen (`from('mascotas')`). |
| 8 | El formulario guarda realmente la cita en Supabase y actualiza el listado. | Enviar una cita desde la UI y verificarla con `SELECT ... FROM citas` (fila nueva y lista actualizada sin recargar la página). |
| 9 | Fecha, motivo y estado se envían correctamente (fecha como `timestamptz` ISO 8601). | Verificar en Supabase el valor insertado de `fecha` y los campos `motivo`/`estado`. |
| 10 | Se muestran mensajes sencillos de éxito y de error al usuario. | Provocar un éxito (guardar cita) y un error (p. ej. sin conexión o validación vacía) y observar los mensajes. |
| 11 | `npm run lint` termina sin errores. | Ejecutar `npm run lint`. |
| 12 | `npm run build` termina sin errores. | Ejecutar `npm run build`. |
| 13 | La interfaz es responsiva (usable en móvil y escritorio). | Redimensionar la ventana / devtools responsive. |
| 14 | Se usan los datos de ejemplo existentes (5 propietarios, 5 mascotas, 5 citas) sin duplicarlos. | Conteos en UI vs `SELECT count(*)` por tabla antes y después de probar el formulario. |

# 6. Decisiones tomadas y descartadas

**Tomadas:**
- `src/lib/supabaseClient.js` como módulo único del cliente (convención ya prevista en el AGENTS.md del proyecto; evita instancias duplicadas).
- Variables con prefijo `VITE_` (única forma en que Vite expone variables al cliente) y `.env.local` ignorado por Git (`*.local` ya está en `.gitignore`).
- Publishable key (`VITE_SUPABASE_PUBLISHABLE_KEY`) en el frontend; la secret key jamás se expone al navegador.
- JOINs con `supabase-js` (`propietarios(nombre)` / `mascotas(nombre)`) para mostrar nombres en lugar de IDs, en vez de hacer N consultas desde el cliente.
- `estado` como `select` controlado con opciones fijas (`programada`, `completada`, `cancelada`) y `programada` por defecto: alineado con los datos de ejemplo de la Spec 01 y evita texto libre inconsistente.
- Fecha como `datetime-local` en el formulario, convertida a ISO 8601 (`toISOString()`) antes del `INSERT`, ya que la columna es `timestamptz`.
- Componentes pequeños por sección (listas + formulario + mensaje) sin librerías de UI externas: suficiente para el alcance del laboratorio.
- React 19 + Vite + JavaScript/JSX, según stack obligatorio; sin TypeScript.

**Descartadas:**
- Secret key en el frontend o en `.env` commiteado (riesgo de seguridad: cualquier persona podría administrar la base).
- Mostrar solo `mascota_id`/`propietario_id` en la UI (requisito explícito: mostrar nombres).
- Escribir el ID de la mascota manualmente (requisito explícito: desplegable).
- Edición y borrado de registros (fuera del alcance de esta spec; podría ser una Spec 03 futura).
- Autenticación de usuarios y RLS en el frontend (la Spec 01 mantiene RLS desactivado para este laboratorio con datos ficticios).
- Enrutamiento con `react-router` (una sola vista alcanza el alcance).
- Migración a TypeScript (el proyecto es JS/JSX por decisión del laboratorio).
- Librerías de UI (MUI, Tailwind, etc.) sin autorización (no instalar dependencias nuevas sin pedirlo).
