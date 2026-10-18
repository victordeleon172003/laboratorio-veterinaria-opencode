export function Mensaje({ tipo, texto, onClose }) {
  if (!texto) return null

  return (
    <div className={`mensaje ${tipo}`}>
      <span>{texto}</span>
      {onClose && (
        <button type="button" className="mensaje-cerrar" onClick={onClose} aria-label="Cerrar mensaje">
          ×
        </button>
      )}
    </div>
  )
}

export default Mensaje
