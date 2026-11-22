/**
 * CÓDIGO MADRE de WELY Travel.
 *
 * Recibe la búsqueda (origen, destino, fechas y filtros) y coordina a los agentes:
 *   1. En paralelo: las cinco aerolíneas buscan vuelos; Carolina revisa documentos; Francisco
 *      prepara clima, puntualidad y tendencia de precio.
 *   2. Cuando terminan las aerolíneas, entrega todas las ofertas a Francisco para el comparador.
 *   3. Con todo listo, Bob puntúa los vuelos y arma las tres mejores propuestas.
 *
 * Cada agente es un archivo propio en src/agentes/ y corre en su propio hilo (Web Worker en el
 * navegador, worker_thread en Node). El código madre solo necesita una función `lanzar` que sepa
 * crear ese hilo, y una función `emitir` que reciba los eventos (la sala, la terminal o la consola).
 */
import { AEROPUERTOS, AEROLINEAS } from './datos.js'

// Agente → estación de la oficina donde se sienta
export const AGENTES = [
  { id: 'latam', estacion: 'latam', tipo: 'aerolinea' },
  { id: 'sky', estacion: 'sky', tipo: 'aerolinea' },
  { id: 'jetsmart', estacion: 'jetsmart', tipo: 'aerolinea' },
  { id: 'copa', estacion: 'copa', tipo: 'aerolinea' },
  { id: 'iberia', estacion: 'iberia', tipo: 'aerolinea' },
  { id: 'carolina', estacion: 'carolina', tipo: 'documentos' },
  { id: 'francisco', estacion: 'francisco', tipo: 'torre' },
  { id: 'bob', estacion: 'bob', tipo: 'itinerario' },
]
export const ESTACION = Object.fromEntries(AGENTES.map((a) => [a.id, a.estacion]))

export function validar(b) {
  const err = []
  if (!AEROPUERTOS[b.origen]) err.push('Origen no válido')
  if (!AEROPUERTOS[b.destino]) err.push('Destino no válido')
  if (b.origen === b.destino) err.push('El origen y el destino son iguales')
  if (!/^\d{4}-\d{2}-\d{2}$/.test(b.fechaIda || '')) err.push('Falta la fecha de ida')
  if (b.tipo === 'ida_vuelta' && !(b.fechaVuelta >= b.fechaIda)) err.push('La vuelta debe ser igual o posterior a la ida')
  if (!(b.adultos >= 1)) err.push('Debe viajar al menos un adulto')
  return err
}

export async function ejecutarBusqueda(busqueda, { lanzar, emitir, velocidad = 1 }) {
  const t0 = Date.now()
  const seg = () => (Date.now() - t0) / 1000
  const log = (line, agent) => emitir({ type: 'LOG_OUTPUT', line, agent, ts: Date.now() })
  const errores = validar(busqueda)
  if (errores.length) {
    emitir({ type: 'RUN_FINISHED', exitCode: 1, errores, durationSec: 0 })
    return { errores }
  }
  const aerolineas = AGENTES.filter((a) => a.tipo === 'aerolinea' && busqueda.aerolineas.includes(a.id))
  const omitidas = AGENTES.filter((a) => a.tipo === 'aerolinea' && !busqueda.aerolineas.includes(a.id))
  const cola = [...aerolineas, ...AGENTES.filter((a) => a.tipo !== 'aerolinea')].map((a) => a.estacion)
  emitir({ type: 'RUN_STARTED', busqueda, cola, ts: Date.now() })
  const o = AEROPUERTOS[busqueda.origen], d = AEROPUERTOS[busqueda.destino]
  log(`WELY Travel · código madre · ${o.ciudad} (${o.cod}) → ${d.ciudad} (${d.cod})`)
  log(`Agentes en paralelo: ${aerolineas.map((a) => AEROLINEAS[a.id].nombre).join(', ')}, Carolina y Francisco`)
  for (const a of omitidas) emitir({ type: 'BUILD_COMPLETE', agent: a.estacion, status: 'skipped', reason: 'No seleccionada' })

  const iniciar = (def, entrada) => {
    const t = Date.now()
    emitir({ type: 'AGENT_TRIGGERED', agent: def.estacion, archivo: `agentes/${def.id}.js`, ts: t })
    const h = lanzar(def.id, entrada, {
      progreso: (pct, msg) => emitir({ type: 'BUILD_PROGRESS', agent: def.estacion, pct: pct / 100, msg }),
      log: (linea) => log(linea, def.estacion),
      decir: (texto) => emitir({ type: 'AGENT_SAY', agent: def.estacion, texto }),
    }, velocidad)
    h.promesa = h.promesa.then(
      (res) => { emitir({ type: 'BUILD_COMPLETE', agent: def.estacion, status: 'success', durationSec: (Date.now() - t) / 1000, resultado: res }); return res },
      (e) => { emitir({ type: 'BUILD_COMPLETE', agent: def.estacion, status: 'error', reason: String(e?.message || e) }); log(`[ERROR] ${def.id}: ${e?.message || e}`, def.estacion); return null },
    )
    return h
  }
  const def = (id) => AGENTES.find((a) => a.id === id)

  // 1 · En paralelo
  const hAero = aerolineas.map((a) => iniciar(a, { busqueda }))
  const hCarolina = iniciar(def('carolina'), { busqueda })
  const hFrancisco = iniciar(def('francisco'), { busqueda })

  const resAero = (await Promise.all(hAero.map((h) => h.promesa))).filter(Boolean)
  const ofertas = resAero.flatMap((r) => r.ofertas)
  log(`Aerolíneas listas en ${seg().toFixed(1)} s · ${ofertas.length} vuelos cumplen los filtros`)

  // 2 · Francisco arma el comparador con todas las ofertas
  hFrancisco.enviar('ofertas', ofertas)
  const [torre, documentos] = await Promise.all([hFrancisco.promesa, hCarolina.promesa])

  // 3 · Bob elige las tres mejores (incluye lo que Francisco encontró en otras aerolíneas)
  const extra = torre?.otrasOfertas || []
  if (extra.length) log(`Francisco suma ${extra.length} opciones de otras aerolíneas: ${[...new Set(extra.map((o) => o.nombre))].join(', ')}`)
  const hBob = iniciar(def('bob'), { busqueda, ofertas: [...ofertas, ...extra], torre, documentos })
  const final = await hBob.promesa

  const resultado = {
    busqueda, ofertas: ofertas.length, analizados: resAero.reduce((s, r) => s + r.analizados, 0),
    aerolineas: resAero.map((r) => ({ id: r.aerolinea, nombre: r.nombre, opciones: r.ofertas.length, min: r.ofertas[0]?.total ?? null, motivo: r.motivo, fuente: r.fuente || '' })),
    propuestas: final?.propuestas || [], itinerario: final?.itinerario || [], torre, documentos, segundos: seg(),
  }
  log(`Búsqueda terminada en ${seg().toFixed(1)} s · ${resultado.propuestas.length} propuestas`)
  emitir({ type: 'RUN_FINISHED', exitCode: final ? 0 : 1, durationSec: seg(), resultado })
  return resultado
}
