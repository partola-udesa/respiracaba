# Prototipo funcional v6 — "Vidrio claro" con IA y mapa funcionando (2 de noviembre de 2026)

Copia fija de la app tal como quedó en este commit (igual a la publicada en https://respiracaba-app.vercel.app). La app viva sigue en `app/`; esta carpeta no se toca más.

Qué cambia respecto de v5 (el diseño "Vidrio claro" es el mismo):
- IA: Groq dio de baja los modelos Llama 3.x el 16/8/2026. Ahora usa `openai/gpt-oss-120b` (recorridos y chat) y `openai/gpt-oss-20b` (búsqueda), con razonamiento corto y límites de tokens más altos.
- IA: los puntajes se mandan como `silencio`, `poco_transito` y `aire_limpio` (antes `ruido`, `transito`, `aire`), y el prompt aclara que un puntaje alto es favorable y que dB y NO2 van al revés. Antes la IA describía como "ruidoso" un recorrido silencioso.
- Mapa: CARTO empezó a pedir clave ("API KEY REQUIRED"). El mapa base ahora es Esri Light Gray Canvas, sin clave y con atribución.

Para verla: abrir `index.html` en Chrome. La IA solo funciona publicada en Vercel con `GROQ_API_KEY` (Settings → Environment Variables); sin eso aparece el resumen automático.

> Orden de versiones: prototipo_funcional_v1 → v2 → v3 → v4 → v5 → prototipo_funcional_v6 (esta, la última). La versión en desarrollo vive en `app/`.
