/**
 * Datos de referencia de WELY Travel: aeropuertos, cobertura de cada aerolínea y clima aproximado.
 *
 * Todo es ilustrativo: las rutas y precios se simulan a partir de estos datos (distancia, temporada,
 * anticipación) para que la demo se comporte de forma creíble. No hay conexión con ninguna aerolínea.
 */

// [código, ciudad, país, región, lat, lon, huso UTC, temp. media anual °C, amplitud térmica °C]
const A = [
  // Chile
  ['SCL', 'Santiago', 'Chile', 'chile', -33.39, -70.79, -3, 15, 7],
  ['ARI', 'Arica', 'Chile', 'chile', -18.35, -70.34, -3, 19, 3],
  ['IQQ', 'Iquique', 'Chile', 'chile', -20.54, -70.18, -3, 18, 3],
  ['CJC', 'Calama', 'Chile', 'chile', -22.5, -68.9, -3, 12, 5],
  ['ANF', 'Antofagasta', 'Chile', 'chile', -23.44, -70.45, -3, 17, 3],
  ['LSC', 'La Serena', 'Chile', 'chile', -29.92, -71.2, -3, 14, 3],
  ['CCP', 'Concepción', 'Chile', 'chile', -36.77, -73.06, -3, 12, 4],
  ['ZCO', 'Temuco', 'Chile', 'chile', -38.93, -72.63, -3, 11, 5],
  ['PMC', 'Puerto Montt', 'Chile', 'chile', -41.44, -73.09, -3, 10, 4],
  ['PUQ', 'Punta Arenas', 'Chile', 'chile', -53.0, -70.85, -3, 6, 5],
  ['IPC', 'Isla de Pascua', 'Chile', 'chile', -27.16, -109.42, -5, 21, 3],
  // Sudamérica
  ['LIM', 'Lima', 'Perú', 'sudamerica', -12.02, -77.11, -5, 19, 4],
  ['CUZ', 'Cusco', 'Perú', 'sudamerica', -13.54, -71.94, -5, 12, 2],
  ['AEP', 'Buenos Aires', 'Argentina', 'sudamerica', -34.56, -58.42, -3, 18, 6],
  ['MDZ', 'Mendoza', 'Argentina', 'sudamerica', -32.83, -68.79, -3, 16, 8],
  ['BRC', 'Bariloche', 'Argentina', 'sudamerica', -41.15, -71.16, -3, 8, 6],
  ['MVD', 'Montevideo', 'Uruguay', 'sudamerica', -34.84, -56.03, -3, 16, 6],
  ['GRU', 'São Paulo', 'Brasil', 'sudamerica', -23.43, -46.47, -3, 20, 3],
  ['GIG', 'Río de Janeiro', 'Brasil', 'sudamerica', -22.81, -43.25, -3, 24, 3],
  ['FLN', 'Florianópolis', 'Brasil', 'sudamerica', -27.67, -48.55, -3, 21, 4],
  ['BOG', 'Bogotá', 'Colombia', 'sudamerica', 4.7, -74.15, -5, 14, 1],
  ['CTG', 'Cartagena', 'Colombia', 'sudamerica', 10.44, -75.51, -5, 28, 1],
  ['UIO', 'Quito', 'Ecuador', 'sudamerica', -0.13, -78.36, -5, 14, 1],
  // Norte, Centroamérica y Caribe
  ['PTY', 'Ciudad de Panamá', 'Panamá', 'norte', 9.07, -79.38, -5, 27, 1],
  ['CUN', 'Cancún', 'México', 'norte', 21.04, -86.87, -5, 27, 3],
  ['MEX', 'Ciudad de México', 'México', 'norte', 19.44, -99.07, -6, 17, 3],
  ['PUJ', 'Punta Cana', 'Rep. Dominicana', 'norte', 18.57, -68.36, -4, 27, 2],
  ['HAV', 'La Habana', 'Cuba', 'norte', 22.99, -82.41, -5, 25, 3],
  ['MIA', 'Miami', 'Estados Unidos', 'norte', 25.79, -80.29, -5, 25, 4],
  ['JFK', 'Nueva York', 'Estados Unidos', 'norte', 40.64, -73.78, -5, 13, 11],
  ['LAX', 'Los Ángeles', 'Estados Unidos', 'norte', 33.94, -118.41, -8, 18, 4],
  ['YYZ', 'Toronto', 'Canadá', 'norte', 43.68, -79.63, -5, 8, 13],
  // Europa
  ['MAD', 'Madrid', 'España', 'europa', 40.49, -3.57, 1, 15, 9],
  ['BCN', 'Barcelona', 'España', 'europa', 41.3, 2.08, 1, 16, 7],
  ['LIS', 'Lisboa', 'Portugal', 'europa', 38.77, -9.13, 0, 17, 6],
  ['CDG', 'París', 'Francia', 'europa', 49.01, 2.55, 1, 12, 8],
  ['FCO', 'Roma', 'Italia', 'europa', 41.8, 12.24, 1, 16, 8],
  ['LHR', 'Londres', 'Reino Unido', 'europa', 51.47, -0.45, 0, 11, 7],
  ['AMS', 'Ámsterdam', 'Países Bajos', 'europa', 52.31, 4.76, 1, 10, 7],
  // Oceanía
  ['AKL', 'Auckland', 'Nueva Zelanda', 'oceania', -37.0, 174.79, 12, 15, 4],
  ['SYD', 'Sídney', 'Australia', 'oceania', -33.94, 151.18, 10, 18, 5],
]
export const AEROPUERTOS = Object.fromEntries(A.map(([cod, ciudad, pais, region, lat, lon, utc, tmedia, tamp]) =>
  [cod, { cod, ciudad, pais, region, lat, lon, utc, tmedia, tamp }]))
