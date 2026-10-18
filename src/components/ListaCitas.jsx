export function ListaCitas({ citas, cargando, error }) {
  if (cargando) return <p>Cargando citas...</p>
  if (error) return <p className="error">{error}</p>
  if (!citas?.length) return <p>No hay citas registradas.</p>

  return (
    <div className="tabla-wrap">
      <table className="tabla">
        <thead>
          <tr>
            <th>Fecha</th>
            <th>Motivo</th>
            <th>Estado</th>
            <th>Mascota</th>
          </tr>
        </thead>
        <tbody>
          {citas.map((c) => {
            const fechaStr = c.fecha ? new Date(c.fecha).toLocaleString() : ''
            return (
              <tr key={c.id}>
                <td>{fechaStr}</td>
                <td>{c.motivo}</td>
                <td>{c.estado}</td>
                <td>{c.mascotas?.nombre || '—'}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

export default ListaCitas
