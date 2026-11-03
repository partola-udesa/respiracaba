# Prototipo funcional v8 — cierre de la IA (3 de noviembre de 2026)

Copia fija de la app tal como quedó en este commit (igual a la publicada en https://respiracaba-app.vercel.app). La app viva sigue en `app/`; esta carpeta no se toca más.

Qué cambia respecto de v7 (diseño, mapa y "Tu experiencia" iguales):
- **"Contalo con tus palabras"** en "Definí tu recorrido": el runner escribe, por ejemplo, "8 km desde Plaza Italia mañana a las 7, con poco ruido". La IA (tarea `busqueda`) lo entiende y la app busca los lugares en los datasets y OpenStreetMap y completa partida, llegada, distancia, horario y condiciones. El runner revisa y toca "Continuar"; si un lugar no es claro, se abren las sugerencias.
- **"Preguntale a RESPIRA"** en el detalle del recorrido: chat con preguntas sugeridas y campo libre (tarea `chat`). Recibe el recorrido elegido, los otros dos, clima, preferencias y lo aprendido de "Tu experiencia". Una conversación por recorrido.
- Prompts más estrictos con los números: un puntaje no lleva unidad, sin nombres internos de los datos, comparando entre recorridos. Documentados en `prompts/prompts_v4.md`.
- Límites de Groq: razonamiento bajo y `max_tokens` 1800 (recorridos) / 1200 (chat) / 1000 (búsqueda) para no pasar los ~8.000 tokens por minuto del plan gratis; si Groq pide esperar pocos segundos, el servidor reintenta una vez.
- Fuera de alcance (ver `decisiones.md`): leer el comentario con IA y el dictado con Whisper.

Para verla: abrir `index.html` en Chrome. La IA solo funciona publicada en Vercel con `GROQ_API_KEY`; sin eso, la búsqueda avisa que se complete a mano, los recorridos muestran el resumen automático y el chat muestra el error.

> Orden de versiones: prototipo_funcional_v1 → … → v7 → prototipo_funcional_v8 (esta, la última). La versión en desarrollo vive en `app/`.
