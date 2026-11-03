# Prototipo funcional v5 — sistema gráfico v7 "Vidrio claro" (2 de noviembre de 2026)

Copia fija de la app tal como quedó en este commit. La app viva sigue en `app/`; esta carpeta no se toca más.

Qué cambia respecto de v4 (todo lo demás es igual: perfil, alergias con viento, recorridos, detalle, "En recorrido"):
- Sistema gráfico v7 "Vidrio claro": fondo en degradado verde-gris neblinoso (`#E7ECE6` → `#D5DDD6`), superficies de vidrio translúcido con más desenfoque, borde blanco y sombra verde suave.
- Acentos oscuros: el acento pasa del lima `#C8F169` al verde bosque `#1F3B2D` (botón principal, selección, ruta en el mapa). Verde fresco `#6FA35A` solo para brillos.
- Tarjetas, chips, condiciones, campos y botón secundario ahora son de vidrio. Nuevas variables: `--capa`, `--linea`, `--pista`, `--sombra`, `--brillo`.
- Mapa base claro de CARTO (`light_all`) teñido de verde grisáceo; amarillo y rojo del polen más oscuros para leerse sobre fondo claro.
- Pendiente: pasar la paleta a las variables de Figma.

Para verla: abrir `index.html` en Chrome. La interpretación de la IA solo funciona publicada en Vercel (con `GROQ_API_KEY`); sin eso aparece el resumen automático.

> Orden de versiones: prototipo_funcional_v1 → v2 → v3 → v4 → prototipo_funcional_v5 (esta). La versión en desarrollo vive en `app/`.
