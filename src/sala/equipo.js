/**
 * El equipo de WELY Travel: quién se sienta en cada puesto de la oficina, qué dice que está haciendo
 * y de qué conversa cuando no hay búsquedas. Las claves son los puestos de la oficina.
 */
export const EQUIPO = {
  wely: {
    nombre: 'Capitana Wely', modulo: 'Código madre · madre.js',
    libre: ['Revisando el tablero de rutas', 'Esperando la próxima búsqueda', 'Coordinando al equipo', 'Leyendo novedades de aerolíneas', 'Ordenando prioridades del día'],
  },
  latam: {
    nombre: 'Agente LATAM', modulo: 'Aerolínea · red más amplia',
    libre: ['Revisando vuelos directos desde Santiago', 'Actualizando conexiones por Lima', 'Mirando cupos a Europa', 'Repasando tarifas con maleta', 'Ordenando su red de destinos'],
  },
  sky: {
    nombre: 'Agente SKY', modulo: 'Aerolínea · tarifa base baja',
    libre: ['Calculando tarifas base', 'Revisando rutas a Sudamérica', 'Ordenando cobros de equipaje', 'Mirando la ocupación de la semana', 'Afinando ofertas de temporada'],
  },
  jetsmart: {
    nombre: 'Agente JetSMART', modulo: 'Aerolínea · low cost',
    libre: ['Buscando la tarifa más baja', 'Revisando rutas regionales', 'Sumando extras de equipaje', 'Preparando ofertas de fin de semana', 'Mirando vuelos nacionales'],
  },
  copa: {
    nombre: 'Agente Copa', modulo: 'Aerolínea · vía Panamá',
    libre: ['Revisando conexiones en Panamá', 'Mirando vuelos al Caribe', 'Ordenando rutas a Norteamérica', 'Ajustando tiempos de escala', 'Revisando la puntualidad del hub'],
  },
  iberia: {
    nombre: 'Agente Iberia', modulo: 'Aerolínea · Europa vía Madrid',
    libre: ['Revisando el vuelo Santiago–Madrid', 'Mirando conexiones a Europa', 'Ordenando tarifas con maleta', 'Revisando cupos de temporada alta', 'Preparando rutas a Lisboa y Roma'],
  },
  carolina: {
    nombre: 'Carolina', modulo: 'Documentos y requisitos',
    libre: ['Actualizando requisitos de entrada', 'Revisando vigencias de pasaporte', 'Ordenando reglas para menores', 'Leyendo cambios migratorios', 'Comparando seguros de viaje'],
  },
  francisco: {
    nombre: 'Francisco', modulo: 'Torre de control',
    libre: ['Vigilando el radar de vuelos', 'Midiendo puntualidad por aerolínea', 'Siguiendo el precio de las rutas', 'Mirando el clima en los destinos', 'Ordenando el comparador'],
  },
  bob: {
    nombre: 'Bob', modulo: 'Itinerario y top 3',
    libre: ['Dibujando itinerarios de ejemplo', 'Afinando el puntaje de los vuelos', 'Pensando en el viaje perfecto', 'Ordenando bob por destino', 'Repasando el top 3 de ayer'],
  },
}
const FASES = {
  aerolinea: 'Buscando vuelos',
}

// Frase de actividad debajo del nombre del agente
export function actividad(id, modo, s, t, extra) {
  const e = EQUIPO[id] || {}
  if (extra) return extra
  if (modo === 'trabajando') return `⚙ ${s.msg || FASES.aerolinea}`
  if (modo === 'cola') return 'Esperando su turno'
  if (modo === 'omitido') return 'No seleccionada en esta búsqueda'
  if (modo === 'error') return 'Revisando qué falló'
  if (modo === 'exito') return s.resumen ? `✓ ${s.resumen}` : '¡Terminado!'
  const l = e.libre || ['En su puesto']
  const k = Math.floor(t / 11 + id.length * 7) % l.length
  return l[k]
}

