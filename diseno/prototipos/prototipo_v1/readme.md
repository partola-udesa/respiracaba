# Prototipo v1 — Baja fidelidad (wireframes)

🔗 **Figma:** https://www.figma.com/design/pDBZl9D6xiCBlijixOmvzz/respiracaba?node-id=27-2
(página "Baja fidelidad" del archivo `respiracaba`)

**Fecha:** 2026-10-20
**Etapa:** Entrega 2 — prototipo de baja fidelidad. Escala de grises, sin paleta ni tipografía final.

## Pantallas (desktop, 1440 px)
1. **01 · Búsqueda:** texto libre (la IA lo convierte en filtros) u opciones guiadas: ambientes, presupuesto, etapa familiar y prioridades. Comprar activo; Alquilar figura como "próximamente".
2. **02 · Resultados:** filtros deducidos por la IA como chips editables, mapa de las 15 comunas con selector Noche/Día, ranking de 3 comunas, sliders para ajustar los pesos del índice y recomendación final.
3. **03 · Detalle de comuna:** componentes del índice (aire, verde, arbolado, ruido y presión vial con carrusel noche/día, alérgenos), precio del m², tendencia de valor estimada y explicación de la IA.
4. **04 · Chat abierto:** panel de la burbuja flotante con contexto de la comuna, respuesta de la IA respaldada por un dato duro y preguntas sugeridas.

Todas las pantallas llevan el disclaimer de datos al pie y la burbuja de chat.

## Componentes
Están en el tablero "Componentes (baja fidelidad)", en la misma página:
- bloque de **dato duro**: borde sólido, ícono cuadrado y fuente;
- bloque de **inferencia IA**: borde punteado, fondo gris y ✦;
- chip editable, slider de peso, dato con carrusel noche/día, tarjeta de comuna, burbuja de chat, header y disclaimer.

El dato duro y la inferencia se distinguen por **forma**, no por color, para que la diferencia se mantenga al aplicar la paleta.

## Datos usados
- **Reales:** ruido día/noche, presión vial, NO₂ (últimos 12 meses), árboles alergénicos y precio del m² 2025 (provisorio) de las comunas 12, 11 y 9. Vienen de `datasets_procesados/` (ver `datasets/diccionario.md`).
- **Marcadores pendientes:** el índice total (`[XX] %`) y el verde por habitante (`[ej.]`), que todavía no están calculados.
- **El ranking 12 → 11 → 9 es de ejemplo:** se armó con datos reales para la búsqueda de la pantalla 1, pero no sale del índice calculado.
