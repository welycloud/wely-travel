/**
 * Francisco · Torre de control. Mientras las aerolíneas buscan, prepara el clima del destino, la
 * puntualidad y la tendencia de precio de la ruta. Cuando el código madre le entrega todas las
 * ofertas, arma el comparador: mejor precio por aerolínea, la más barata y la más rápida.
 */
import { AEROPUERTOS, AEROLINEAS, azar, climaMes, fmtUSD, fmtDur } from '../nucleo/datos.js'

export const ficha = { id: 'francisco', nombre: 'Francisco', rol: 'Torre de control' }

export async function ejecutar({ busqueda: b }, ctx) {
  const dest = AEROPUERTOS[b.destino]
  const mes = new Date(b.fechaIda + 'T12:00:00').getMonth()
  ctx.progreso(8, `Clima en ${dest.ciudad}`)
  await ctx.esperar(1300)
  const clima = climaMes(b.destino, mes)
  ctx.log(`Francisco: ${dest.ciudad} en esa fecha, máx. ~${clima.max} °C / mín. ~${clima.min} °C`)
  ctx.progreso(20, 'Tendencia de precio de la ruta')
  await ctx.esperar(1300)
  const r = azar(`tendencia|${b.origen}|${b.destino}|${b.fechaIda}`)
  const semanas = []
  let v = 100
  for (let i = 0; i < 10; i++) { v *= 0.94 + r() * 0.12; semanas.push(Math.round(v)) }
  const cambio = semanas.at(-1) / semanas.at(-4) - 1
  const tendencia = cambio < -0.04 ? 'bajando' : cambio > 0.04 ? 'subiendo' : 'estable'
  const consejo = { bajando: 'Viene bajando: puede convenir esperar unos días.', subiendo: 'Viene subiendo: conviene comprar pronto.', estable: 'Precio estable: buen momento para decidir.' }[tendencia]
  ctx.decir(`En ${dest.ciudad} se esperan ~${clima.max} °C. El precio de la ruta viene ${tendencia}.`)
  ctx.progreso(30, 'Esperando las tarifas de las aerolíneas')

  const ofertas = await ctx.recibir('ofertas') // las entrega el código madre cuando terminan todas
  ctx.progreso(60, 'Armando el comparador')
  await ctx.esperar(1500)
  const porAerolinea = {}
  for (const o of ofertas) {
    const p = (porAerolinea[o.aerolinea] ||= { nombre: o.nombre, opciones: 0, min: Infinity, puntualidad: AEROLINEAS[o.aerolinea].puntualidad })
    p.opciones++
    p.min = Math.min(p.min, o.total)
  }
  const barata = ofertas.reduce((m, o) => (!m || o.total < m.total ? o : m), null)
  const rapida = ofertas.reduce((m, o) => (!m || o.duracion < m.duracion ? o : m), null)
  ctx.progreso(90, 'Comparador listo')
  await ctx.esperar(700)
  if (barata) ctx.decir(`Comparador listo: ${ofertas.length} vuelos. Más barato ${barata.nombre} (${fmtUSD(barata.total)}); más rápido ${rapida.nombre} (${fmtDur(rapida.ida.duracion)}).`)
  else ctx.decir('Ninguna aerolínea encontró vuelos con estos filtros.')
  ctx.progreso(100, 'Torre de control al día')
  return { clima, tendencia, consejo, semanas, porAerolinea, total: ofertas.length, barata: barata?.id, rapida: rapida?.id }
}
