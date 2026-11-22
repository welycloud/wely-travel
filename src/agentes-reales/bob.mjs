/**
 * Bob · Itinerario y top 3 (modo real). Puntúa los vuelos reales igual que en la demo y, para los
 * viajes de ida y vuelta, consulta en Google Flights (SerpApi) el vuelo de regreso de cada una de
 * las tres propuestas, con el precio total del viaje completo.
 */
import { ejecutar as elegir, armarItinerario } from '../agentes/bob.js'
import { consultar, parametros, aVuelo } from '../real/serpapi.mjs'
import { fmtUSD } from '../nucleo/datos.js'

export async function ejecutar(entrada, ctx) {
  const b = entrada.busqueda
  const silencio = { ...ctx, decir: () => {}, progreso: (p, m) => ctx.progreso(Math.round(p * 0.6), m) }
  const r = await elegir(entrada, silencio)
  if (b.tipo === 'ida_vuelta') {
    ctx.progreso(65, 'Google Flights: vuelos de regreso del top 3')
    for (const p of r.propuestas) {
      if (!p.departure_token) continue
      try {
        const data = await consultar(parametros(b, { departure_token: p.departure_token }), ctx.log)
        const it = [...(data.best_flights || []), ...(data.other_flights || [])][0]
        if (it) { p.vuelta = aVuelo(it); if (it.price) { p.total = it.price; p.porAdulto = Math.round(it.price / (b.adultos + (b.ninos || 0))) } }
        if (data.search_metadata?.google_flights_url) p.enlace = data.search_metadata.google_flights_url
      } catch (e) { ctx.log(`Bob: no pude traer la vuelta de ${p.nombre} (${e.message})`) }
    }
  }
  r.itinerario = armarItinerario(r.propuestas[0], b, entrada.torre)
  const p = r.propuestas[0]
  ctx.decir(p ? `¡Top 3 real listo! Recomiendo ${p.nombre} por ${fmtUSD(p.total)} (${p.fuente}).` : 'No hay vuelos reales con estos filtros.')
  ctx.progreso(100, 'Top 3 listo')
  return r
}
