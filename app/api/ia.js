/* RESPIRA — Función de Vercel que habla con el LLM (Groq).
 *
 * La clave de Groq nunca llega al navegador: la página llama a /api/ia y esta función le agrega la clave
 * y el prompt del sistema. Los prompts están acá y versionados en prompts/prompts_v3.md.
 * [API IA] Este es el único lugar que conoce la clave. Para sumar una función de IA nueva (ver "Dónde entra la IA" en el readme),
 * se agrega una "tarea" acá y una función en app/ia.js.
 *
 * Variables de entorno (Vercel → Settings → Environment Variables, o .env.local para `vercel dev`):
 *   GROQ_API_KEY        obligatoria (https://console.groq.com/keys)
 *   GROQ_MODEL          opcional, modelo para el chat (por defecto MODELO_CHAT)
 *   GROQ_MODEL_RAPIDO   opcional, modelo para interpretar la búsqueda (por defecto MODELO_RAPIDO)
 *
 * POST /api/ia  (JSON)
 *   { "tarea": "chat", "mensajes": [{ "role": "user", "content": "..." }, ...], "contexto": { ... } }
 *     → { "texto": "..." }
 *   { "tarea": "busqueda", "texto": "Quiero correr 8 km desde Plaza Italia mañana a las 7" }
 *     → { "datos": { "partida", "llegada", "km", "horario", "prioridades" } }
 *   { "tarea": "recorridos", "contexto": { "preferencias", "horario", "clima", "recorridos": [ … ] } }
 *     → { "datos": { "recomendado": 1, "recorridos": [{ "numero", "titulo", "explicacion" }] } }
 */
const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';
const MODELO_CHAT = process.env.GROQ_MODEL || 'openai/gpt-oss-120b';
const MODELO_RAPIDO = process.env.GROQ_MODEL_RAPIDO || 'openai/gpt-oss-20b';
// Los modelos gpt-oss razonan antes de responder y ese razonamiento cuenta dentro de max_tokens:
// por eso los límites son más altos y se pide razonamiento corto (más rápido y más barato).
// Los Llama 3.x que se usaban antes los dio de baja Groq el 16/8/2026.
const RAZONA = m => m.startsWith('openai/gpt-oss');

// Límites para que la función no se use como proxy gratis de Groq ni se manden contextos gigantes.
const MAX_MENSAJES = 10;
const MAX_CARACTERES_MENSAJE = 2000;
const MAX_CARACTERES_CONTEXTO = 20000;
const PRIORIDADES = ['aire', 'verde', 'arbolado', 'ruido', 'transito', 'sombra', 'agua'];

const REGLAS_CHAT = `Sos el asistente de RESPIRA, una app para runners de la Ciudad de Buenos Aires que propone recorridos según un índice de respirabilidad calculado calle por calle (arbolado, espacios verdes, NO2 satelital, ruido y presión vial) y el pronóstico del clima.
Escribí en español rioplatense, tuteando, en frases cortas y claras para alguien sin conocimientos técnicos. No uses markdown, ni listas, ni títulos. Respondé en 120 palabras como máximo.
Usá solo los datos del CONTEXTO. Si mencionás un número, tiene que ser uno de esos datos, y decí de qué fuente viene (por ejemplo "según el Mapa de Ruido 2018"). Si la pregunta no se puede responder con esos datos, decilo.
Lo que escribís es una inferencia, no un dato duro: no lo presentes como medición. No des consejos médicos ni afirmes que la contaminación causa un efecto en la salud: hablá de coincidencias. La recomendación es una alternativa más; quien decide es el runner.`;

const REGLAS_BUSQUEDA = (hoy) => `Convertí el pedido de un runner de la Ciudad de Buenos Aires en filtros para buscar un recorrido. Respondé solo con un objeto JSON con estas claves:
{"partida": texto o null, "llegada": texto o null, "km": número o null, "horario": "AAAA-MM-DDTHH:MM" o null, "prioridades": lista con algunos de ${JSON.stringify(PRIORIDADES)}}
Reglas: "partida" y "llegada" son lugares tal como los dice el pedido (dirección, plaza, parque, esquina). Si dice que vuelve al mismo lugar o que es un circuito, "llegada" es igual a "partida". Si no dice algo, poné null; no inventes. "horario" es hora de Buenos Aires; hoy es ${hoy}. "prioridades" solo incluye lo que el pedido menciona (por ejemplo "poco ruido" → "ruido", "sin colectivos ni autos" → "transito", "con árboles" → "arbolado").`;

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return responder(res, 405, { error: 'Usá POST' });
  }
  if (!process.env.GROQ_API_KEY) return responder(res, 500, { error: 'Falta configurar GROQ_API_KEY' });

  let cuerpo = req.body;
  if (typeof cuerpo === 'string') {
    try { cuerpo = JSON.parse(cuerpo); } catch { return responder(res, 400, { error: 'El cuerpo no es JSON' }); }
  }
  if (!cuerpo || typeof cuerpo !== 'object') return responder(res, 400, { error: 'Falta el cuerpo' });

  try {
    if (cuerpo.tarea === 'chat') return await chat(res, cuerpo);
    if (cuerpo.tarea === 'busqueda') return await busqueda(res, cuerpo);
    if (cuerpo.tarea === 'recorridos') return await recorridos(res, cuerpo);
    return responder(res, 400, { error: 'tarea tiene que ser "chat", "busqueda" o "recorridos"' });
  } catch (e) {
    return responder(res, e.estado || 502, { error: e.message || 'No se pudo obtener la respuesta' });
  }
};

