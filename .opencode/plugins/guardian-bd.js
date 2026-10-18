const HERRAMIENTAS_SQL = ["supabase_execute_sql", "supabase_apply_migration"];

function esHerramientaSQL(nombre) {
  if (typeof nombre !== "string") return false;
  const normalizado = nombre.toLowerCase();
  return HERRAMIENTAS_SQL.some((herramienta) => normalizado.endsWith(herramienta));
}

function limpiarSQL(sql) {
  return sql
    .replace(/\/\*[\s\S]*?\*\//g, " ")
    .replace(/--[^\n;]*/g, " ")
    .replace(/'(?:''|[^'])*'/g, "''")
    .replace(/"[^"]*"/g, '""');
}

export function detectarSQLPeligrosa(sql) {
  if (typeof sql !== "string" || sql.trim() === "") {
    return { bloqueada: false, motivo: null };
  }

  const limpio = limpiarSQL(sql);

  if (/\bDROP\s+TABLE\b/i.test(limpio)) {
    return {
      bloqueada: true,
      motivo:
        "Guardián BD: la instrucción contiene DROP TABLE, que elimina una tabla y todos sus datos de forma irreversible. Usa DELETE con WHERE si solo necesitas quitar filas.",
    };
  }

  if (/\bDROP\s+SCHEMA\b/i.test(limpio)) {
    return {
      bloqueada: true,
      motivo:
        "Guardián BD: la instrucción contiene DROP SCHEMA, que elimina un esquema completo y todos sus objetos. Usa DROP TABLE sobre tablas concretas si es necesario.",
    };
  }

  if (/\bTRUNCATE\b/i.test(limpio)) {
    return {
      bloqueada: true,
      motivo:
        "Guardián BD: la instrucción contiene TRUNCATE, que vacía una tabla por completo. Usa DELETE con una condición WHERE acotada.",
    };
  }

  const sentencias = limpio
    .split(";")
    .map((sentencia) => sentencia.trim())
    .filter(Boolean);

  for (const sentencia of sentencias) {
    if (/\bDELETE\s+FROM\b/i.test(sentencia) && !/\bWHERE\b/i.test(sentencia)) {
      return {
        bloqueada: true,
        motivo:
          "Guardián BD: la instrucción contiene DELETE sin WHERE, que eliminaría todas las filas de la tabla. Añade una condición WHERE que acote el borrado.",
      };
    }
  }

  return { bloqueada: false, motivo: null };
}

export const GuardianBD = async () => {
  return {
    "tool.execute.before": async (input, output) => {
      if (!esHerramientaSQL(input.tool)) return;

      const analisis = detectarSQLPeligrosa(output.args?.query);

      if (analisis.bloqueada) {
        throw new Error(analisis.motivo);
      }
    },
  };
};

export default GuardianBD;
