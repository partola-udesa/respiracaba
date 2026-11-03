# Prototipo funcional v4 — sistema gráfico v6 "Estilo oscuro", perfil completo y alergias con viento (2 de noviembre de 2026)

Copia fija de la app tal como quedó en este commit. La app viva sigue en `app/`; esta carpeta no se toca más.

Qué tiene:
- Sistema gráfico v6 "Estilo oscuro": mapa protagonista, vidrio, un solo acento (`#C8F169`), Figtree. En Figma: sección "RESPIRA v6 · Estilo oscuro (prototipo funcional)" de la página "prototipo funcional" (variables "RESPIRA v6 · Color/Medidas", estilos "v6/…", componentes y 17 pantallas con prototipo).
- Foto, nombre y apellido antes del perfil corredor; balanza del peso compacta; alergias siempre a la vista; "Guardar perfil" se habilita al llegar al final del scroll.
- "Más seguridad" y "Menos gente" fuera; "Cerca del agua" con OpenStreetMap (`datos/capas.js`).
- Algoritmo con alergias: árboles por especie (arbolado lineal) + viento del pronóstico por hora (Open-Meteo, sin clave) + época del año.
- "Tus recorridos ideales" con mapa a pantalla completa y etiquetas tocables; detalle con hoja que se levanta; animaciones de dibujo de la ruta; "Repetí un trayecto"; "En recorrido" simulado.
- Lugares donde falta sumar IA marcados con `[API IA]`.

Para verla: abrir `index.html` en Chrome. La interpretación de la IA solo funciona publicada en Vercel (con `GROQ_API_KEY`); sin eso aparece el resumen automático.

> Orden de versiones: prototipo_funcional_v1 → v2 → v3 → prototipo_funcional_v4 (esta) → v5. La versión en desarrollo vive en `app/`.
