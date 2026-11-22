/** Agente Copa: conecta Santiago con Norteamérica, Centroamérica y el Caribe vía Panamá. */
import { buscarAerolinea } from './motor-aerolinea.js'
import { fmtUSD, fmtDur } from '../nucleo/datos.js'

export const ficha = { id: 'copa', nombre: 'Agente Copa', rol: 'Aerolínea · conexión vía Panamá' }

export function ejecutar(entrada, ctx) {
  return buscarAerolinea('copa', entrada, ctx, {
    encontre: (o, n) => `${n} opciones vía Panamá; la mejor, ${fmtUSD(o.total)} y ${fmtDur(o.ida.duracion)} de viaje.`,
    sinRuta: (c) => `A ${c} no llego desde Panamá esta vez.`,
    nada: 'Con esos filtros no me queda ninguna conexión.',
  })
}
