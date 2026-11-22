#!/usr/bin/env node
/**
 * WELY Travel desde la consola: corre el mismo código madre y los mismos agentes que la sala web,
 * cada uno en su propio hilo (worker_threads), y muestra el diálogo y las 3 mejores propuestas.
 *
 *   node madre-cli.mjs --origen SCL --destino MAD --ida 2027-04-10 --vuelta 2027-04-24 --adultos 2
 *   Otros filtros: --ninos 1 --clase economica|premium|business --escalas cualquiera|directo|max1
 *                  --equipaje personal|mano|bodega --horario cualquiera|manana|tarde|noche
 *                  --duracion-max 20 --precio-max 3000 --aerolineas latam,sky,jetsmart,copa,iberia
 *                  --prioridad equilibrado|precio|duracion --solo-ida --rapido
 *   --real   usa datos reales: scraping de los sitios + Google Flights (SerpApi, clave en .env)
 */
import { fileURLToPath } from 'node:url'
import { lanzadorNode, cargarEnv } from './src/nucleo/lanzador-node.mjs'
import { ejecutarBusqueda } from './src/nucleo/madre.js'
import { fmtUSD, fmtDur } from './src/nucleo/datos.js'

const arg = (n, d) => { const i = process.argv.indexOf(`--${n}`); return i > 0 ? process.argv[i + 1] : d }
const flag = (n) => process.argv.includes(`--${n}`)
const hoy = new Date(); const en = (d) => new Date(hoy.getTime() + d * 86400000).toISOString().slice(0, 10)
const busqueda = {
  tipo: flag('solo-ida') ? 'ida' : 'ida_vuelta', origen: arg('origen', 'SCL'), destino: arg('destino', 'MAD'),
  fechaIda: arg('ida', en(60)), fechaVuelta: arg('vuelta', en(74)), adultos: +arg('adultos', 2), ninos: +arg('ninos', 0),
  clase: arg('clase', 'economica'), escalas: arg('escalas', 'cualquiera'), equipaje: arg('equipaje', 'mano'),
  horario: arg('horario', 'cualquiera'), duracionMax: +arg('duracion-max', 0), precioMax: +arg('precio-max', 0),
  aerolineas: arg('aerolineas', 'latam,sky,jetsmart,copa,iberia').split(','), prioridad: arg('prioridad', 'equilibrado'),
  hoy: hoy.toISOString().slice(0, 10),
}
const NOMBRE = { latam: 'LATAM', sky: 'SKY', jetsmart: 'JetSMART', copa: 'Copa', iberia: 'Iberia', carolina: 'Carolina', francisco: 'Francisco', bob: 'Bob' }

await cargarEnv(fileURLToPath(new URL('./.env', import.meta.url)))
const real = flag('real')
const r = await ejecutarBusqueda(busqueda, {
  lanzar: lanzadorNode(real ? 'real' : 'demo'), velocidad: real ? 1 : flag('rapido') ? 0.05 : 1,
  emitir: (e) => {
    if (e.type === 'LOG_OUTPUT') console.log(`  ${e.line}`)
    if (e.type === 'AGENT_SAY') console.log(`💬 ${NOMBRE[e.agent]}: ${e.texto}`)
    if (e.type === 'RUN_FINISHED' && e.errores) console.log('✖', e.errores.join(' · '))
  },
})
if (r.propuestas?.length) {
  console.log('\n✈  LAS 3 MEJORES PROPUESTAS')
  r.propuestas.forEach((p, i) => console.log(`  ${i + 1}. ${p.etiqueta.padEnd(32)} ${p.nombre.padEnd(9)} ${fmtUSD(p.total).padStart(11)}  ida ${fmtDur(p.ida.duracion)} · ${p.escalas ? p.escalas + ' escala(s)' : 'directo'}${p.fuente ? ` · ${p.fuente}` : ''}${p.enlace ? `\n     ${p.enlace}` : ''}`))
  console.log('\n  ' + r.itinerario.join('\n  '))
}
