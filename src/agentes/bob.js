/**
 * Bob · Itinerario y top 3. Recibe todas las ofertas, el comparador de Francisco y los requisitos de
 * Carolina; puntúa cada vuelo (precio, duración, escalas, puntualidad y horario) según la prioridad
 * elegida, y arma las tres mejores propuestas, distintas entre sí, con un itinerario sugerido.
 */
import { AEROPUERTOS, fmtUSD, fmtDur } from '../nucleo/datos.js'

export const ficha = { id: 'bob', nombre: 'Bob', rol: 'Itinerario y top 3' }

const PESOS = {
  equilibrado: { precio: 0.45, duracion: 0.3, escalas: 0.15, puntualidad: 0.1 },
  precio: { precio: 0.75, duracion: 0.12, escalas: 0.08, puntualidad: 0.05 },
  duracion: { precio: 0.25, duracion: 0.5, escalas: 0.18, puntualidad: 0.07 },
}
const hh = (m) => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`

export async function ejecutar({ busqueda: b, ofertas, torre, documentos }, ctx) {
  ctx.progreso(10, `Puntuando ${ofertas.length} vuelos`)
  await ctx.esperar(1300)
  if (!ofertas.length) {
    ctx.decir('Sin vuelos que cumplan los filtros. Probemos quitando alguno.')
    ctx.progreso(100, 'Sin propuestas')
    return { propuestas: [], itinerario: [] }
  }
  const w = PESOS[b.prioridad] || PESOS.equilibrado
  const rango = (k) => { const v = ofertas.map((o) => o[k]); return [Math.min(...v), Math.max(...v)] }
  const [pMin, pMax] = rango('total'), [dMin, dMax] = rango('duracion')
  const norm = (v, a, z) => (z === a ? 0 : (v - a) / (z - a))
  for (const o of ofertas) {
    o.puntaje = 100 * (1 - (w.precio * norm(o.total, pMin, pMax) + w.duracion * norm(o.duracion, dMin, dMax) + w.escalas * Math.min(1, o.escalas / 2) + w.puntualidad * (1 - o.puntualidad) * 4))
  }
  const orden = [...ofertas].sort((x, y) => y.puntaje - x.puntaje)
  ctx.progreso(45, 'Eligiendo tres propuestas distintas')
  await ctx.esperar(1300)

  // Una propuesta por "producto" (aerolínea + ruta de ida y vuelta): evita tres veces el mismo vuelo
  const clave = (o) => `${o.aerolinea}|${o.ida.camino.join('-')}|${o.vuelta ? o.vuelta.camino.join('-') : ''}`
  const grupos = new Map()
  for (const o of orden) if (!grupos.has(clave(o))) grupos.set(clave(o), o)
  const reps = [...grupos.values()]
  const barata = [...ofertas].sort((x, y) => x.total - y.total)[0]
  const rapida = [...ofertas].sort((x, y) => x.duracion - y.duracion || x.total - y.total)[0]
  const PRINCIPAL = { equilibrado: 'Mejor equilibrio', precio: 'Más económica', duracion: 'Más rápida' }
  const elegidas = []
  const ya = (o) => elegidas.some((e) => clave(e.o) === clave(o))
  const toma = (o, etiqueta) => {
    if (!o) return
    if (!ya(o)) { elegidas.push({ o, etiqueta, extras: [] }); return }
    const e = elegidas.find((x) => clave(x.o) === clave(o))
    if (etiqueta !== 'Alternativa' && e.etiqueta !== etiqueta && !e.extras.includes(etiqueta)) e.extras.push(etiqueta)
  }
  toma(orden[0], PRINCIPAL[b.prioridad] || PRINCIPAL.equilibrado)
  if (b.prioridad !== 'precio') toma(barata, 'Más económica')
  if (b.prioridad !== 'duracion') toma(rapida, 'Más rápida')
  for (const o of reps) { if (elegidas.length >= 3) break; if (!elegidas.some((e) => e.o.aerolinea === o.aerolinea)) toma(o, 'Alternativa') }
  for (const o of reps) { if (elegidas.length >= 3) break; toma(o, 'Alternativa') }
  for (const o of orden) { if (elegidas.length >= 3) break; if (!elegidas.some((e) => e.o.id === o.id)) elegidas.push({ o, etiqueta: 'Otro horario', extras: [] }) }
  for (const e of elegidas) {
    if (!e.extras.length) continue
    if (e.etiqueta === 'Alternativa') e.etiqueta = e.extras.shift()
    if (e.extras.length === 2) e.etiqueta = 'La mejor en todo'
    else if (e.extras.length) e.etiqueta = `${e.etiqueta} · ${e.extras.map((x) => x.replace('Más ', 'más ')).join(' y ')}`
  }
  const [primera, ...resto] = elegidas
  resto.sort((x, y) => y.o.puntaje - x.o.puntaje)
  elegidas.splice(0, elegidas.length, primera, ...resto)

  const propuestas = elegidas.slice(0, 3).map(({ o, etiqueta }) => ({
    ...o, etiqueta,
    razones: razones(o, { pMin, dMin }),
  }))
  ctx.progreso(75, 'Armando el itinerario')
  await ctx.esperar(1200)
  const itinerario = armarItinerario(propuestas[0], b, torre)
  const p = propuestas[0]
  ctx.decir(`¡Top 3 listo! Recomiendo ${p.nombre} por ${fmtUSD(p.total)}.`)
  ctx.progreso(100, 'Top 3 listo')
  return { propuestas, itinerario, documentos, torre }
}

function razones(o, { pMin, dMin }) {
  const r = []
  if (o.total === pMin) r.push('El precio total más bajo de la búsqueda')
  else r.push(`${fmtUSD(o.total - pMin)} sobre la más barata`)
  if (o.duracion === dMin && o.total === pMin) r.push('Y además el viaje más corto')
  else if (o.duracion === dMin) r.push('El viaje más corto')
  r.push(o.escalas === 0 ? 'Vuelo directo' : `${o.escalas} escala${o.escalas > 1 ? 's' : ''} · ${fmtDur(o.ida.duracion)} de ida`)
  r.push(o.equipaje.bodega ? 'Maleta en bodega incluida' : o.extraEquipaje ? `Incluye ${fmtUSD(o.extraEquipaje)} de equipaje` : 'Equipaje de mano incluido')
  return r.slice(0, 3)
}
const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']
function fechaCorta(f) { const d = new Date(f + 'T12:00:00'); return `${d.getDate()} ${MESES[d.getMonth()]}` }

export function armarItinerario(p, b, torre) {
  if (!p) return []
  const dest = AEROPUERTOS[b.destino]
  return [
    `Sales el ${fechaCorta(b.fechaIda)} a las ${hh(p.ida.salida)} y llegas a ${dest.ciudad} a las ${hh(p.ida.llegada)}${p.ida.dias ? ' del día siguiente' : ''}.`,
    p.ida.llegada < 660 || p.ida.dias ? 'Llegas temprano: deja el primer día libre para descansar.' : 'Llegas de tarde: alcanza para una caminata y cena cerca del hotel.',
    torre?.clima ? `Lleva ropa para ~${torre.clima.max} °C de día y ~${torre.clima.min} °C de noche.` : '',
    b.tipo === 'ida_vuelta' && p.vuelta ? `Regresas el ${fechaCorta(b.fechaVuelta)}; sale a las ${hh(p.vuelta.salida)}, llega a casa a las ${hh(p.vuelta.llegada)}.` : '',
    b.tipo === 'ida_vuelta' && !p.vuelta ? `Regresas el ${fechaCorta(b.fechaVuelta)}; el horario de vuelta se elige al reservar.` : '',
  ].filter(Boolean)
}