async function chat(res, { mensajes, contexto }) {
  if (!Array.isArray(mensajes) || !mensajes.length) return responder(res, 400, { error: 'Faltan mensajes' });
  // Solo turnos de usuario y asistente, alternados y terminando en el usuario.
  const turnos = [];
  for (const m of mensajes.slice(-MAX_MENSAJES)) {
    if (!m || !['user', 'assistant'].includes(m.role) || typeof m.content !== 'string') continue;
    const content = m.content.slice(0, MAX_CARACTERES_MENSAJE);
    const previo = turnos[turnos.length - 1];
    if (previo && previo.role === m.role) previo.content += '\n\n' + content;
    else turnos.push({ role: m.role, content });
  }
  while (turnos.length && turnos[0].role !== 'user') turnos.shift();
  if (!turnos.length || turnos[turnos.length - 1].role !== 'user') {
    return responder(res, 400, { error: 'El último mensaje tiene que ser del usuario' });
  }
  const textoContexto = contexto ? JSON.stringify(contexto) : '{}';
  if (textoContexto.length > MAX_CARACTERES_CONTEXTO) return responder(res, 413, { error: 'El contexto es demasiado grande' });

  const texto = await groq({
    model: MODELO_CHAT,
    messages: [{ role: 'system', content: `${REGLAS_CHAT}\n\nCONTEXTO: ${textoContexto}` }, ...turnos],
    temperature: 0.4,
    max_tokens: 1200
  });
  return responder(res, 200, { texto: texto.trim() });
}

const REGLAS_RECORRIDOS = `Sos el asistente de RESPIRA, una app para runners de la Ciudad de Buenos Aires. La app ya calculó tres recorridos sobre la red de calles; cada tramo tiene un puntaje de 0 a 100 por condición (más alto = mejor para correr) que sale de datasets de la Ciudad: vegetación (arbolado lineal y espacios verdes), aire (NO2 satelital Sentinel-5P), ruido (Mapa de ruido 2018), tránsito (vías principales y colectivos), sombra (altura del arbolado), terreno e iluminación (OpenStreetMap), cercanía al agua (río, Riachuelo y lagos de OpenStreetMap).
Ojo con la dirección de los números: los puntajes por condición siempre son "qué tan bien está", nunca "cuánto hay". Un puntaje de ruido de 78 quiere decir que el recorrido es SILENCIOSO, no ruidoso; un puntaje de tránsito alto quiere decir POCO tránsito; un puntaje de aire alto quiere decir aire más limpio. Nunca escribas "ruido alto (78)" ni "mucho tránsito (70)" a partir de un puntaje: decí "más silencioso", "menos tránsito". En cambio, los datos duros sí miden cantidad: más decibeles (dB) es más ruido y más NO2 es peor aire. Si citás un número, preferí el dato duro (por ejemplo "62 dB según el Mapa de Ruido 2018") antes que el puntaje.
Si el runner tiene alergia a plátano, fresno o ligustro, cada recorrido trae "polen": un riesgo de 0 a 100 armado con los árboles de esa especie del arbolado público lineal que hay al lado de la ruta, los que quedan del lado de donde viene el viento según el pronóstico de Open-Meteo y la época del año. No es una medición de polen: decilo así si lo mencionás, y no des consejos médicos.
Te paso esos números en el CONTEXTO. Tu tarea es interpretarlos para el runner, teniendo en cuenta sus preferencias, el horario y el clima si está.
Respondé SOLO con un objeto JSON: {"recomendado": número del recorrido que más se ajusta a las preferencias, "recorridos": [{"numero": 1, "titulo": "2 a 4 palabras que lo distingan de los otros (por ejemplo 'Más verde', 'Más tranquilo', 'Más directo')", "explicacion": "una o dos frases, 35 palabras como máximo"}]} con un elemento por cada recorrido del contexto.
Reglas: español rioplatense, tuteando, frases simples, sin tecnicismos. Usá solo los números del contexto y no inventes otros; si citás uno, decí de dónde sale (por ejemplo "según el Mapa de Ruido 2018"). Compará los recorridos entre sí. No des consejos médicos ni digas que algo causa un efecto en la salud. Los títulos tienen que ser distintos entre sí.`;

