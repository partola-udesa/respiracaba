# Prototipo funcional v3 — sistema gráfico v5, datasets y mapa interactivo (2 de noviembre de 2026)

Copia fija de la app tal como quedó en el commit `4cbfa2b`. La app viva sigue en `app/`; esta carpeta no se toca más.

Qué tiene:
- Sistema gráfico v5: Josefin Sans + Inter, radios de 4 a 14 px, áreas táctiles de 44 px, íconos Material Symbols solo donde reemplazan texto.
- Peso con balanza, distancia escrita y buscador de partida/llegada para cualquier lugar de CABA.
- Cada condición vinculada a su dataset, índice por tramo (`datos/red.js`) y tres recorridos calculados con Dijkstra, interpretados por la IA.
- Mapa real (Leaflet + OpenStreetMap): elegir en el mapa elige en la lista y al revés.

Para verla: abrir `index.html` en Chrome. La interpretación de la IA solo funciona publicada en Vercel; sin eso aparece el resumen automático.

> Orden de versiones: prototipo_funcional_v1 → prototipo_funcional_v2 → prototipo_funcional_v3 (esta) → prototipo_funcional_v4. La versión en desarrollo vive en `app/`.
