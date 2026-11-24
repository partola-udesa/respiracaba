# Prototipo funcional v15 — menú desplegable (24 de noviembre de 2026)

Copia fija de la app a partir de v14. Exploración: punto medio entre el menú lateral simple (panel crema con lista) y la rueda curva de la referencia.

## Qué cambia respecto de v14
- Arriba a la derecha, el **avatar** se reemplaza por el **ícono de menú** (☰), que abre el menú. El perfil (con la foto) queda como la primera tarjeta del menú (nombre + objetivo · nivel).
- **La app se desenfoca detrás** (velo crema con `backdrop-filter`) y la pantalla se achica un poco, así se entiende que el menú está encima y no es otra pantalla.
- Las opciones se acomodan sobre una **curva, como la curva de una pista**: los íconos quedan del lado del pulgar y las opciones se corren según lo lejos que están del centro (`acomodarCurva()` en `app.js`, `RADIO_CURVA`). Una línea fina dibuja la curva.
- **Dónde estás**: la opción de la pantalla actual tiene el ícono en lima y el nombre en etiqueta; la **píldora oscura** se apoya en la curva a esa altura y sigue al dedo o al mouse.
- Opciones, sin títulos de sección: Inicio, Armá tu recorrido, Repetí un trayecto, Tu archivo y Respira challenge. Solo el challenge lleva una línea abajo: la palabra y las letras que faltan.
- **Tu semana** al pie: km, salidas y respirabilidad promedio desde el lunes (solo corridas propias, `respira-corridas`).
- Se cierra con la ✕ (mismo lugar que el botón ☰, con el aro lima), tocando el fondo, deslizando a la derecha o con Esc.
- No está en Figma: se diseñó con las piezas del sistema (vidrio, lima, superficie oscura).
- **Pin de "Marcá en el mapa" más chico y minimalista**: cabeza redonda oscura con brillo lima y aguja fina (20 × 36 px, antes una gota lima de 48 × 64 que tapaba las calles). La punta de la aguja es el punto elegido; afuera de CABA la cabeza se pone roja.
- **Zoom en todos los mapas**: botones + / − (acercar y alejar) en Marcá en el mapa, Tus recorridos ideales, Recorrido elegido, En recorrido, Completado y Tu palabra en la Ciudad (`RespiraMapa.botonesZoom` en `mapa.js`). En los mapas de pantalla completa van a la derecha, debajo de lo que flota arriba; en los chicos, en la esquina del mapa. Se apagan en el zoom máximo o mínimo. Las miniaturas de las letras del challenge no llevan (son tarjetas para tocar, no mapas para explorar).
- **Tu archivo pasa a ser "Tus recorridas"** (pantalla, tarjeta del inicio y menú), como en la referencia:
  - Texto: "Cuanto más arriba está la foto, mejor respiraste comparado con la calle promedio de CABA", aviso lima "Deslizá y tocá la foto del centro para repetir ese recorrido" y datos "recorridas · lugares · kilómetros".
  - Pestañas **Tus corridas** (por fecha, empieza en la más reciente) y **Tu ranking** (de la más respirable a la menos, empieza en la #1). Reemplazan a "Tu onda" y "Tu respiración": sale la cinta 3D y queda solo el gráfico.
  - Cada foto lleva su % arriba (el del centro en oscuro) y la fecha o el puesto (#1, #2…) abajo, unidas por una línea fina. La altura respecto de la línea punteada es la respirabilidad comparada con la calle promedio de CABA; eje "Respiraste mejor / peor".
  - Abajo: lugar, km, % respirable y **"+8 vs. CABA"** (en ranking, "#1/12").
  - **Tocar la foto del centro repite ese recorrido directo** (sale la ficha del lugar). Tocar otra foto la trae al centro; con teclado, flechas y Enter.

## Pendiente
- Probar en el celular (rendimiento del desenfoque sobre el mapa y el gesto de deslizar).
- Si el equipo lo aprueba: pasarlo a Figma, sumar la entrada en `decisiones.md` y copiar a `app/`.

---

# Prototipo funcional v14 — mapa que abre desde GitHub y "Marcá en el mapa" (24 de noviembre de 2026)

Copia fija de la app a partir de v13.

## Qué cambia respecto de v13

**El mapa ahora carga abriendo la app como archivo (bajada de GitHub)**
- Problema: OpenStreetMap pide el encabezado `Referer`. Abriendo `index.html` con doble clic (file://), el navegador no lo manda y OSM responde cada tesela con una imagen de "Access blocked" (con código 200, así que Leaflet ni siquiera lo ve como error). En Vercel o cualquier servidor sí funcionaba.
- Arreglo: `RespiraMapa.capaBase()` (en `mapa.js`) arma el mapa base para todos los mapas de la app (recorridos, challenge y "Marcá en el mapa"). Siempre es OpenStreetMap: servida por http/https, las teselas oficiales; abierta como archivo, las del servidor de **OpenStreetMap France** (mismo mapa y datos, no pide Referer). Configuración en `config.js` (`teselasSinServidor`).

**"Marcá en el mapa" (drop your pin) en Definí tu recorrido**
- Cada campo de lugar (partida y llegada) tiene un botón con un pin. Abre un mapa a pantalla completa con un **pin fijo en el centro**: se mueve el mapa (o se toca un punto) y el pin se levanta mientras se mueve.
- Abajo aparece qué hay ahí: el espacio verde más cercano (datasets, `RespiraBuscador.cercano`) o la esquina de la red de calles (`RespiraRed.esquinaConNombre`, p. ej. "Corrientes y Callao"). Sin servicios externos.
- "Usar este punto" completa el campo. Afuera de CABA el pin se pone rojo, avisa "Zona no disponible para armar el recorrido" y no deja elegir; el mapa vela lo que queda afuera del contorno de la Ciudad.
- Botón "Ir a mi ubicación". Con teclado: Enter usa el punto, Esc cierra.
- No está en Figma: se diseñó con las piezas del sistema (vidrio claro sobre el mapa, hoja inferior, botón lima).

## Pendiente
- No se probó en el celular. Probar el arrastre del mapa del pin con el dedo.
- Para que se pueda compartir un link (y no un archivo), conviene publicar los prototipos (GitHub Pages o Vercel): ahí carga OpenStreetMap.
- Para publicarla, copiar estos archivos a `app/` (lo que publica Vercel).

---

# v13 — "RESPIRA FINAL?" al detalle, challenge en toda la Ciudad y mapa de OpenStreetMap (24 de noviembre de 2026)

Copia fija de la app a partir de v12. Pantallas tomadas del frame **"RESPIRA FINAL?"** (Figma `respiracaba`, página "prototipo funcional"), comparadas una por una con capturas de la app a 393 × 852.

## Qué cambia respecto de v12

**Mapa: OpenStreetMap por su API de teselas**
- `config.js` → `https://tile.openstreetmap.org/{z}/{x}/{y}.png` (sin clave, zoom hasta 19). Reemplaza al gris de Esri: nombres de calles, parques y lagos en todos los zooms.
- Los colores se bajan con CSS (`.leaflet-tile-pane` en `estilos.css`) para acercarse a la paleta de Figma y que la ruta lima se lea encima.
- Atribución "© colaboradores de OpenStreetMap" visible. Política de uso de teselas: tráfico bajo y con atribución; si la app crece hay que pasar a un proveedor de teselas OSM con plan.

**Pantallas igual que Figma**
- *06 · Definí tu recorrido*: solo el formulario del frame (partida, trayecto circular, llegada, distancia escrita, programar). Sale el bloque "Contanos tu salida" y los km automáticos de v11 (decisión del equipo: seguir el frame).
- *08 · Tus recorridos ideales*: hoja con las tres opciones y el botón; cada opción con "polen bajo" y el índice con la leyenda "recomendado" o "índice".
- *09a/09b · Recorrido elegido*: chip "Hoy · hora", datos duros (min, árboles / 100 m, dB), tarjeta de polen verde con una fila por especie, "Qué compone el índice" con el dato a la derecha. El clima queda solo en los chips de arriba.
- *11 · Completado*: números grandes y tarjeta de respirabilidad en lima.
- *12 · Tu experiencia*: vuelve "¿Cómo describirías el ambiente?" con chips (Tranquilo, Verde, Ruidoso, Con tránsito, Con polen, Otro). Cada chip confirma o marca como fallida una condición y eso ajusta los pesos que aprende la app (tabla `AMBIENTE` en `app.js`).
- *14 · Guardado*: "¡Bien {nombre}! Recorrido guardado." y "Volver al inicio".
- *03* campos oscuros, *04* "Contanos de vos", textos en `#10200F`, pie oscuro solo en 04, 06 y 07, encabezado claro sobre el mapa.

**Respira challenge (05c) en toda la Ciudad y con mapa**
- Cada tarjeta muestra la letra sobre el **mapa real**, girado para que la letra se lea derecha (como en Figma: calles inclinadas, letra parada). Abajo, "Tu palabra en la Ciudad": el contorno de CABA con cada letra en su lugar; se toca para correrla.
- Dónde: **Toda la Ciudad** (por defecto), **Cerca de mí** o **Un lugar** (buscador de plazas, parques y calles). Ya no está fijo en Primera Junta.
- Algoritmo nuevo (`red.js → armarLetra`): prueba ~450 lugares de CABA (o cada 300 m alrededor de la zona), gira la letra según la grilla de calles y arma cada trazo por un **corredor** (un tramo cuesta más cuanto más se aleja de la línea ideal). Mide cuánto se parece cada intento a la letra ideal y, entre los que se leen casi igual de bien, elige el de mejor puntaje en las condiciones elegidas. En toda la Ciudad prefiere poner cada letra a más de 1,5 km de las otras, así la palabra recorre varios barrios. 100–400 ms por letra.
- Letras en un solo trazo (`LETRAS` en `datos.js`): la barra de la E o el palo de la T se van y se vuelven por la misma calle. Las letras con diagonales (A, K, M, N, V, W, X, Y, Z) van más grandes para que el "serrucho" de la grilla quede fino.
- El lugar de cada letra se guarda (`respira-challenge.lugares`): la letra de mañana no cambia de lugar. El mapa de recorridos, detalle, corrida y completado también se gira para que la letra se lea derecha (girado, no se arrastra).
- Se aceptan tildes en la palabra ("CORRÉ"); se dibuja la letra base.

**Diferencias con Figma (decisiones tomadas en código)**
- "RESPIRA" del encabezado queda oscuro sobre crema (en Figma es claro y no se lee).
- "Cerca del agua" sigue afuera (v10), aunque aparece en el frame 07.
- Se mantienen las piezas de v12 que no están en este frame: "Tu archivo" (inicio, comentario y guardado) y el chat del detalle. En el challenge se suma el selector de zona y el mapa de la palabra.

## Pendiente
- No se probó en el celular. Probar: el challenge completo en un teléfono (tiempos de cálculo y mapas girados), "Cerca de mí" y el deploy.
- Para publicarla, copiar estos archivos a `app/` (lo que publica Vercel).

---

# v12 — Tu archivo, la pirueta (17 de noviembre de 2026)

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
