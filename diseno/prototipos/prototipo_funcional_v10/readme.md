# Prototipo funcional v10 — sin "Cerca del agua" y solo dentro de CABA (16 de noviembre de 2026)

Copia fija de la app a partir de v9. Esta carpeta no se toca más.

Qué cambia respecto de v9 (diseño, IA, mapa y celebraciones iguales):
- **Sin "Cerca del agua":** se sacó la condición porque no es algo que el runner pueda accionar. Ya no aparece en "Personalizá tus condiciones", ni en los títulos de los recorridos ("Junto al agua"), ni en lo que se le manda a la IA, ni entre las prioridades que la IA puede devolver. `capas.js` se sigue cargando por el polen.
- **Solo recorridos dentro de la Ciudad:** el control ya no usa un rectángulo (que dejaba pasar partes de Vicente López, Avellaneda, Lanús y Valentín Alsina), sino el contorno real de CABA: las 15 comunas de `datasets/comunas.zip` unidas en un polígono y simplificado a ~10 m (`CABA_CONTORNO` y `dentroDeCABA()` en `datos.js`).
- **Aviso "Zona no disponible para armar el recorrido."** cuando el lugar existe pero está fuera de CABA: en las sugerencias del buscador (en vez de "No encontramos ese lugar"), en "Usar mi ubicación", en "Contalo con tus palabras", al tocar "Continuar" y al repetir una corrida guardada antes de este cambio.
- El buscador primero consulta OpenStreetMap dentro de la caja de la Ciudad; solo si no encuentra nada en CABA hace una segunda consulta para saber si el lugar existe afuera.

Para verla: abrir `index.html` en Chrome. La IA solo funciona publicada en Vercel con `GROQ_API_KEY`.

> Orden de versiones: prototipo_funcional_v1 → … → v9 → prototipo_funcional_v10 (esta, la última). La versión en desarrollo vive en `app/`.
