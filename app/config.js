/* =====================================================================
   RESPIRA — Servicios externos y claves (un solo lugar para todo)
   ---------------------------------------------------------------------
   Qué usa la app y si necesita clave:

   | Servicio                         | Para qué                          | ¿Clave?                                   |
   |----------------------------------|-----------------------------------|-------------------------------------------|
   | Open-Meteo (pronóstico por hora) | viento, temperatura, lluvia, UV   | NO. Gratis para uso no comercial.         |
   | CARTO (mapa base claro)          | el mapa de fondo                  | NO. Gratis con atribución.                |
   | Photon / Nominatim (OSM)         | buscar direcciones                | NO. Uso moderado, con atribución.         |
   | Groq (IA, modelos gpt-oss)       | interpretar recorridos, chat      | SÍ: GROQ_API_KEY, SOLO en el servidor.    |

   ⚠️ Ninguna clave va en este archivo ni en ningún archivo de app/ que no sea app/api/:
   todo lo que está en app/ lo puede leer cualquiera que abra la página.
   La clave de Groq se carga en Vercel → Project → Settings → Environment Variables
   (nombre GROQ_API_KEY) y la usa solo app/api/ia.js. Para probar en la compu,
   copiar .env.example como .env.local y completar el valor (está en .gitignore).
   ===================================================================== */
const CONFIG = {
  // --- Clima hora por hora (app/clima.js) ---
  // Open-Meteo no pide clave. Si algún día el proyecto pasa a uso comercial, se contrata un plan,
  // se cambia la URL por https://customer-api.open-meteo.com/v1/forecast y la clave se agrega
  // DESDE UNA FUNCIÓN DEL SERVIDOR (como app/api/ia.js), nunca acá.
  climaURL: 'https://api.open-meteo.com/v1/forecast',

  // --- Mapa base (app/mapa.js) ---
  teselas: 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
  atribucion: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> · © <a href="https://carto.com/attributions">CARTO</a> · Clima <a href="https://open-meteo.com">Open-Meteo</a>',

  // --- IA (app/ia.js → app/api/ia.js → Groq) ---
  // [API IA] La página nunca habla con Groq directo: llama a esta función del servidor,
  // que agrega la clave GROQ_API_KEY. Si la función no está (abriendo index.html con doble clic),
  // la app usa los textos automáticos que arma con los datasets.
  iaURL: '/api/ia'
};
