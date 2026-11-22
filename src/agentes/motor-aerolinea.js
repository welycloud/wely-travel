/**
 * Motor común de las aerolíneas: arma las rutas posibles, genera los vuelos del día con su horario
 * y calcula la tarifa (distancia, temporada, anticipación, escalas, clase y equipaje).
 * Cada agente de aerolínea (latam.js, sky.js…) lo usa con su propia ficha y personalidad.
 * Todo es simulado y determinista: la misma búsqueda entrega los mismos resultados.
 */
import { AEROPUERTOS, AEROLINEAS, distanciaKm, azar, fmtUSD } from '../nucleo/datos.js'

const ap = (c) => AEROPUERTOS[c]

function rutas(aero, O, D) {
  const a = AEROLINEAS[aero]
  const dest = ap(D), orig = ap(O)
  if (!dest || !orig || O === D) return { lista: [], motivo: 'Ruta no válida' }
  const region = dest.region === 'chile' ? orig.region : dest.region
  if (a.soloDesde && O !== a.soloDesde && D !== a.soloDesde) return { lista: [], motivo: `Solo opera desde ${ap(a.soloDesde).ciudad}` }
  if (a.destinosViaHub) {
    const [hub] = a.hubs
    const otro = O === a.soloDesde ? D : O
    if (!a.destinosViaHub.includes(otro)) return { lista: [], motivo: `No vuela a ${ap(otro).ciudad}` }
    const camino = otro === hub ? [a.soloDesde, hub] : [a.soloDesde, hub, otro]
    return { lista: [O === a.soloDesde ? camino : [...camino].reverse()] }
  }
  if (!a.regiones.includes(dest.region) || !a.regiones.includes(orig.region)) return { lista: [], motivo: `No vuela a ${dest.ciudad}` }
  const dir = (x, y) => (x === 'SCL' && a.directosDesdeSCL.includes(y)) || (y === 'SCL' && a.directosDesdeSCL.includes(x))
  const lista = []
  if (dir(O, D)) lista.push([O, D])
  if (O !== 'SCL' && D !== 'SCL' && dir(O, 'SCL') && dir('SCL', D)) lista.push([O, 'SCL', D])
  for (const h of a.hubs) {
    if (h === 'SCL' || h === O || h === D) continue
    if (a.lowcost && region !== 'sudamerica' && region !== 'chile') continue
    const llegaHub = O === 'SCL' ? dir('SCL', h) : dir(O, 'SCL') && dir('SCL', h)
    if (!llegaHub || !['sudamerica', 'norte', 'europa'].includes(dest.region === 'chile' ? orig.region : dest.region)) continue
    if (dest.region === 'chile') continue
    const ida = O === 'SCL' ? ['SCL', h, D] : [O, 'SCL', h, D]
    if (ida.length <= 4 && !lista.some((r) => r.join() === ida.join())) lista.push(ida)
  }
  if (!lista.length) return { lista: [], motivo: `Sin conexión a ${dest.ciudad}` }
  return { lista: lista.slice(0, 3) }
}

// Hora local de llegada a partir de la salida (minutos desde medianoche local del origen)
function vuelosDeRuta(aero, camino, fecha, r) {
  const a = AEROLINEAS[aero]
  const n = 2 + Math.floor(r() * 2)
  const vuelos = []
  for (let k = 0; k < n; k++) {
    let t = Math.round((5 + r() * 18.5) * 12) * 5 // salida local entre 05:00 y 23:30
    const salida = t
    let utc = t - ap(camino[0]).utc * 60
    const tramos = []
    for (let i = 0; i < camino.length - 1; i++) {
      const de = ap(camino[i]), hacia = ap(camino[i + 1])
      const km = distanciaKm(de, hacia)
      const dur = Math.round((km / 790) * 60 + 32)
      if (i > 0) utc += Math.round(75 + r() * 160) // escala
      const sale = utc
      utc += dur
      tramos.push({ de: de.cod, a: hacia.cod, vuelo: `${a.prefijo} ${100 + Math.floor(r() * 8800)}`, sale, llega: utc, km })
    }
    const total = utc - (salida - ap(camino[0]).utc * 60)
    const llegadaLocal = utc + ap(camino.at(-1)).utc * 60
    vuelos.push({
      camino, escalas: camino.length - 2, salida, llegada: ((llegadaLocal % 1440) + 1440) % 1440,
      dias: Math.floor(llegadaLocal / 1440), duracion: total, km: tramos.reduce((s, x) => s + x.km, 0),
      tramos: tramos.map((x) => ({ de: x.de, a: x.a, vuelo: x.vuelo })), fecha,
    })
  }
  return vuelos
}

function tarifa(aero, v, busqueda, r) {
  const a = AEROLINEAS[aero]
  const hoy = new Date(busqueda.hoy || Date.now())
  const f = new Date(v.fecha + 'T12:00:00')
  const dias = Math.max(0, Math.round((f - hoy) / 86400000))
  const mes = f.getMonth()
  let p = (38 + v.km * 0.052) * a.factor
  if (v.km > 7000) p *= 0.86
  p *= [1.12, 1, 0.9][Math.min(2, v.escalas)]
  p *= dias < 7 ? 1.45 : dias < 21 ? 1.2 : dias < 45 ? 1.05 : dias > 120 ? 0.92 : 1
  if ([0, 1, 6, 11].includes(mes)) p *= 1.15
  if ([5, 0].includes(f.getDay())) p *= 1.07
  p *= 0.9 + r() * 0.25
  p *= { economica: 1, premium: 1.75, business: 3.1 }[busqueda.clase] || 1
  return Math.round(p)
}