async function recorridos(res, { contexto }) {
  if (!contexto || !Array.isArray(contexto.recorridos) || !contexto.recorridos.length) return responder(res, 400, { error: 'Faltan los recorridos' });
  const texto = JSON.stringify(contexto);
  if (texto.length > MAX_CARACTERES_CONTEXTO) return responder(res, 413, { error: 'El contexto es demasiado grande' });
  const crudo = await groq({
    model: MODELO_CHAT,
    messages: [{ role: 'system', content: REGLAS_RECORRIDOS }, { role: 'user', content: 'CONTEXTO: ' + texto }],
    temperature: 0.3,
    max_tokens: 1800,
    response_format: { type: 'json_object' }
  });
  let j;
  try { j = JSON.parse(crudo); } catch { return responder(res, 502, { error: 'La IA no devolvió JSON válido' }); }
  // Lo que devuelve el LLM se revisa antes de mandarlo a la página.
  const numeros = contexto.recorridos.map(r => r.numero);
  const lista = Array.isArray(j.recorridos) ? j.recorridos : [];
  const datos = {
    recomendado: numeros.includes(Number(j.recomendado)) ? Number(j.recomendado) : null,
    recorridos: numeros.map(n => {
      const r = lista.find(x => Number(x && x.numero) === n) || {};
      const t = v => (typeof v === 'string' ? v.trim() : '');
      return { numero: n, titulo: t(r.titulo).slice(0, 40) || null, explicacion: t(r.explicacion).slice(0, 320) || null };
    })
  };
  return responder(res, 200, { datos });
}

async function busqueda(res, { texto }) {
  if (typeof texto !== 'string' || !texto.trim()) return responder(res, 400, { error: 'Falta el texto' });
  const crudo = await groq({
    model: MODELO_RAPIDO,
    messages: [
      { role: 'system', content: REGLAS_BUSQUEDA(hoyEnBA()) },
      { role: 'user', content: texto.slice(0, 1500) }
    ],
    temperature: 0,
    max_tokens: 1000,
    response_format: { type: 'json_object' }
  });
  let f;
  try { f = JSON.parse(crudo); } catch { return responder(res, 502, { error: 'La IA no devolvió JSON válido' }); }
  return responder(res, 200, { datos: limpiarFiltros(f) });
}

/** Deja solo valores con el tipo esperado: lo que devuelve el LLM no se usa sin revisar. */
function limpiarFiltros(f) {
  const texto = v => (typeof v === 'string' && v.trim() ? v.trim().slice(0, 200) : null);
  const km = Number(f.km);
  return {
    partida: texto(f.partida),
    llegada: texto(f.llegada),
    km: Number.isFinite(km) && km > 0 && km <= 60 ? Math.round(km * 10) / 10 : null,
    horario: typeof f.horario === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(f.horario) ? f.horario : null,
    prioridades: Array.isArray(f.prioridades) ? [...new Set(f.prioridades.filter(p => PRIORIDADES.includes(p)))] : []
  };
}

async function groq(cuerpo) {
  const r = await fetch(GROQ_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.GROQ_API_KEY}` },
    body: JSON.stringify(RAZONA(cuerpo.model) ? { ...cuerpo, reasoning_effort: 'low' } : cuerpo)
  });
  if (!r.ok) {
    const e = new Error(r.status === 429 ? 'Hubo demasiadas consultas seguidas. Probá de nuevo en un rato.'
                                         : 'Groq respondió ' + r.status);
    e.estado = r.status === 429 ? 429 : 502;
    throw e;
  }
  const j = await r.json();
  return j.choices?.[0]?.message?.content || '';
}

function hoyEnBA() {
  const ba = new Date(Date.now() - 3 * 3600 * 1000);  // UTC−3
  const dias = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
  return `${dias[ba.getUTCDay()]} ${ba.toISOString().slice(0, 16)}`;
}

function responder(res, estado, datos) {
  res.setHeader('Cache-Control', 'no-store');
  return res.status(estado).json(datos);
}
