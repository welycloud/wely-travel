/**
 * Cliente de SerpApi · Google Flights (solo Node). Convierte la respuesta al formato de oferta que
 * usan los agentes y guarda cada consulta en caché local (.cache/) por 6 horas para ahorrar búsquedas.
 * Documentación: https://serpapi.com/google-flights-api
 */
import { createHash } from 'node:crypto'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const RAIZ = fileURLToPath(new URL('../..', import.meta.url))
const CACHE = path.join(RAIZ, '.cache')
const HORAS = 6

export const tieneClave = () => Boolean(process.env.SERPAPI_KEY) && !/tu_clave/.test(process.env.SERPAPI_KEY)

// Códigos IATA con que Google Flights identifica a cada grupo
export const CODIGOS = { latam: 'LA,JJ,LP,XL', sky: 'H2', jetsmart: 'JA,JZ', copa: 'CM', iberia: 'IB' }

export function parametros(b, extra = {}) {
  const p = {
    engine: 'google_flights', hl: 'en', gl: 'cl', currency: 'USD',
    departure_id: b.origen, arrival_id: b.destino, outbound_date: b.fechaIda,
    type: b.tipo === 'ida_vuelta' ? '1' : '2', adults: String(b.adultos), children: String(b.ninos || 0),
    travel_class: { economica: '1', premium: '2', business: '3' }[b.clase] || '1',
    stops: { cualquiera: '0', directo: '1', max1: '2' }[b.escalas] || '0',
    bags: b.equipaje === 'personal' ? '0' : '1',
  }
  if (b.tipo === 'ida_vuelta') p.return_date = b.fechaVuelta
  if (b.precioMax > 0) p.max_price = String(b.precioMax)
  if (b.duracionMax > 0) p.max_duration = String(b.duracionMax * 60)
  const horas = { manana: '5,11', tarde: '12,18', noche: '19,4' }[b.horario]
  if (horas) p.outbound_times = horas
  return { ...p, ...extra }
}

export async function consultar(params, log = () => {}) {
  if (!tieneClave()) throw new Error('Falta tu clave de SerpApi en el archivo .env (SERPAPI_KEY)')
  const llave = createHash('sha1').update(JSON.stringify(params)).digest('hex')
  const archivo = path.join(CACHE, `${llave}.json`)
  try {
    const c = JSON.parse(await readFile(archivo, 'utf8'))
    if (Date.now() - c.t < HORAS * 3600e3) { log('SerpApi: respuesta desde caché (no gasta búsquedas)'); return c.data }
  } catch {}
  const url = new URL(process.env.SERPAPI_BASE || 'https://serpapi.com/search.json')
  for (const [k, v] of Object.entries({ ...params, api_key: process.env.SERPAPI_KEY })) url.searchParams.set(k, v)
  const r = await fetch(url, { signal: AbortSignal.timeout(60000) })
  const data = await r.json().catch(() => ({}))
  if (!r.ok || data.error) {
    if (/hasn't returned any results/i.test(data.error || '')) return { best_flights: [], other_flights: [] }
    throw new Error(`SerpApi: ${data.error || `HTTP ${r.status}`}`)
  }
  await mkdir(CACHE, { recursive: true })
  await writeFile(archivo, JSON.stringify({ t: Date.now(), data }))
  return data
}

const AEROLINEA_DE = (nombre = '') => {
  const n = nombre.toLowerCase()
  if (n.includes('latam')) return 'latam'
  if (n.includes('sky')) return 'sky'
  if (n.includes('jetsmart')) return 'jetsmart'
  if (n.includes('copa')) return 'copa'
  if (n.includes('iberia')) return 'iberia'
  return null
}
const minutos = (s) => { const m = /(\d{1,2}):(\d{2})/.exec(s || ''); return m ? +m[1] * 60 + +m[2] : 0 }
const dia = (s) => (s || '').slice(0, 10)

// Un itinerario de Google Flights → el formato "vuelo" de WELY Travel
export function aVuelo(it) {
  const fl = it.flights || []
  const primero = fl[0] || {}, ultimo = fl.at(-1) || {}
  const salidaDia = dia(primero.departure_airport?.time), llegadaDia = dia(ultimo.arrival_airport?.time)
  return {
    camino: [primero.departure_airport?.id, ...fl.map((f) => f.arrival_airport?.id)],
    escalas: Math.max(0, fl.length - 1),
    salida: minutos(primero.departure_airport?.time),
    llegada: minutos(ultimo.arrival_airport?.time),
    dias: salidaDia && llegadaDia ? Math.round((new Date(llegadaDia) - new Date(salidaDia)) / 864e5) : 0,
    duracion: it.total_duration || fl.reduce((s, f) => s + (f.duration || 0), 0),
    fecha: salidaDia,
    tramos: fl.map((f) => ({ de: f.departure_airport?.id, a: f.arrival_airport?.id, vuelo: f.flight_number, aerolinea: f.airline })),
  }
}

export function aOfertas(data, b, fuente) {
  const its = [...(data.best_flights || []), ...(data.other_flights || [])]
  const pax = b.adultos + (b.ninos || 0)
  return its.filter((it) => it.price).map((it, i) => {
    const ext = (it.flights || []).flatMap((f) => f.extensions || []).join(' | ')
    const aerolinea = AEROLINEA_DE(it.flights?.[0]?.airline)
    const mano = /carry-on bag included|carry-on included/i.test(ext) || !/carry-on bag not included|no carry-on/i.test(ext)
    return {
      id: `${fuente}-${i}`, aerolinea: aerolinea || 'otra', nombre: it.flights?.[0]?.airline || 'Otra', fuente,
      ida: aVuelo(it), vuelta: null, departure_token: it.departure_token || null, booking_token: it.booking_token || null,
      total: it.price, porAdulto: Math.round(it.price / pax), extraEquipaje: 0, clase: b.clase,
      equipaje: { mano, bodega: /checked bag included|1st checked bag included/i.test(ext) },
      puntualidad: /often delayed/i.test(ext) ? 0.7 : 0.85,
      duracion: it.total_duration || 0, escalas: Math.max(0, (it.flights || []).length - 1),
      enlace: data.search_metadata?.google_flights_url || null,
    }
  })
}
