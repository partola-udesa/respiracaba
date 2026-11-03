# Prototipo funcional v9 — respirabilidad clara y celebraciones (3 de noviembre de 2026)

Copia fija de la app tal como quedó en este commit (igual a la publicada en https://respiracaba-app.vercel.app). La app viva sigue en `app/`; esta carpeta no se toca más.

Qué cambia respecto de v8 (IA, mapa y "Tu experiencia" iguales):
- **Opciones de recorrido:** el porcentaje va siempre con una barrita y la leyenda "respirabilidad". "Recomendado" pasa a ser una etiqueta al lado del título (antes reemplazaba a la leyenda).
- **Terminar recorrido = un logro** (`celebracion.js`): soplo de aire que sube, arpegio de campanas y un acorde abierto que queda flotando (Web Audio, sin archivos). Luz que florece desde el botón, tres anillos como respiraciones y partículas de aire que suben; el botón dice "¡Lo lograste!" y en Android vibra. En "Tu recorrido completado" el porcentaje sube de 0 al valor junto con la barra.
- **Guardar recorrido = satisfacción instantánea:** dos notas brillantes, rebote del botón, un anillo y una chispa corta (menos de un segundo).
- Con "reducir movimiento" activado en el teléfono, las animaciones se simplifican; el sonido se mantiene.

Para verla: abrir `index.html` en Chrome. La IA solo funciona publicada en Vercel con `GROQ_API_KEY`.

> Orden de versiones: prototipo_funcional_v1 → … → v8 → prototipo_funcional_v9 (esta, la última). La versión en desarrollo vive en `app/`.