export const ORIGENES = A.filter((a) => a[3] === 'chile').map((a) => a[0])

// Cobertura simulada de cada aerolínea (para la demo; no representa la red real)
export const AEROLINEAS = {
  latam: {
    nombre: 'LATAM', prefijo: 'LA', factor: 1.0, hubs: ['SCL', 'LIM', 'GRU', 'BOG'],
    regiones: ['chile', 'sudamerica', 'norte', 'europa', 'oceania'],
    directosDesdeSCL: ['ARI', 'IQQ', 'CJC', 'ANF', 'LSC', 'CCP', 'ZCO', 'PMC', 'PUQ', 'IPC', 'LIM', 'AEP', 'MDZ', 'MVD', 'GRU', 'GIG', 'FLN', 'BOG', 'CUN', 'PUJ', 'MIA', 'JFK', 'LAX', 'MAD', 'BCN', 'LHR', 'FCO', 'AKL', 'SYD', 'CUZ'],
    bodega: (region) => !['chile', 'sudamerica'].includes(region), // tarifa básica regional sin maleta
    puntualidad: 0.86,
  },
  sky: {
    nombre: 'SKY', prefijo: 'H2', factor: 0.82, hubs: ['SCL', 'LIM'], lowcost: true,
    regiones: ['chile', 'sudamerica'],
    directosDesdeSCL: ['ARI', 'IQQ', 'CJC', 'ANF', 'LSC', 'CCP', 'ZCO', 'PMC', 'PUQ', 'LIM', 'AEP', 'MVD', 'GIG', 'FLN', 'CUZ'],
    bodega: () => false,
    puntualidad: 0.8,
  },
  jetsmart: {
    nombre: 'JetSMART', prefijo: 'JA', factor: 0.72, hubs: ['SCL', 'LIM', 'AEP'], lowcost: true,
    regiones: ['chile', 'sudamerica'],
    directosDesdeSCL: ['ARI', 'IQQ', 'CJC', 'ANF', 'LSC', 'CCP', 'ZCO', 'PMC', 'PUQ', 'LIM', 'AEP', 'MDZ', 'BRC', 'GRU', 'FLN', 'BOG'],
    bodega: () => false,
    puntualidad: 0.88,
  },
  copa: {
    nombre: 'Copa', prefijo: 'CM', factor: 0.95, hubs: ['PTY'],
    regiones: ['norte', 'sudamerica'], soloDesde: 'SCL',
    destinosViaHub: ['PTY', 'CUN', 'MEX', 'PUJ', 'HAV', 'MIA', 'JFK', 'LAX', 'YYZ', 'BOG', 'CTG', 'UIO'],
    bodega: () => true,
    puntualidad: 0.9,
  },
  iberia: {
    nombre: 'Iberia', prefijo: 'IB', factor: 1.02, hubs: ['MAD'],
    regiones: ['europa'], soloDesde: 'SCL',
    destinosViaHub: ['MAD', 'BCN', 'LIS', 'CDG', 'FCO', 'LHR', 'AMS'],
    bodega: () => true,
    puntualidad: 0.84,
  },
}

