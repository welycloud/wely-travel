/**
 * Carolina · Documentos y requisitos. Revisa qué se necesita para entrar al país de destino con
 * pasaporte chileno, la vigencia mínima del pasaporte y lo que piden los menores. Orientativo.
 */
import { AEROPUERTOS, REQUISITOS } from '../nucleo/datos.js'

export const ficha = { id: 'carolina', nombre: 'Carolina', rol: 'Documentos y requisitos' }

export async function ejecutar({ busqueda: b }, ctx) {
  const dest = AEROPUERTOS[b.destino]
  ctx.progreso(10, `Revisando requisitos de ${dest.pais}`)
  await ctx.esperar(1600)
  const req = [...(REQUISITOS[dest.pais] || ['Pasaporte vigente', 'Revisar requisitos en el consulado'])]
  ctx.log(`Carolina: ${dest.pais} → ${req.join(' · ')}`)
  ctx.progreso(45, 'Vigencia del pasaporte')
  await ctx.esperar(1300)
  if (b.ninos > 0) req.push('Menores: autorización notarial si no viajan con ambos padres')
  ctx.progreso(75, 'Seguro de viaje')
  await ctx.esperar(1100)
  const internacional = dest.pais !== 'Chile'
  if (internacional) req.push('Seguro de viaje recomendado')
  ctx.decir(internacional
    ? `Para ${dest.pais}: ${req[0].toLowerCase()}${req[1] ? ` y ${req[1].toLowerCase()}` : ''}.`
    : 'Vuelo nacional: basta con la cédula vigente.')
  ctx.progreso(100, 'Requisitos listos')
  return { pais: dest.pais, requisitos: req, nota: 'Información orientativa; verificar en fuentes oficiales antes de viajar.' }
}
