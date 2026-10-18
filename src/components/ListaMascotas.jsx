export function ListaMascotas({ mascotas, cargando, error }) {
  if (cargando) return <p>Cargando mascotas...</p>
  if (error) return <p className="error">{error}</p>
  if (!mascotas?.length) return <p>No hay mascotas registradas.</p>

  return (
    <div className="tabla-wrap">
      <table className="tabla">
        <thead>
          <tr>
            <th>Nombre</th>
            <th>Especie</th>
            <th>Raza</th>
            <th>Propietario</th>
          </tr>
        </thead>
        <tbody>
          {mascotas.map((m) => (
            <tr key={m.id}>
              <td>{m.nombre}</td>
              <td>{m.especie}</td>
              <td>{m.raza}</td>
              <td>{m.propietarios?.nombre || '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default ListaMascotas
