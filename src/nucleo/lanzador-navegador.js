/** Crea un Web Worker por agente: así corren de verdad en paralelo dentro del navegador. */
export function lanzarEnNavegador(agente, entrada, on, velocidad) {
  const w = new Worker(new URL('../agentes/worker.js', import.meta.url), { type: 'module' })
  let resolver, rechazar
  const promesa = new Promise((res, rej) => { resolver = res; rechazar = rej })
  w.onmessage = ({ data: m }) => {
    if (m.tipo === 'progreso') on.progreso(m.pct, m.msg)
    else if (m.tipo === 'log') on.log(m.linea)
    else if (m.tipo === 'decir') on.decir(m.texto)
    else if (m.tipo === 'fin') { resolver(m.resultado); w.terminate() }
    else if (m.tipo === 'error') { rechazar(new Error(m.mensaje)); w.terminate() }
  }
  w.onerror = (e) => { rechazar(new Error(e.message)); w.terminate() }
  w.postMessage({ tipo: 'iniciar', agente, entrada, velocidad })
  return { promesa, enviar: (clave, valor) => w.postMessage({ tipo: 'datos', clave, valor }) }
}
