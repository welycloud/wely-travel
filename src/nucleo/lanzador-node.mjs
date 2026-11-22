/** Lanza cada agente en un worker_thread de Node (lo usan madre-cli.mjs y server/servidor.mjs). */
import { Worker } from 'node:worker_threads'

export function lanzadorNode(modo = 'demo') {
  return (agente, entrada, on, velocidad) => {
    const w = new Worker(new URL('../agentes/worker-node.mjs', import.meta.url), { workerData: { agente, entrada, velocidad, modo } })
    const promesa = new Promise((res, rej) => {
      w.on('message', (m) => {
        if (m.tipo === 'progreso') on.progreso(m.pct, m.msg)
        else if (m.tipo === 'log') on.log(m.linea)
        else if (m.tipo === 'decir') on.decir(m.texto)
        else if (m.tipo === 'fin') { res(m.resultado); w.terminate() }
        else if (m.tipo === 'error') { rej(new Error(m.mensaje)); w.terminate() }
      })
      w.on('error', rej)
    })
    return { promesa, enviar: (clave, valor) => w.postMessage({ tipo: 'datos', clave, valor }) }
  }
}

// Lee .env (KEY=valor) sin dependencias
export async function cargarEnv(archivo) {
  const { readFile } = await import('node:fs/promises')
  try {
    for (const l of (await readFile(archivo, 'utf8')).split(/\r?\n/)) {
      const m = /^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*?)\s*$/.exec(l)
      if (m && !(m[1] in process.env)) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '')
    }
  } catch {}
}
