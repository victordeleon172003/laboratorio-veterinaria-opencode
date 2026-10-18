export function ListaPropietarios({ propietarios, cargando, error }) {
  if (cargando) return <p>Cargando propietarios...</p>
  if (error) return <p className="error">{error}</p>
  if (!propietarios?.length) return <p>No hay propietarios registrados.</p>

  return (
    <div className="tabla-wrap">
      <table className="tabla">
        <thead>
          <tr>
            <th>Nombre</th>
            <th>Teléfono</th>
            <th>Correo</th>
          </tr>
        </thead>
        <tbody>
          {propietarios.map((p) => (
            <tr key={p.id}>
              <td>{p.nombre}</td>
              <td>{p.telefono}</td>
              <td>{p.correo}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default ListaPropietarios