export const horarioDe = (min) => (min >= 300 && min < 720 ? 'manana' : min >= 720 && min < 1140 ? 'tarde' : 'noche')

export async function buscarAerolinea(aero, entrada, ctx, frases = {}) {
  const b = entrada.busqueda
  const a = AEROLINEAS[aero]
  const r = azar(`${aero}|${b.origen}|${b.destino}|${b.fechaIda}|${b.fechaVuelta}|${b.clase}`)
  const pausa = (base) => ctx.esperar(base * (0.7 + r() * 0.8))
  const pax = b.adultos + b.ninos

  ctx.progreso(4, 'Conectando con su sistema de reservas')
  ctx.log(`${a.nombre}: consulta ${b.origen} → ${b.destino} · ${b.fechaIda}${b.tipo === 'ida_vuelta' ? ` / ${b.fechaVuelta}` : ''} · ${pax} pasajero(s)`)
  await pausa(1100)

  if (a.lowcost && b.clase !== 'economica') {
    ctx.decir(frases.sinClase || `Solo vendo clase económica, así que esta vez paso.`)
    ctx.progreso(100, 'Sin tarifas en esa clase')
    return { aerolinea: aero, nombre: a.nombre, ofertas: [], analizados: 0, motivo: 'Solo vende clase económica' }
  }
  const { lista, motivo } = rutas(aero, b.origen, b.destino)
  if (!lista.length) {
    ctx.log(`${a.nombre}: ${motivo}`)
    ctx.decir(frases.sinRuta ? frases.sinRuta(ap(b.destino).ciudad) : `${motivo}. Paso esta vez.`)
    ctx.progreso(100, motivo)
    return { aerolinea: aero, nombre: a.nombre, ofertas: [], analizados: 0, motivo }
  }

  ctx.progreso(22, `Buscando vuelos de ida (${lista.length} ruta${lista.length > 1 ? 's' : ''})`)
  await pausa(1500)
  const idas = lista.flatMap((c) => vuelosDeRuta(aero, c, b.fechaIda, r))
  for (const v of idas.slice(0, 4)) ctx.log(`${a.nombre}: ${v.tramos.map((t) => `${t.vuelo} ${t.de}-${t.a}`).join(' · ')}`)

  let vueltas = [null]
  if (b.tipo === 'ida_vuelta') {
    ctx.progreso(45, 'Buscando vuelos de vuelta')
    await pausa(1400)
    vueltas = lista.flatMap((c) => vuelosDeRuta(aero, [...c].reverse(), b.fechaVuelta, r))
  }

  ctx.progreso(68, 'Calculando tarifas y equipaje')
  await pausa(1200)
  const region = ap(b.destino).region === 'chile' ? ap(b.origen).region : ap(b.destino).region
  const incluyeBodega = a.bodega(region)
  const incluyeMano = !a.lowcost
  const tramos = b.tipo === 'ida_vuelta' ? 2 : 1
  let extra = 0
  if (b.equipaje === 'bodega' && !incluyeBodega) extra += (region === 'chile' ? 32 : 45) * pax * tramos
  if (b.equipaje !== 'personal' && !incluyeMano) extra += (region === 'chile' ? 18 : 26) * pax * tramos

  const todas = []
  for (const ida of idas) for (const vuelta of vueltas) {
    const base = tarifa(aero, ida, b, r) + (vuelta ? tarifa(aero, vuelta, b, r) : 0)
    const porAdulto = base
    const total = base * b.adultos + base * 0.75 * b.ninos + extra
    todas.push({
      id: `${aero}-${todas.length}`, aerolinea: aero, nombre: a.nombre, ida, vuelta,
      porAdulto, extraEquipaje: extra, total: Math.round(total), clase: b.clase,
      equipaje: { mano: incluyeMano, bodega: incluyeBodega }, puntualidad: a.puntualidad,
      duracion: ida.duracion + (vuelta ? vuelta.duracion : 0), escalas: Math.max(ida.escalas, vuelta ? vuelta.escalas : 0),
    })
  }

  ctx.progreso(86, 'Aplicando filtros')
  await pausa(800)
  const filtradas = todas.filter((o) => {
    if (b.escalas === 'directo' && o.escalas > 0) return false
    if (b.escalas === 'max1' && o.escalas > 1) return false
    if (b.horario !== 'cualquiera' && horarioDe(o.ida.salida) !== b.horario) return false
    if (b.duracionMax > 0 && (o.ida.duracion > b.duracionMax * 60 || (o.vuelta && o.vuelta.duracion > b.duracionMax * 60))) return false
    if (b.precioMax > 0 && o.total > b.precioMax) return false
    return true
  }).sort((x, y) => x.total - y.total).slice(0, 8)

  ctx.log(`${a.nombre}: ${todas.length} combinaciones analizadas, ${filtradas.length} cumplen los filtros`)
  if (filtradas.length) {
    const mejor = filtradas[0]
    ctx.decir(frases.encontre ? frases.encontre(mejor, filtradas.length) : `Tengo ${filtradas.length} opciones; la mejor, ${fmtUSD(mejor.total)} en total.`)
  } else ctx.decir(frases.nada || 'Con esos filtros no me queda ninguna opción.')
  ctx.progreso(100, `${filtradas.length} opciones`)
  return { aerolinea: aero, nombre: a.nombre, ofertas: filtradas, analizados: todas.length, motivo: filtradas.length ? '' : 'Ninguna cumple los filtros' }
}
