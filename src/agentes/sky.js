/** Agente SKY: tarifa base baja en Chile y Sudamérica; detalla lo que suman maleta y asiento. */
import { buscarAerolinea } from './motor-aerolinea.js'
import { fmtUSD } from '../nucleo/datos.js'

export const ficha = { id: 'sky', nombre: 'Agente SKY', rol: 'Aerolínea · tarifa base baja' }

export function ejecutar(entrada, ctx) {
  return buscarAerolinea('sky', entrada, ctx, {
    encontre: (o, n) => o.extraEquipaje
      ? `${n} opciones desde ${fmtUSD(o.total)}, ya con ${fmtUSD(o.extraEquipaje)} de equipaje sumado.`
      : `${n} opciones desde ${fmtUSD(o.total)} en total.`,
    sinRuta: (c) => `A ${c} no vuelo, pero en Sudamérica me tienen.`,
    sinClase: 'Solo vendo clase económica; esta vez paso.',
    nada: 'Con esos filtros no me quedan vuelos.',
  })
}
