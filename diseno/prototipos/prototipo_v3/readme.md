# Prototipo v3 — Lecturas en lenguaje simple, dato duro al pasar el mouse

🔗 **Figma:** https://www.figma.com/design/pDBZl9D6xiCBlijixOmvzz/respiracaba?node-id=49-590
(página "Baja fidelidad v2 y v3", debajo de la v2. El plan Starter de Figma permite solo 3 páginas por archivo, así que la v3 comparte página con la v2.)

**Fecha:** 2026-10-20
**Etapa:** Entrega 2 — baja fidelidad, tercera iteración.

## Qué cambia
Un número como "62,7 dBA" no le dice nada a una familia. En la v3, cada dato se muestra en **tres capas**:
1. **Lectura** (siempre visible): una frase en lenguaje simple y la posición de la comuna entre las 15. Sale de una **regla fija, no de la IA**:

   | Posición | Lectura |
   |---|---|
   | 1.ª a 3.ª | Entre las mejores de la ciudad |
   | 4.ª a 6.ª | Mejor que el promedio |
   | 7.ª a 9.ª | En el promedio |
   | 10.ª a 12.ª | Peor que el promedio |
   | 13.ª a 15.ª | Entre las peores de la ciudad |

2. **Dato duro** (al pasar el mouse): valor, fuente, promedio de CABA y, si existe, una referencia oficial. Para el ruido es la OMS (2018): menos de 45 dB de noche y menos de 53 dB como promedio ponderado de 24 h para el ruido de tránsito. En la calle, ninguna comuna cumple esa recomendación.
3. **Para ustedes ✦** (inferencia de la IA): qué significa ese dato para la búsqueda del usuario. Borde punteado.

Además, el **precio se traduce a un departamento concreto**: precio del m² × 70 m², por ejemplo "≈ USD 175.000 por un 3 ambientes de 70 m²". Se compara con el presupuesto del usuario.

## Pantallas
- **v3 · 02 · Resultados:** tarjetas sin números sueltos, con el precio traducido y 3 lecturas según las prioridades.
- **v3 · 03 · Detalle de comuna:** bloques "Lectura del dato". El de ruido nocturno aparece en estado hover como ejemplo.
- **v3 · 05 · Cómo se calcula el índice:** nueva sección "Cómo traducimos los datos a palabras", con la regla, las tres capas y la referencia de la OMS.
- **v3 · 06 · Comparar comunas:** cada celda muestra la lectura y la posición. El dato aparece al pasar el mouse; hay una celda en hover como ejemplo.
- Búsqueda, capa de cruces y chat no cambian respecto de la v2.

## Componentes nuevos
- **Lectura del dato:** variantes Reposo / Hover, con interacción "al pasar el mouse → Hover" configurada en Figma.
- **Celda / Lectura:** igual, para la tabla de comparación.
- **Tarjeta / Comuna v3**.

## Posiciones usadas (entre las 15 comunas)
| | Comuna 12 | Comuna 11 | Comuna 9 |
|---|---|---|---|
| Ruido nocturno (menos = mejor) | 1.ª | 3.ª | 2.ª |
| Ruido diurno | 2.ª | 1.ª | 6.ª |
| NO₂ | 2.ª | 9.ª | 13.ª |
| Verde, % de la superficie | 6.ª | 13.ª | 8.ª |
| Árboles por km² | 3.ª | 1.ª | 6.ª |
| Presión vial nocturna | 4.ª | 1.ª | 7.ª |
| Plátanos (menos = mejor) | 4.ª | 11.ª | 7.ª |
| Precio 3 amb. (más barata = 1.ª) | 12.ª | 8.ª | 4.ª |
| Caída de nacimientos 2020–25 (15.ª = mayor baja) | 15.ª | 11.ª | 14.ª |

El índice total (`[XX]`) y el orden del ranking siguen siendo de ejemplo.
