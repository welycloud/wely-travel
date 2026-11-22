/** Agente JetSMART: la tarifa más baja en rutas nacionales y regionales; muestra el total con extras. */
import { buscarAerolinea } from './motor-aerolinea.js'
import { fmtUSD } from '../nucleo/datos.js'

export const ficha = { id: 'jetsmart', nombre: 'Agente JetSMART', rol: 'Aerolínea · low cost' }

export function ejecutar(entrada, ctx) {
  return buscarAerolinea('jetsmart', entrada, ctx, {
    encontre: (o, n) => `¡${n} opciones! La más barata, ${fmtUSD(o.total)} con todo incluido.`,
    sinRuta: (c) => `${c} no está en mi red. Para la próxima.`,
    sinClase: 'Lo mío es la clase económica; esta vez no compito.',
    nada: 'Con esos filtros me quedé sin vuelos.',
  })
}
