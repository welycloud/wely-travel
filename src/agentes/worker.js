/** Web Worker: cada agente corre en su propio hilo del navegador, en paralelo con los demás. */
import { correrAgente } from '../nucleo/runtime.js'

const modulos = import.meta.glob(['./*.js', '!./worker.js', '!./motor-aerolinea.js'])
let entregar = null
self.onmessage = async ({ data: m }) => {
  if (m.tipo === 'iniciar') {
    const mod = await modulos[`./${m.agente}.js`]()
    ;({ entregar } = await correrAgente(mod, m.entrada, (msg) => self.postMessage(msg), m.velocidad))
  } else if (m.tipo === 'datos') entregar?.(m.clave, m.valor)
}