// Requisitos de entrada orientativos para pasaporte chileno (simplificado; siempre verificar en fuentes oficiales)
export const REQUISITOS = {
  Chile: ['Cédula de identidad vigente'],
  Perú: ['Cédula de identidad vigente o pasaporte', 'Sin visa para turismo'],
  Argentina: ['Cédula de identidad vigente o pasaporte', 'Sin visa para turismo'],
  Uruguay: ['Cédula de identidad vigente o pasaporte', 'Sin visa para turismo'],
  Brasil: ['Cédula de identidad vigente o pasaporte', 'Sin visa para turismo'],
  Colombia: ['Cédula de identidad vigente o pasaporte', 'Formulario de migración en línea antes de volar'],
  Ecuador: ['Cédula de identidad vigente o pasaporte', 'Sin visa para turismo'],
  Panamá: ['Pasaporte vigente', 'Sin visa para turismo'],
  México: ['Pasaporte vigente', 'Sin visa para turismo'],
  'Rep. Dominicana': ['Pasaporte vigente', 'Formulario electrónico e-Ticket'],
  Cuba: ['Pasaporte vigente', 'Tarjeta de turista y seguro médico obligatorio'],
  'Estados Unidos': ['Pasaporte electrónico vigente', 'Autorización ESTA aprobada antes de volar'],
  Canadá: ['Pasaporte vigente', 'Revisar si corresponde eTA o visa'],
  España: ['Pasaporte vigente al menos 3 meses tras el regreso', 'Sin visa hasta 90 días (Schengen)', 'Revisar si ya rige ETIAS'],
  Portugal: ['Pasaporte vigente al menos 3 meses tras el regreso', 'Sin visa hasta 90 días (Schengen)'],
  Francia: ['Pasaporte vigente al menos 3 meses tras el regreso', 'Sin visa hasta 90 días (Schengen)'],
  Italia: ['Pasaporte vigente al menos 3 meses tras el regreso', 'Sin visa hasta 90 días (Schengen)'],
  'Países Bajos': ['Pasaporte vigente al menos 3 meses tras el regreso', 'Sin visa hasta 90 días (Schengen)'],
  'Reino Unido': ['Pasaporte vigente', 'Autorización electrónica ETA'],
  'Nueva Zelanda': ['Pasaporte vigente', 'Autorización NZeTA'],
  Australia: ['Pasaporte vigente', 'Visa electrónica de turista'],
}

// ------------------------------------------------------------------ utilidades
export function distanciaKm(a, b) {
  const R = 6371, r = Math.PI / 180
  const dLat = (b.lat - a.lat) * r, dLon = (b.lon - a.lon) * r
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * r) * Math.cos(b.lat * r) * Math.sin(dLon / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(h))
}
// Generador pseudoaleatorio con semilla: la misma búsqueda entrega siempre los mismos vuelos
export function azar(semilla) {
  let h = 2166136261
  for (const c of String(semilla)) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619) }
  return () => { h += 0x6d2b79f5; let t = h; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296 }
}
// Temperatura máxima promedio aproximada del mes (modelo simple por ciudad y hemisferio)
export function climaMes(cod, mes) {
  const a = AEROPUERTOS[cod]
  const pico = a.lat < 0 ? 0 : 6 // enero en el sur, julio en el norte
  const t = a.tmedia + a.tamp * Math.cos((2 * Math.PI * (mes - pico)) / 12)
  return { max: Math.round(t + 5), min: Math.round(t - 5) }
}
export const fmtUSD = (n) => `USD ${Math.round(n).toLocaleString('es-CL')}`
export const fmtDur = (min) => `${Math.floor(min / 60)} h ${String(Math.round(min % 60)).padStart(2, '0')} m`
