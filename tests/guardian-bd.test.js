import test from "node:test";
import assert from "node:assert/strict";
import { detectarSQLPeligrosa } from "../.opencode/plugins/guardian-bd.js";

const casosBloqueados = [
  { sql: "DROP TABLE citas;", motivo: /DROP TABLE/i },
  { sql: "drop table if exists public.mascotas cascade;", motivo: /DROP TABLE/i },
  { sql: "DROP SCHEMA public CASCADE;", motivo: /DROP SCHEMA/i },
  { sql: "TRUNCATE TABLE citas;", motivo: /TRUNCATE/i },
  { sql: "truncate citas restart identity cascade;", motivo: /TRUNCATE/i },
  { sql: "DELETE FROM citas;", motivo: /DELETE sin WHERE/i },
  { sql: "delete from mascotas", motivo: /DELETE sin WHERE/i },
  {
    sql: "INSERT INTO t (a) VALUES (1); DELETE FROM citas; SELECT 1;",
    motivo: /DELETE sin WHERE/i,
  },
  {
    sql: "WITH borrados AS (DELETE FROM citas RETURNING *) SELECT * FROM borrados;",
    motivo: /DELETE sin WHERE/i,
  },
];

const casosPermitidos = [
  "SELECT 1;",
  "SELECT * FROM citas;",
  "INSERT INTO propietarios (nombre, telefono, correo) VALUES ('Ana', '555-1234', 'ana@correo.com');",
  "UPDATE mascotas SET raza = 'Mestizo' WHERE id = 1;",
  "DELETE FROM citas WHERE estado = 'cancelada';",
  "DELETE FROM mascotas WHERE id = 3; DELETE FROM citas WHERE mascota_id = 3;",
  "SELECT 'DROP TABLE' AS texto;",
  "SELECT 'TRUNCATE' AS operacion;",
  "SELECT name FROM t WHERE name = 'no where';",
  "CREATE TABLE temporal (id int); -- comentario con DROP SCHEMA y TRUNCATE",
];

test("bloquea DROP TABLE, DROP SCHEMA, TRUNCATE y DELETE sin WHERE", () => {
  for (const caso of casosBloqueados) {
    const resultado = detectarSQLPeligrosa(caso.sql);
    assert.equal(resultado.bloqueada, true, `Debía bloquear: ${caso.sql}`);
    assert.match(resultado.motivo, caso.motivo, `Motivo inesperado para: ${caso.sql}`);
  }
});

test("permite el SQL seguro y el SQL con palabras prohibidas solo en cadenas o comentarios", () => {
  for (const sql of casosPermitidos) {
    const resultado = detectarSQLPeligrosa(sql);
    assert.equal(resultado.bloqueada, false, `Debía permitir: ${sql}`);
  }
});

test("acepta SQL vacío o no cadenas sin bloquear", () => {
  assert.equal(detectarSQLPeligrosa("").bloqueada, false);
  assert.equal(detectarSQLPeligrosa("   ").bloqueada, false);
  assert.equal(detectarSQLPeligrosa(undefined).bloqueada, false);
});
