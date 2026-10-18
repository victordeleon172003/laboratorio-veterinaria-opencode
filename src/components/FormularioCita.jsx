import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import Mensaje from './Mensaje'

export function FormularioCita({ mascotas, onCitaCreada, cargandoMascotas, errorMascotas }) {
  const [mascotaId, setMascotaId] = useState('')
  const [fecha, setFecha] = useState('')
  const [motivo, setMotivo] = useState('')
  const [estado, setEstado] = useState('programada')
  const [guardando, setGuardando] = useState(false)
  const [mensaje, setMensaje] = useState(null)

  useEffect(() => {
    if (!mensaje) return
    const timeout = setTimeout(() => setMensaje(null), 4000)
    return () => clearTimeout(timeout)
  }, [mensaje])

  const limpiar = () => {
    setFecha('')
    setMotivo('')
    setEstado('programada')
    setMascotaId('')
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setMensaje(null)

    if (!mascotaId) {
      setMensaje({ tipo: 'error', texto: 'Debe seleccionar una mascota.' })
      return
    }
    if (!fecha) {
      setMensaje({ tipo: 'error', texto: 'Debe seleccionar una fecha.' })
      return
    }
    if (!motivo.trim()) {
      setMensaje({ tipo: 'error', texto: 'Debe indicar un motivo.' })
      return
    }

    try {
      setGuardando(true)
      const fechaIso = new Date(fecha).toISOString()
      const { error } = await supabase
        .from('citas')
        .insert({ mascota_id: mascotaId, fecha: fechaIso, motivo: motivo.trim(), estado })
        .select()
        .single()

      if (error) throw error

      setMensaje({ tipo: 'exito', texto: 'Cita registrada correctamente.' })
      limpiar()
      if (onCitaCreada) onCitaCreada()
    } catch (error) {
      const texto = error?.message || 'No se pudo registrar la cita.'
      setMensaje({ tipo: 'error', texto })
    } finally {
      setGuardando(false)
    }
  }

  return (
    <section className="seccion formulario-cita">
      <h2>Crear nueva cita</h2>
      <Mensaje tipo={mensaje?.tipo} texto={mensaje?.texto} onClose={() => setMensaje(null)} />
      <form onSubmit={handleSubmit}>
        <div className="campo">
          <label htmlFor="mascota">Mascota</label>
          <select
            id="mascota"
            value={mascotaId}
            onChange={(event) => setMascotaId(event.target.value)}
            disabled={guardando || cargandoMascotas || !!errorMascotas}
          >
            <option value="">Seleccione una mascota</option>
            {mascotas.map((m) => (
              <option key={m.id} value={m.id}>
                {m.nombre}
                {m.especie ? ` (${m.especie})` : ''}
              </option>
            ))}
          </select>
          {cargandoMascotas && <small>Cargando mascotas...</small>}
          {errorMascotas && <small className="error">{errorMascotas}</small>}
        </div>
        <div className="campo">
          <label htmlFor="fecha">Fecha y hora</label>
          <input
            id="fecha"
            type="datetime-local"
            value={fecha}
            onChange={(event) => setFecha(event.target.value)}
            disabled={guardando}
          />
        </div>
        <div className="campo">
          <label htmlFor="motivo">Motivo</label>
          <input
            id="motivo"
            type="text"
            value={motivo}
            onChange={(event) => setMotivo(event.target.value)}
            disabled={guardando}
            placeholder="Ej. Revisión anual"
          />
        </div>
        <div className="campo">
          <label htmlFor="estado">Estado</label>
          <select id="estado" value={estado} onChange={(event) => setEstado(event.target.value)} disabled={guardando}>
            <option value="programada">programada</option>
            <option value="completada">completada</option>
            <option value="cancelada">cancelada</option>
          </select>
        </div>
        <div className="acciones">
          <button type="submit" disabled={guardando || cargandoMascotas || !!errorMascotas}>
            {guardando ? 'Guardando...' : 'Guardar cita'}
          </button>
        </div>
      </form>
    </section>
  )
}

export default FormularioCita
