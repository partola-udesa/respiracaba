# Prototipo funcional v12 — Tu archivo, la pirueta (17 de noviembre de 2026)

Copia fija de la app a partir de v11. Flujo tomado del frame **"Pirueta"** (Figma `respiracaba`, página "prototipo funcional"); inspiración: cintas de fotos en 3D (WAUI, cápsulas en onda, anillo de Framer).

## Qué cambia respecto de v11
- **Tu archivo** (pantalla `#archivo`, `archivo.js`): cada recorrido terminado suma una foto. Las fotos son cápsulas verticales que viajan por una **onda 3D que respira** (CSS 3D + `requestAnimationFrame`, sin librerías). Se arrastra para recorrer el tiempo, con inercia e imán; sola avanza una foto cada 3 s. Al abrir, las fotos salen de un mazo y se despliegan.
- **La vuelta de tuerca — "Tu respiración"**: la misma onda se reacomoda como un gráfico. La altura de cada foto = respirabilidad de ese recorrido (dato calculado), su largo = los km, y la línea punteada = **promedio de todas las calles de CABA** (`RespiraRed.promedioCiudad`). Lo que queda arriba de la línea es donde el runner respiró mejor que la calle típica: la hipótesis del proyecto contada con sus propias fotos.
- **Ficha del lugar**: tocar la foto del centro abre la foto grande con panel de vidrio (lugar, km, tiempo, respirabilidad con ⓘ, comparación con CABA, polen, sensación) y **Repetir este trayecto**.
- **Comentario**: bloque "Sumá esta corrida a tu archivo" (foto opcional; se recorta a 9:16 y 360 × 644 px). Sin foto, la tarjeta es una **postal con el dibujo del recorrido** en lima. Se guardan `foto`, `trazo` (48 puntos) y `lugar` en `respira-corridas`; si el teléfono se queda sin lugar, solo las últimas 12 conservan la foto.
- **Guardado**: muestra la tarjeta y "Ver tu archivo". **Inicio**: tarjeta "Tu archivo" con la onda en miniatura.
- **Ejemplos**: 12 recorridos con las fotos generadas en Figma (`datos/archivo/`), marcados "Ejemplo". km, minutos y sensación son ilustrativos; **la respirabilidad no**: se calcula con las calles a 400 m del lugar (`RespiraRed.indiceZona`, 800 m si junto al río no hay calles). Desaparecen cuando el runner tiene 8 recorridos propios.
- Diferencias con Figma: el modo "Tu respiración", la postal sin foto y la entrada en mazo son decisiones tomadas en código.

---

# v11 — RESPIRA FINAL?, perfil → filtros y Respira challenge (16 de noviembre de 2026)

Copia fija de la app a partir de v10. Diseño tomado del frame **"RESPIRA FINAL?"** (Figma `respiracaba`, página "prototipo funcional").

## Qué cambia respecto de v10

**Sistema visual (FINAL?)**
- Fondo crema `#F7F5EE`, acento lima `#C8F169` con texto `#10200F`, pie oscuro `#0D1410`, ruedas/balanza/objetivo en superficie oscura `#16221B`.
- Nueva variable `--acento-tinta` (`#3F6E0F`): el lima no se lee como texto sobre crema, así que íconos y textos "de acento" usan la tinta. Decisión tomada en código, no está en Figma.
- La línea de la ruta en el mapa pasa a verde oscuro con brillo lima (como en Figma).
- Diferencia con Figma: el "RESPIRA" del encabezado queda oscuro (en Figma es claro y casi no se lee sobre crema).

**Devolución de la Entrega 3**
- *Definí tu recorrido* ahora se llama "¿Por dónde recorremos hoy?". El bloque **"Contanos tu salida"** va primero, en lima, con **micrófono** (dictado del navegador; al terminar de hablar se envía a la IA).
- "Completalo vos" queda cerrado ("Prefiero completarlo yo") y se abre solo cuando la IA completa el formulario, para que el runner lo revise.
- **Km automáticos**: de un punto a otro, la app calcula los km del camino más corto por las calles (`RespiraRed.distanciaDirecta`) y el runner suma km con − / +. El primer "+" suma lo necesario para que haya una vuelta real (≥ 1,3 × el camino directo). En trayecto circular se escribe la distancia, con una sugerencia según el nivel.
- **ⓘ en las variables de respirabilidad**: en el detalle se muestra la lectura ("Tranquilo", "Muy verde") y el dato duro (dB, árboles/100 m, NO₂, puntaje) queda en un globo. La lectura es una regla fija de la app (≥ 66 / ≥ 40 / menos), no de la IA.
- "Qué compone el índice" lleva la etiqueta **Dato calculado**; la interpretación sigue en el bloque de IA.

**Perfil → filtros** (tabla `PERFIL_A_FILTROS` en `datos.js`)
| Objetivo | Condiciones que se marcan | Peso | Opción que recomienda la app |
|---|---|---|---|
| Mejorar mi resistencia | (las de siempre) | — | la que más cumple las condiciones; km sugeridos ×1,2 |
| Correr más rápido | Terreno regular + Menos tránsito | terreno ×1,5 | la más corta |
| Cuidar mi salud | Aire + Vegetación (+ Sombra si el UV está alto) | aire ×1,5 | la que más cumple las condiciones |
| Bajar el estrés | Menos ruido + Vegetación | ruido ×1,5 | la más silenciosa |

- Nivel → km sugeridos (principiante 3–5, intermedio 5–8, avanzado 8–12) y ritmo (como antes).
- Alergias: igual que v10.
- **Edad, altura y peso se registran pero no cambian el recorrido** (decisión del equipo).
- Prioridad: "Contanos" o lo que se marca a mano > perfil > valores por defecto. Las condiciones marcadas por el perfil llevan la etiqueta "Por tu objetivo" y se pueden desmarcar.
- Cada corrida guardada registra `objetivo` y `origen` de cada condición (`base`, `perfil`, `contanos`, `manual`).
- La IA recibe `objetivo`, `recomendado_por_la_app` y `motivo_de_la_app`: no cambia la recomendación, la explica (regla nueva en `api/ia.js`).
- "Cerca del agua" sigue fuera (no es pertinente a toda la Ciudad).

**Respira challenge (pirueta)** — pantalla `#challenge`, tercera tarjeta del inicio
- Escribís una palabra (hasta 8 letras, sin tildes) y cada letra se arma como un recorrido real: trazos de la letra → esquinas más cercanas → camino de menor costo con las condiciones elegidas (`RespiraRed.armarLetra`). La letra se gira para seguir la grilla de calles del lugar y en la tarjeta se dibuja derecha.
- Una letra por día. Se corre con el flujo normal (mapa → detalle → correr → experiencia); al guardar la corrida la letra queda hecha (`respira-challenge` en el teléfono).
- Centro por defecto: Primera Junta (Caballito), porque su grilla regular hace que las letras se lean mejor (se probaron Rosedal, Palermo, Plaza Italia, Colegiales y Flores). Se puede usar la ubicación del runner.
- Diferencias con Figma: las tarjetas no tienen mapa base (se dibuja solo la letra sobre una trama de calles), y las diagonales (V, M, N, A) salen escalonadas porque siguen calles reales.

## Pendiente
- No se probó en el celular. Probar: dictado en "Contanos" (Chrome/Safari), km automáticos, challenge completo y el deploy.
- Para publicarla, copiar estos archivos a `app/` (lo que publica Vercel).
