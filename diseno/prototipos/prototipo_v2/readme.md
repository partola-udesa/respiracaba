# Prototipo v2 — Baja fidelidad (iteración)

🔗 **Figma:** https://www.figma.com/design/pDBZl9D6xiCBlijixOmvzz/respiracaba?node-id=41-2
(página "Baja fidelidad v2" del archivo `respiracaba`; la v1 queda intacta en la página "Baja fidelidad")

**Fecha:** 2026-10-20
**Etapa:** Entrega 2 — prototipo de baja fidelidad, segunda iteración.

## Pantallas (desktop, 1440 px)
1. **v2 · 01 · Búsqueda:** el ejemplo de texto libre ahora incluye una alergia ("alérgica a los plátanos"). Se aclara que la etapa familiar define los pesos iniciales.
2. **v2 · 02 · Resultados:** selector de capas en el mapa (respirabilidad / cruces de tránsito) y nota de que Noche/Día solo cambia el ruido y los colectivos. Las tarjetas muestran el % de plátanos y el precio de los ambientes elegidos, y tienen la opción "Comparar".
3. **v2 · 02b · Resultados con la capa de cruces:** popover de un cruce (Donado y Av. Balbín, 5.327 vehículos/h) marcado como contexto que no entra al índice.
4. **v2 · 03 · Detalle de comuna:**
   - cada dato muestra su valor en la unidad propia y la comparación con el promedio de CABA, con un ⓘ que abre la limitación de la fuente;
   - la presión vial aparece desglosada (red vial / colectivos);
   - el NO₂ se aclara como satelital;
   - se suman la natalidad y los plátanos como contexto;
   - el precio de 2 ambientes se marca como cálculo propio.
5. **v2 · 04 · Chat abierto:** la IA explica el ranking a partir de los pesos y lo respalda con datos duros.
6. **v2 · 05 · Cómo se calcula el índice** (nueva): fórmula, paso a paso, pesos según la etapa familiar, fuentes y limitaciones, lo que se muestra pero no entra al índice, cómo leer dato duro e inferencia, y los cambios desde la Entrega 1.
7. **v2 · 06 · Comparar comunas** (nueva): tabla de las 3 comunas lado a lado, con el mejor valor marcado en cada fila y un resumen de la IA.

## Cambios respecto de la v1
- Natalidad visible en el detalle y en la comparación.
- Unidades duales: valor propio + % o dB vs promedio de CABA.
- Verde como "% de la superficie": no hay población por comuna para calcular m² por habitante.
- Tendencia de valor corregida a "estable": la natalidad baja en toda la ciudad, y en la Comuna 12 más rápido (−36 % vs −26 % desde 2020).
- Alérgenos personalizados según la especie que indica el usuario (plátanos).
- La explicación de la IA ya no habla de "la cuadra", porque la unidad que se muestra es la comuna.

## Datos usados (reales, de `datasets_procesados/` y datasets originales)
| Componente | Comuna 12 | Comuna 11 | Comuna 9 | CABA |
|---|---|---|---|---|
| NO₂ vs CABA (últimos 12 meses) | −9 % | +2 % | +6 % | — |
| Verde, % de la superficie | 6,8 % | 0,8 % | 4,4 % | 7,7 % |
| Árboles de vereda por km² | 2.493 | 2.644 | 2.204 | 1.811 |
| Ruido nocturno (dBA) | 62,7 | 64,4 | 63,3 | 65,9 |
| Presión vial nocturna vs CABA | −8 % | −27 % | −4 % | — |
| Plátanos, % de árboles de vereda | 7,0 % | 10,9 % | 7,2 % | — |
| Precio USD/m² 3 amb. 2025 (provisorio) | 2.507 | 2.123 | 1.669 | — |
| Nacimientos, cambio 2020–2025 | −36 % | −29 % | −32 % | −26 % |

Pendientes, marcados como `[XX]`: el índice total y el ranking. **El orden 12 → 11 → 9 sigue siendo de ejemplo.** El verde de la Comuna 11 (0,8 %) es muy bajo y conviene verificarlo en el dataset de espacios verdes.
