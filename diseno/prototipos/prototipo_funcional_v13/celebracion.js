/* =====================================================================
   RESPIRA — Celebraciones (sonido + animación)
   Dos momentos, con dos intenciones distintas:
   - logro(boton):    "Terminar recorrido". Un logro anhelado que se alcanza: un soplo de aire que sube,
                      un arpegio luminoso y un acorde que queda flotando. Luz que florece desde el botón,
                      anillos como respiraciones y partículas de aire que suben. Lleva a un lugar de felicidad.
   - guardado(boton): "Guardar recorrido". Satisfacción instantánea: dos notas brillantes y cortas,
                      el botón rebota y salta una chispa. Efímero.
   El sonido se sintetiza con Web Audio (no hay archivos de audio). Con "reducir movimiento" activado
   en el teléfono, las animaciones se simplifican; el sonido se mantiene.
   Uso: await RespiraCelebracion.logro(boton)   → resuelve cuando conviene pasar a la pantalla siguiente.
   ===================================================================== */
(function () {
  const reducido = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
  const esperar = ms => new Promise(ok => setTimeout(ok, ms));

  /* ---------- SONIDO ---------- */
  let ctx = null, eco = null;
  function audio() {
    try {
      ctx = ctx || new (window.AudioContext || window.webkitAudioContext)();
      if (ctx.state === 'suspended') ctx.resume();
      return ctx;
    } catch (e) { return null; }   // sin Web Audio: la celebración sigue, en silencio
  }
  // Reverberación generada (ruido que se apaga): da la sensación de espacio abierto.
  function reverberacion(c) {
    if (eco) return eco;
    const largo = Math.floor(c.sampleRate * 2.8), buf = c.createBuffer(2, largo, c.sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      const d = buf.getChannelData(ch);
      for (let i = 0; i < largo; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / largo, 3.2);
    }
    eco = c.createConvolver(); eco.buffer = buf; eco.connect(c.destination);
    return eco;
  }
  // Salida: seco + envío a la reverberación, con un compresor suave para que nada sature.
  function salida(c, volumen, humedad) {
    const comp = c.createDynamicsCompressor(); comp.threshold.value = -14; comp.ratio.value = 3;
    const seco = c.createGain(); seco.gain.value = volumen;
    const mojado = c.createGain(); mojado.gain.value = volumen * humedad;
    comp.connect(seco); seco.connect(c.destination);
    comp.connect(mojado); mojado.connect(reverberacion(c));
    return comp;
  }
  // Campana: fundamental + armónicos suaves, ataque rápido y caída larga.
  function campana(c, destino, frec, t, dur, vol) {
    [[1, 1], [2, 0.32], [3.01, 0.1]].forEach(([mult, peso]) => {
      const o = c.createOscillator(), g = c.createGain();
      o.type = 'sine'; o.frequency.value = frec * mult;
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(vol * peso, t + 0.012);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur / mult);
      o.connect(g); g.connect(destino); o.start(t); o.stop(t + dur + 0.05);
    });
  }
  // Colchón: un acorde que entra despacio y queda flotando.
  function colchon(c, destino, frecs, t, dur, vol) {
    frecs.forEach((f, i) => {
      [-4, 4].forEach(desafino => {   // dos voces apenas desafinadas: más cálido
        const o = c.createOscillator(), g = c.createGain(), filtro = c.createBiquadFilter();
        o.type = 'triangle'; o.frequency.value = f; o.detune.value = desafino;
        filtro.type = 'lowpass'; filtro.frequency.value = 2400;
        g.gain.setValueAtTime(0.0001, t);
        g.gain.linearRampToValueAtTime(vol / frecs.length, t + 0.7 + i * 0.05);
        g.gain.setValueAtTime(vol / frecs.length, t + dur * 0.55);
        g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
        o.connect(filtro); filtro.connect(g); g.connect(destino); o.start(t); o.stop(t + dur + 0.05);
      });
    });
  }
  // Soplo: ruido filtrado que sube, como una inspiración profunda.
  function soplo(c, destino, t, dur, vol) {
    const largo = Math.floor(c.sampleRate * dur), buf = c.createBuffer(1, largo, c.sampleRate), d = buf.getChannelData(0);
    for (let i = 0; i < largo; i++) d[i] = Math.random() * 2 - 1;
    const fuente = c.createBufferSource(), filtro = c.createBiquadFilter(), g = c.createGain();
    fuente.buffer = buf; filtro.type = 'bandpass'; filtro.Q.value = 0.8;
    filtro.frequency.setValueAtTime(350, t); filtro.frequency.exponentialRampToValueAtTime(3200, t + dur);
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(vol, t + dur * 0.6); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    fuente.connect(filtro); filtro.connect(g); g.connect(destino); fuente.start(t); fuente.stop(t + dur);
  }
  const NOTA = { C4: 261.63, G4: 392.0, C5: 523.25, E5: 659.25, G5: 783.99, B5: 987.77, C6: 1046.5, D6: 1174.66, E6: 1318.51, G6: 1567.98, C7: 2093.0 };

  function sonidoLogro() {
    const c = audio(); if (!c) return;
    const t = c.currentTime + 0.03, out = salida(c, 0.55, 0.6);
    soplo(c, out, t, 1.1, 0.12);
    ['C5', 'E5', 'G5', 'C6', 'E6'].forEach((n, i) => campana(c, out, NOTA[n], t + 0.18 + i * 0.1, 1.6, 0.22));
    colchon(c, out, [NOTA.C4, NOTA.G4, NOTA.E5, NOTA.B5, NOTA.D6], t + 0.62, 3.6, 0.32);   // Do mayor 9: abierto, luminoso
    campana(c, out, NOTA.G6, t + 0.95, 2.4, 0.09);
    campana(c, out, NOTA.C7, t + 1.15, 2.6, 0.07);
  }
  function sonidoGuardado() {
    const c = audio(); if (!c) return;
    const t = c.currentTime + 0.02, out = salida(c, 0.5, 0.25);
    campana(c, out, NOTA.G5, t, 0.45, 0.24);
    campana(c, out, NOTA.C6, t + 0.075, 0.7, 0.26);
    campana(c, out, NOTA.G6, t + 0.075, 0.5, 0.06);
  }

  /* ---------- ANIMACIÓN ---------- */
  const app = () => document.getElementById('app');
  function centroEnApp(boton) {
    const a = app().getBoundingClientRect(), b = boton.getBoundingClientRect();
    return { x: b.left + b.width / 2 - a.left, y: b.top + b.height / 2 - a.top };
  }
  function capa(clase, { x, y }) {
    const el = document.createElement('div');
    el.className = clase; el.setAttribute('aria-hidden', 'true');
    el.style.setProperty('--x', x + 'px'); el.style.setProperty('--y', y + 'px');
    app().appendChild(el);
    return el;
  }
  const azar = (a, b) => a + Math.random() * (b - a);
  function particulas(contenedor, cantidad, { distancia, subida, duracion, tam }) {
    for (let i = 0; i < cantidad; i++) {
      const p = document.createElement('i');
      // subida: aire que sube y se abre hacia los costados · si no: estallido corto en todas las direcciones
      const ang = azar(0, Math.PI * 2), r = azar(distancia[0], distancia[1]);
      const dx = subida ? azar(-distancia[1], distancia[1]) : Math.cos(ang) * r;
      const dy = subida ? -azar(subida[0], subida[1]) : Math.sin(ang) * r;
      p.style.setProperty('--dx', dx + 'px');
      p.style.setProperty('--dy', dy + 'px');
      p.style.setProperty('--s', azar(tam[0], tam[1]) + 'px');
      p.style.setProperty('--d', azar(0, subida ? 0.45 : 0.06) + 's');
      p.style.setProperty('--t', azar(duracion[0], duracion[1]) + 's');
      p.className = 'chispa chispa--' + (i % 3);
      contenedor.appendChild(p);
    }
  }
  function vibrar(patron) { try { navigator.vibrate && navigator.vibrate(patron); } catch (e) { /* no hay */ } }

  // Terminar recorrido: el logro.
  async function logro(boton) {
    sonidoLogro();
    vibrar([20, 70, 20, 70, 160]);
    const html = boton.innerHTML;
    boton.disabled = true;
    boton.classList.add('boton--logro');
    boton.innerHTML = '<svg class="icono"><use href="#i-check"/></svg>¡Lo lograste!';
    const centro = centroEnApp(boton);
    const capaLogro = capa('celebracion celebracion--logro' + (reducido() ? ' celebracion--simple' : ''), centro);
    capaLogro.innerHTML = '<span class="celebracion__destello"></span><span class="celebracion__anillo"></span><span class="celebracion__anillo"></span><span class="celebracion__anillo"></span>';
    if (!reducido()) particulas(capaLogro, 42, { distancia: [40, 200], subida: [260, 680], duracion: [1.8, 2.8], tam: [4, 11] });
    setTimeout(() => capaLogro.remove(), 3600);
    setTimeout(() => { boton.classList.remove('boton--logro'); boton.innerHTML = html; boton.disabled = false; }, 3600);
    await esperar(reducido() ? 500 : 1150);   // la pantalla siguiente aparece con la luz todavía arriba
  }

  // Guardar recorrido: satisfacción instantánea.
  async function guardado(boton) {
    sonidoGuardado();
    vibrar(25);
    boton.disabled = true;
    boton.classList.add('boton--guardado');
    const capaGuardado = capa('celebracion celebracion--guardado' + (reducido() ? ' celebracion--simple' : ''), centroEnApp(boton));
    capaGuardado.innerHTML = '<span class="celebracion__anillo"></span>';
    if (!reducido()) particulas(capaGuardado, 16, { distancia: [50, 120], subida: null, duracion: [0.5, 0.75], tam: [4, 8] });
    setTimeout(() => capaGuardado.remove(), 1000);
    setTimeout(() => { boton.classList.remove('boton--guardado'); boton.disabled = false; }, 1000);
    await esperar(reducido() ? 200 : 420);
  }

  globalThis.RespiraCelebracion = { logro, guardado };
})();
