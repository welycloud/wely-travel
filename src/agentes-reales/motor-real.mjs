/**
 * Motor de los agentes de aerolínea en MODO REAL (solo Node, en tu computador):
 *   1. Intenta el sitio oficial de su aerolínea (src/real/sitios.mjs).
 *   2. Si el sitio bloquea o no se puede leer, busca esa misma aerolínea en Google Flights (SerpApi).
 * Cada oferta indica su fuente: "Sitio oficial" o "Google Flights".
 */
import { scrapear } from '../real/sitios.mjs'
import { consultar, parametros, aOfertas, CODIGOS, tieneClave } from '../real/serpapi.mjs'
import { AEROLINEAS, AEROPUERTOS, fmtUSD } from '../nucleo/datos.js'
import { horarioDe } from '../agentes/motor-aerolinea.js'

const MOTIVO_CORTO = { bloqueado: 'me bloqueó', sin_lectura: 'no me mostró vuelos legibles', sin_plantilla: 'aún no tiene su URL configurada', error: 'falló', sin_navegador: 'no abrió', sin_playwright: 'no abrió', omitido: 'quedó omitido' }

export async function buscarReal(aero, { busqueda: b }, ctx) {
  const a = AEROLINEAS[aero]
  const pax = b.adultos + (b.ninos || 0)
  ctx.progreso(5, 'Abriendo el sitio oficial')
  const sitio = await scrapear(aero, b, ctx)
  let ofertas = [], fuente = ''
  if (sitio.estado === 'ok') {
    fuente = 'Sitio oficial'
    const rt = b.tipo === 'ida_vuelta'
    const vuelta = sitio.vueltas?.length ? [...sitio.vueltas].sort((x, y) => x.precio - y.precio)[0] : null
    const tramo = (o, fecha, de, a2) => ({ camino: [de, a2], escalas: o.escalas, salida: o.salida, llegada: o.llegada, dias: o.dias, duracion: o.duracion, fecha, tramos: [] })
    ctx.decir(`¡Leí ${sitio.idas.length} vuelos${vuelta ? ` de ida y ${sitio.vueltas.length} de vuelta` : ''} directo en mi sitio!`)
    ofertas = sitio.idas.map((o, i) => {
      const porPersona = o.precio + (rt ? (vuelta ? vuelta.precio : o.precio) : 0)
      return {
        id: `${aero}-sitio-${i}`, aerolinea: aero, nombre: a.nombre, fuente,
        ida: tramo(o, b.fechaIda, b.origen, b.destino),
        vuelta: rt && vuelta ? tramo(vuelta, b.fechaVuelta, b.destino, b.origen) : null,
        porAdulto: porPersona, total: Math.round(porPersona * pax),
        estimado: rt && !vuelta, convertido: o.clp, nota: sitio.notas,
        extraEquipaje: 0, clase: b.clase, equipaje: { mano: !a.lowcost, bodega: false },
        puntualidad: a.puntualidad, duracion: o.duracion + (rt && vuelta ? vuelta.duracion : 0), escalas: Math.max(o.escalas, vuelta?.escalas || 0), enlace: sitio.url,
      }
    })
  } else {
    ctx.log(`${a.nombre}: sitio oficial → ${sitio.motivo}`)
    ctx.decir(`Mi sitio ${MOTIVO_CORTO[sitio.estado] || 'no respondió'}. Voy a Google Flights.`)
    if (!tieneClave()) throw new Error('Sin SERPAPI_KEY no hay respaldo con Google Flights')
    ctx.progreso(55, 'Consultando Google Flights (SerpApi)')
    const data = await consultar(parametros(b, { include_airlines: CODIGOS[aero] }), ctx.log)
    fuente = 'Google Flights'
    ofertas = aOfertas(data, b, fuente).map((o, i) => ({ ...o, id: `${aero}-gf-${i}`, aerolinea: aero, nombre: a.nombre }))
  }
  ctx.progreso(85, 'Aplicando filtros')
  ofertas = ofertas.filter((o) => {
    if (b.escalas === 'directo' && o.escalas > 0) return false
    if (b.escalas === 'max1' && o.escalas > 1) return false
    if (b.horario !== 'cualquiera' && horarioDe(o.ida.salida) !== b.horario) return false
    if (b.duracionMax > 0 && o.ida.duracion > b.duracionMax * 60) return false
    if (b.equipaje === 'bodega' && o.fuente === 'Sitio oficial') o.nota = [o.nota, 'maleta en bodega no incluida en el precio leído'].filter(Boolean).join(' · ')
    if (b.precioMax > 0 && o.total > b.precioMax) return false
    return true
  }).sort((x, y) => x.total - y.total).slice(0, 8)
  ctx.log(`${a.nombre}: ${ofertas.length} vuelos reales (${fuente})`)
  if (ofertas.length) ctx.decir(`${ofertas.length} vuelos reales; el más barato, ${fmtUSD(ofertas[0].total)} (${fuente}).`)
  else ctx.decir(`No encontré vuelos a ${AEROPUERTOS[b.destino].ciudad} con esos filtros.`)
  ctx.progreso(100, `${ofertas.length} vuelos · ${fuente}`)
  return { aerolinea: aero, nombre: a.nombre, ofertas, analizados: ofertas.length, fuente, sitio: sitio.estado, motivo: ofertas.length ? '' : 'Sin vuelos reales con esos filtros' }
}
