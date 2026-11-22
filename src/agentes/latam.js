/** Agente LATAM: la red más amplia desde Chile, con vuelos directos y conexiones por sus hubs. */
import { buscarAerolinea } from './motor-aerolinea.js'
import { fmtUSD } from '../nucleo/datos.js'

export const ficha = { id: 'latam', nombre: 'Agente LATAM', rol: 'Aerolínea · red más amplia' }

export function ejecutar(entrada, ctx) {
  return buscarAerolinea('latam', entrada, ctx, {
    encontre: (o, n) => o.escalas === 0
      ? `Tengo ${n} opciones; directo desde ${fmtUSD(o.total)} en total.`
      : `Tengo ${n} opciones; la mejor, ${fmtUSD(o.total)} con una escala.`,
    sinRuta: (c) => `A ${c} no tengo ruta esta vez.`,
    nada: 'Con esos filtros no me queda nada. ¿Relajamos el horario?',
  })
}
