/** Agente sky en modo real: su sitio oficial primero; si no, Google Flights. */
import { buscarReal } from './motor-real.mjs'
export const ejecutar = (entrada, ctx) => buscarReal('sky', entrada, ctx)
