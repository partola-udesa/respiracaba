# Prototipo funcional v7 — la experiencia alimenta el algoritmo (3 de noviembre de 2026)

Copia fija de la app tal como quedó en este commit. La app viva sigue en `app/`; esta carpeta no se toca más.

Qué cambia respecto de v6 (diseño, IA y mapa iguales):
- "Tu experiencia": sale la pregunta "¿Cómo describirías el ambiente del recorrido?" y sus chips.
- "¿El recorrido cumplió con lo que esperabas?"
  - **Sí**: no hay más preguntas. Aparece un aviso ("Vamos a seguir priorizando…") y todas las preferencias elegidas quedan confirmadas.
  - **No**: aparece "¿Qué no se cumplió?", con una fila por cada preferencia elegida en la búsqueda (y "Menos polen" si el runner es alérgico): *Se cumplió / A medias / No se cumplió*. Hay que responder al menos una para seguir.
- Aprendizaje (`app.js`, sección 14b): cada preferencia tiene un peso (1 = normal, entre 0,5 y 2,5) guardado en el teléfono (`respira-aprendizaje`). Confirmada +0,05 · a medias +0,15 · no se cumplió +0,3. Además se guarda el historial de respuestas.
- Algoritmo (`red.js`): el puntaje de preferencias de cada tramo pasa a ser un promedio ponderado por esos pesos; el peso del polen multiplica la penalización por polen al ordenar los recorridos.
- IA (`api/ia.js`): la tarea "recorridos" recibe `aprendizaje` (cuántas veces se cumplió cada preferencia) y el prompt le pide no volver a prometer una preferencia que falló y recomendar el recorrido que más la cuida.
- Recomendado: si alguna preferencia de la búsqueda ya falló (o se cumplió a medias), el recomendado es el recorrido 1 del algoritmo y no el que elige la IA; la IA solo escribe títulos y explicaciones, comparando entre recorridos y sin adjetivos absolutos ("buen nivel").
- Cada corrida guardada (`respira-corridas`) registra `evaluacion` en lugar de `ambiente`.

Para verla: abrir `index.html` en Chrome. La IA solo funciona publicada en Vercel con `GROQ_API_KEY`; sin eso aparece el resumen automático (el aprendizaje del algoritmo funciona igual).

> Orden de versiones: prototipo_funcional_v1 → … → v6 → prototipo_funcional_v7 (esta, la última). La versión en desarrollo vive en `app/`.
