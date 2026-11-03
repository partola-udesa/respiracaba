/* RESPIRA — Cliente de la IA para la página.
 *
 * Llama a la función de Vercel /api/ia (app/api/ia.js), que es la que tiene la clave de Groq.
 * Todo lo que devuelve es INFERENCIA del LLM: mostrarlo con el estilo de "inferencia", nunca como dato duro.
 *
 * Uso en la página:
 *   const filtros = await RespiraIA.interpretarBusqueda('8 km desde Plaza Italia mañana a las 7, con poco ruido');
 *   const lectura = await RespiraIA.interpretarRecorridos({ preferencias, horario, clima, recorridos });
 *   // → { recomendado: 2, recorridos: [{ numero, titulo, explicacion }, …] }
 *   const chat = RespiraIA.nuevoChat();
 *   const respuesta = await chat.preguntar('¿Por qué esta ruta es mejor?', { ruta: ..., clima: ... });
 */
(function () {
  // [API IA] Todas las llamadas a la IA pasan por acá → función del servidor app/api/ia.js → Groq.
  // La clave (GROQ_API_KEY) vive SOLO en Vercel; esta página no la ve nunca.
  const ENDPOINT = (globalThis.CONFIG && CONFIG.iaURL) || '/api/ia';
  const ESPERA_MAX_MS = 30000;

  async function llamar(cuerpo, espera = ESPERA_MAX_MS) {
    const corte = new AbortController();
    const reloj = setTimeout(() => corte.abort(), espera);
    let r;
    try {
      r = await fetch(ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(cuerpo),
        signal: corte.signal
      });
    } catch (e) {
      throw new Error(e.name === 'AbortError' ? 'La IA tardó demasiado. Probá de nuevo.' : 'No se pudo conectar con la IA.');
    } finally {
      clearTimeout(reloj);
    }
    const j = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(j.error || 'No se pudo obtener la respuesta. Probá de nuevo.');
    return j;
  }

  /** Convierte el texto libre del runner en filtros. */
  async function interpretarBusqueda(texto) {
    return (await llamar({ tarea: 'busqueda', texto })).datos;
  }

  /** Lee los tres recorridos calculados (dato duro) y devuelve un título, una explicación y cuál recomienda. */
  async function interpretarRecorridos(contexto) {
    return (await llamar({ tarea: 'recorridos', contexto }, 15000)).datos;
  }

  /** Una pregunta suelta, sin historial. `contexto` son los datos que muestra la página (dato duro). */
  async function preguntar(pregunta, contexto) {
    return (await llamar({ tarea: 'chat', mensajes: [{ role: 'user', content: pregunta }], contexto })).texto;
  }

  /** Chat con historial. Si una respuesta falla, la pregunta se descarta para no dejar el historial cojo. */
  function nuevoChat() {
    const turnos = [];
    return {
      async preguntar(pregunta, contexto) {
        const mensajes = [...turnos, { role: 'user', content: pregunta }];
        const { texto } = await llamar({ tarea: 'chat', mensajes, contexto });
        turnos.push({ role: 'user', content: pregunta }, { role: 'assistant', content: texto });
        return texto;
      },
      reiniciar() { turnos.length = 0; },
      get turnos() { return turnos.slice(); }
    };
  }

  globalThis.RespiraIA = { interpretarBusqueda, interpretarRecorridos, preguntar, nuevoChat };
})();
