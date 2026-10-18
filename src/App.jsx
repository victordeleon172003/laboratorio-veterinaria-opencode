import { useCallback, useEffect, useState } from 'react'
import './App.css'
import FormularioCita from './components/FormularioCita'
import ListaCitas from './components/ListaCitas'
import ListaMascotas from './components/ListaMascotas'
import ListaPropietarios from './components/ListaPropietarios'
import Mensaje from './components/Mensaje'
import { supabase } from './lib/supabaseClient'

function App() {
  const [propietarios, setPropietarios] = useState([])
  const [mascotas, setMascotas] = useState([])
  const [citas, setCitas] = useState([])
  const [cargandoProp, setCargandoProp] = useState(true)
  const [cargandoMasc, setCargandoMasc] = useState(true)
  const [cargandoCitas, setCargandoCitas] = useState(true)
  const [errorProp, setErrorProp] = useState('')
  const [errorMasc, setErrorMasc] = useState('')
  const [errorCitas, setErrorCitas] = useState('')
  const [mensajeGlobal, setMensajeGlobal] = useState(null)

  const cargarPropietarios = useCallback(async () => {
    try {
      const { data, error } = await supabase.from('propietarios').select('*').order('nombre')
      if (error) throw error
      setPropietarios(data || [])
      setCargandoProp(false)
    } catch (error) {
      setErrorProp(error?.message || 'Error al cargar propietarios')
      setCargandoProp(false)
    }
  }, [])

  const cargarMascotas = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('mascotas')
        .select('id, nombre, especie, raza, propietario_id, propietarios(nombre)')
        .order('nombre')
      if (error) throw error
      setMascotas(data || [])
      setCargandoMasc(false)
    } catch (error) {
      setErrorMasc(error?.message || 'Error al cargar mascotas')
      setCargandoMasc(false)
    }
  }, [])

  const cargarCitas = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('citas')
        .select('id, fecha, motivo, estado, mascota_id, mascotas(nombre)')
        .order('fecha')
      if (error) throw error
      setCitas(data || [])
      setCargandoCitas(false)
      setErrorCitas('')
    } catch (error) {
      setErrorCitas(error?.message || 'Error al cargar citas')
      setCargandoCitas(false)
    }
  }, [])

  useEffect(() => {
    const id = setTimeout(() => {
      cargarPropietarios()
      cargarMascotas()
      cargarCitas()
    }, 0)
    return () => clearTimeout(id)
  }, [cargarPropietarios, cargarMascotas, cargarCitas])

  const recargarTrasAlta = useCallback(() => {
    cargarCitas()
    setMensajeGlobal({ tipo: 'exito', texto: 'Listado de citas actualizado.' })
    setTimeout(() => setMensajeGlobal(null), 2500)
  }, [cargarCitas])

  return (
    <main className="container">
      <header>
        <h1>Sistema de Citas Veterinarias</h1>
        <p className="subtitulo">Laboratorio 23 — Programación Comercial (SDD)</p>
      </header>

      <Mensaje tipo={mensajeGlobal?.tipo} texto={mensajeGlobal?.texto} onClose={() => setMensajeGlobal(null)} />

      <section className="seccion" aria-labelledby="titulo-propietarios">
        <h2 id="titulo-propietarios">Propietarios</h2>
        <ListaPropietarios propietarios={propietarios} cargando={cargandoProp} error={errorProp} />
      </section>

      <section className="seccion" aria-labelledby="titulo-mascotas">
        <h2 id="titulo-mascotas">Mascotas</h2>
        <ListaMascotas mascotas={mascotas} cargando={cargandoMasc} error={errorMasc} />
      </section>

      <section className="seccion" aria-labelledby="titulo-citas">
        <h2 id="titulo-citas">Citas</h2>
        <ListaCitas citas={citas} cargando={cargandoCitas} error={errorCitas} />
      </section>

      <FormularioCita
        mascotas={mascotas}
        onCitaCreada={recargarTrasAlta}
        cargandoMascotas={cargandoMasc}
        errorMascotas={errorMasc}
      />
    </main>
  )
}

export default App
