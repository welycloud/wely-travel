#!/usr/bin/env node
/**
 * Servidor local de WELY Travel en MODO REAL.
 * Sirve la sala (dist/) y ejecuta el código madre en tu computador: los agentes abren el sitio de
 * cada aerolínea (scraping) y usan Google Flights vía SerpApi. Los eventos llegan a la sala en vivo (SSE).
 *
 *   node server/servidor.mjs            → http://localhost:4173
 *   Requiere el archivo .env con SERPAPI_KEY=...  (ver .env.ejemplo)
 */
import http from 'node:http'
import { exec } from 'node:child_process'
import { readFile, stat, copyFile, access } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { ejecutarBusqueda } from '../src/nucleo/madre.js'
import { lanzadorNode, cargarEnv } from '../src/nucleo/lanzador-node.mjs'

const RAIZ = fileURLToPath(new URL('..', import.meta.url))
// Primera vez: crea .env desde la plantilla para que cada persona pegue su propia clave
try { await access(path.join(RAIZ, '.env')) } catch {
  try { await copyFile(path.join(RAIZ, '.env.ejemplo'), path.join(RAIZ, '.env')); console.log('Creé el archivo .env: abre .env y pega tu clave de SerpApi (serpapi.com) en SERPAPI_KEY.') } catch {}
}
await cargarEnv(path.join(RAIZ, '.env'))
const DIST = path.join(RAIZ, 'dist')
const PUERTO = +process.env.PORT || 4173
const TIPOS = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.webp': 'image/webp', '.png': 'image/png', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.woff': 'font/woff', '.json': 'application/json', '.txt': 'text/plain; charset=utf-8', '.md': 'text/plain; charset=utf-8' }
let ocupado = false

const servidor = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`)
  if (url.pathname === '/api/estado') {
    res.writeHead(200, { 'Content-Type': 'application/json' })
    return res.end(JSON.stringify({ real: true, serpapi: Boolean(process.env.SERPAPI_KEY), scraping: process.env.SCRAPING !== 'off' }))
  }
  if (url.pathname === '/api/buscar') {
    if (ocupado) { res.writeHead(409); return res.end('Ya hay una búsqueda en curso') }
    let busqueda
    try { busqueda = JSON.parse(url.searchParams.get('b')) } catch { res.writeHead(400); return res.end('Búsqueda inválida') }
    res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-store', Connection: 'keep-alive' })
    const enviar = (ev) => res.write(`data: ${JSON.stringify(ev)}\n\n`)
    ocupado = true
    console.log(`\n✈  ${busqueda.origen} → ${busqueda.destino} · ${busqueda.fechaIda}${busqueda.fechaVuelta ? ` / ${busqueda.fechaVuelta}` : ''}`)
    try {
      await ejecutarBusqueda(busqueda, {
        lanzar: lanzadorNode('real'),
        emitir: (ev) => { enviar(ev); if (ev.type === 'LOG_OUTPUT') console.log(`  ${ev.line}`) },
      })
    } catch (e) { enviar({ type: 'RUN_FINISHED', exitCode: 1, errores: [e.message] }) }
    ocupado = false
    enviar({ type: 'FIN_STREAM' })
    return res.end()
  }
  // archivos estáticos
  let archivo = path.join(DIST, decodeURIComponent(url.pathname))
  if (!archivo.startsWith(DIST)) { res.writeHead(403); return res.end() }
  try { if ((await stat(archivo)).isDirectory()) archivo = path.join(archivo, 'index.html') } catch { archivo = path.join(DIST, 'index.html') }
  try {
    const datos = await readFile(archivo)
    res.writeHead(200, { 'Content-Type': TIPOS[path.extname(archivo)] || 'application/octet-stream' })
    res.end(datos)
  } catch { res.writeHead(404); res.end('No encontrado') }
})
servidor.listen(PUERTO, '127.0.0.1', () => {
  console.log(`WELY Travel · modo real en http://localhost:${PUERTO}`)
  console.log(process.env.SERPAPI_KEY && !/tu_clave/.test(process.env.SERPAPI_KEY) ? '  SerpApi: clave cargada' : '  ⚠ Falta SERPAPI_KEY en .env (sin ella no hay respaldo con Google Flights)')
  console.log(process.env.SCRAPING === 'off' ? '  Scraping de sitios: desactivado' : '  Scraping de sitios: activado (se abrirán ventanas del navegador)')
  console.log('  Deja esta ventana abierta mientras uses WELY Travel. Para apagarlo: Ctrl + C')
  // abre el centro de mando en el navegador
  const url = `http://localhost:${PUERTO}`
  if (!process.env.NO_ABRIR) exec(process.platform === 'win32' ? `start "" "${url}"` : process.platform === 'darwin' ? `open ${url}` : `xdg-open ${url}`, () => {})
})
