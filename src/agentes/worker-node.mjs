/** worker_thread de Node: cada agente en su propio hilo. modo 'real' usa src/agentes-reales/. */
import { parentPort, workerData } from 'node:worker_threads'
import { correrAgente } from '../nucleo/runtime.js'

const mod = workerData.modo === 'real'
  ? await import(`../agentes-reales/${workerData.agente}.mjs`)
  : await import(`./${workerData.agente}.js`)
const { entregar } = await correrAgente(mod, workerData.entrada, (msg) => parentPort.postMessage(msg), workerData.velocidad)
parentPort.on('message', (m) => { if (m.tipo === 'datos') entregar(m.clave, m.valor) })
