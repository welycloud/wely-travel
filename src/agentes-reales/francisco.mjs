/**
 * Francisco · Torre de control (modo real). Consulta Google Flights (SerpApi) para TODA la ruta, sin
 * filtrar aerolínea: así ve el mercado completo y el indicador de Google (precio bajo, típico o alto).
 * Cuando el código madre le entrega las ofertas de las aerolíneas, arma el comparador.
 */
import { consultar, parametros, aOfertas } from '../real/serpapi.mjs'
import { AEROPUERTOS, climaMes, fmtUSD, fmtDur } from '../nucleo/datos.js'

const NIVEL = { low: 'bajo', typical: 'típico', high: 'alto' }

export async function ejecutar({ busqueda: b }, ctx) {
  const dest = AEROPUERTOS[b.destino]
  ctx.progreso(10, 'Google Flights: mercado completo de la ruta')
  const data = await consultar(parametros(b), ctx.log)
  const mercado = aOfertas(data, b, 'Google Flights')
  const pi = data.price_insights || {}
  const semanas = (pi.price_history || []).slice(-10).map((p) => p[1])
  const nivel = NIVEL[pi.price_level] || 'sin dato'
  const tendencia = semanas.length > 3 ? (semanas.at(-1) < semanas.at(-4) * 0.96 ? 'bajando' : semanas.at(-1) > semanas.at(-4) * 1.04 ? 'subiendo' : 'estable') : 'estable'
  const consejo = pi.price_level === 'low' ? 'Google indica que el precio está bajo para esta ruta: buen momento para comprar.'
    : pi.price_level === 'high' ? 'Google indica que el precio está alto: si puedes, espera o cambia la fecha.'
    : pi.typical_price_range ? `Precio típico para esta ruta: entre ${fmtUSD(pi.typical_price_range[0])} y ${fmtUSD(pi.typical_price_range[1])}.` : 'Sin indicador de precio para esta ruta.'
  const clima = climaMes(b.destino, new Date(b.fechaIda + 'T12:00:00').getMonth())
  ctx.log(`Francisco: ${mercado.length} vuelos en el mercado · más barato ${mercado[0] ? fmtUSD(Math.min(...mercado.map((m) => m.total))) : '—'} · precio ${nivel}`)
  ctx.decir(`Google Flights muestra ${mercado.length} vuelos a ${dest.ciudad}; el precio hoy está ${nivel}.`)
  ctx.progreso(35, 'Esperando a las aerolíneas')

  const ofertas = await ctx.recibir('ofertas')
  ctx.progreso(70, 'Armando el comparador')
  const porAerolinea = {}
  for (const o of ofertas) {
    const p = (porAerolinea[o.aerolinea] ||= { nombre: o.nombre, opciones: 0, min: Infinity, fuente: o.fuente })
    p.opciones++; p.min = Math.min(p.min, o.total)
  }
  const otras = mercado.filter((m) => m.aerolinea === 'otra')
  const barata = ofertas.reduce((m, o) => (!m || o.total < m.total ? o : m), null)
  const rapida = ofertas.reduce((m, o) => (!m || o.duracion < m.duracion ? o : m), null)
  if (barata) ctx.decir(`Comparador listo: más barato ${barata.nombre} (${fmtUSD(barata.total)}), más rápido ${rapida.nombre} (${fmtDur(rapida.ida.duracion)}).`)
  // Otras aerolíneas: si alguna es mejor que lo que trajeron nuestros agentes, entra a competir en el top 3
  const slug = (s) => s.toLowerCase().normalize('NFD').replace(/[^a-z0-9]+/g, '-')
  const otrasOfertas = otras.sort((x, y) => x.total - y.total).slice(0, 5)
    .map((o, i) => ({ ...o, id: `otra-${i}`, aerolinea: `otra-${slug(o.nombre)}`, fuente: 'Google Flights · hallazgo de Francisco' }))
  if (otrasOfertas.length) {
    const mejor = otrasOfertas[0]
    const gana = !barata || mejor.total < barata.total
    ctx.decir(gana
      ? `¡Ojo! ${mejor.nombre} está más barata: ${fmtUSD(mejor.total)}. La sumo a la competencia.`
      : `También revisé ${otrasOfertas.length} opciones de otras aerolíneas (desde ${fmtUSD(mejor.total)}); las sumo para comparar.`)
  }
  ctx.progreso(100, 'Torre de control al día')
  return {
    clima, tendencia, consejo, nivel, semanas: semanas.length ? semanas : [100, 100], porAerolinea, total: ofertas.length,
    otrasOfertas,
    mercado: { vuelos: mercado.length, otras: otras.length, minOtras: otras.length ? Math.min(...otras.map((o) => o.total)) : null, enlace: data.search_metadata?.google_flights_url || null },
    barata: barata?.id, rapida: rapida?.id,
  }
}
