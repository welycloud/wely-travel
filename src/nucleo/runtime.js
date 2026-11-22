/**
 * Lo que recibe cada agente para trabajar (el "ctx"): informar avance, escribir en el registro,
 * decir algo en voz alta (los globos de diálogo), esperar y recibir datos del código madre.
 * Sirve igual dentro de un Web Worker (navegador) que de un worker_thread (Node).
 */
export function crearCtx(enviar, velocidad = 1) {
  const recibidos = {}, pendientes = {}
  const ctx = {
    progreso: (pct, msg) => enviar({ tipo: 'progreso', pct, msg }),
    log: (linea) => enviar({ tipo: 'log', linea }),
    decir: (texto) => enviar({ tipo: 'decir', texto }),
    esperar: (ms) => new Promise((r) => setTimeout(r, ms * velocidad)),
    recibir: (clave) => (clave in recibidos ? Promise.resolve(recibidos[clave]) : new Promise((r) => { pendientes[clave] = r })),
  }
  const entregar = (clave, valor) => { recibidos[clave] = valor; pendientes[clave]?.(valor) }
  return { ctx, entregar }
}

export async function correrAgente(mod, entrada, enviar, velocidad) {
  const { ctx, entregar } = crearCtx(enviar, velocidad)
  const promesa = Promise.resolve()
    .then(() => mod.ejecutar(entrada, ctx))
    .then((resultado) => enviar({ tipo: 'fin', resultado }))
    .catch((e) => enviar({ tipo: 'error', mensaje: String(e?.message || e) }))
  return { entregar, promesa }
}
