/** Agente Iberia: Santiago–Madrid y conexiones a Europa vía Madrid. */
import { buscarAerolinea } from './motor-aerolinea.js'
import { fmtUSD } from '../nucleo/datos.js'

export const ficha = { id: 'iberia', nombre: 'Agente Iberia', rol: 'Aerolínea · Europa vía Madrid' }

export function ejecutar(entrada, ctx) {
  return buscarAerolinea('iberia', entrada, ctx, {
    encontre: (o, n) => `${n} opciones a Europa; desde ${fmtUSD(o.total)}, maleta incluida.`,
    sinRuta: (c) => `Lo mío es Europa; ${c} queda fuera de mi red.`,
    nada: 'Con esos filtros no me queda vuelo a Europa.',
  })
}