// ------------------------------------------------------------------ conversaciones cuando no hay búsquedas
// [quien visita, a quien visita, líneas]; 'a' habla el visitante y 'b' el anfitrión.
export const CHARLAS = [
  ['sky', 'jetsmart', [['a', '¿Cuánto tienes hoy a Puerto Montt?'], ['b', 'Bastante bajo, ¿y tú?'], ['a', 'Parecido. Que decida el cliente.']]],
  ['jetsmart', 'sky', [['a', 'Ojo, se viene el fin de semana largo.'], ['b', 'Sí, ya subieron las búsquedas a La Serena.']]],
  ['latam', 'iberia', [['a', 'Iberia, ¿cómo va el directo a Madrid?'], ['b', 'Lleno en julio, como siempre.'], ['a', 'Igual que el mío.']]],
  ['iberia', 'latam', [['a', '¿Tú conectas a Roma desde Madrid o por São Paulo?'], ['b', 'Por São Paulo, y también directo a Roma.'], ['a', 'Buena competencia, entonces.']]],
  ['copa', 'francisco', [['a', 'Francisco, ¿cómo ves la puntualidad en Panamá?'], ['b', 'Muy buena esta semana.'], ['a', 'Eso ayuda con las escalas cortas.']]],
  ['francisco', 'copa', [['a', 'Copa, hay tormenta tropical cerca de Cancún.'], ['b', 'Gracias, aviso si cambian horarios.']]],
  ['carolina', 'francisco', [['a', '¿Para Nueva York siguen pidiendo ESTA?'], ['b', 'Sí, y conviene sacarla con tiempo.'], ['a', 'Lo dejo anotado en el checklist.']]],
  ['carolina', 'iberia', [['a', 'Iberia, ¿cuánta vigencia piden en el pasaporte?'], ['b', 'Al menos tres meses después del regreso.'], ['a', 'Perfecto, eso digo yo también.']]],
  ['bob', 'francisco', [['a', 'Francisco, ¿qué clima hace en Lisboa en octubre?'], ['b', 'Agradable, unos 22 grados.'], ['a', 'Ideal para caminar.']]],
  ['bob', 'wely', [['a', 'Capitana, ¿cuánto pesa el precio en el puntaje?'], ['b', 'Casi la mitad, si es equilibrado.'], ['a', 'Ok, y la duración un tercio.']]],
  ['wely', 'bob', [['a', 'Bob, ¿cómo va el top 3 de ayer?'], ['b', 'El cliente eligió la opción con maleta incluida.'], ['a', 'Siempre gana la que no tiene sorpresas.']]],
  ['wely', 'carolina', [['a', 'Carolina, ¿algún cambio en requisitos?'], ['b', 'Nada nuevo esta semana.'], ['a', 'Perfecto, avísame si cambia algo.']]],
  ['wely', 'latam', [['a', '¿Cómo vamos con los directos?'], ['b', 'Hoy salen todos a tiempo.'], ['a', 'Excelente.']]],
  ['francisco', 'jetsmart', [['a', 'JetSMART, tu puntualidad subió este mes.'], ['b', '¡Nos ponemos serios!']]],
  ['francisco', 'sky', [['a', 'SKY, la ruta a Lima viene bajando de precio.'], ['b', 'Lo vi, buena época para venderla.']]],
  ['jetsmart', 'carolina', [['a', 'Carolina, ¿para Buenos Aires basta la cédula?'], ['b', 'Sí, cédula vigente y listo.']]],
  ['sky', 'bob', [['a', 'Bob, ¿por qué no gané ayer?'], ['b', 'Tu tarifa era buena, pero sin maleta salía más cara.'], ['a', 'Touché.']]],
  ['iberia', 'bob', [['a', '¿Qué se recomienda el primer día en Madrid?'], ['b', 'Descansar y salir a cenar temprano.'], ['a', 'Temprano para España: a las diez.']]],
  ['copa', 'wely', [['a', 'Capitana, ¿hay búsquedas al Caribe hoy?'], ['b', 'Varias a Punta Cana.'], ['a', 'Me preparo.']]],
  ['latam', 'francisco', [['a', '¿Cómo está el clima en Isla de Pascua?'], ['b', 'Templado, unos 25 grados.'], ['a', 'Lo voy a recomendar más.']]],
  ['carolina', 'copa', [['a', 'Copa, para Cuba piden tarjeta de turista.'], ['b', 'Sí, la recordamos al vender.']]],
]
