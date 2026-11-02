/* =====================================================================
   RESPIRA — Selectores de números
   Dos herramientas para elegir un número tocando y deslizando, sin escribir:
   - rueda:   como la alarma del iPhone. El número del medio es el elegido.
   - balanza: para el peso. Un visor grande arriba y una regla que se desliza.
   Se usan dentro de la hoja inferior (ver app.js → abrirSelector).
   ===================================================================== */
(function () {
  const ALTO_ITEM = 44;      // alto de cada número de la rueda (px). Tiene que coincidir con estilos.css
  const PX_DECIMA = 8;       // en la balanza, cada 0,1 kg ocupa 8 px de regla

  /* ---------------- RUEDA ---------------- */
  function rueda(contenedor, { desde, hasta, paso = 1, valor, unidad, etiqueta }) {
    const valores = [];
    for (let v = desde; v <= hasta; v += paso) valores.push(v);

    contenedor.innerHTML = `
      <div class="rueda">
        <div class="rueda__banda"></div>
        <ul class="rueda__lista" tabindex="0" role="listbox" aria-label="${etiqueta}"></ul>
        <span class="rueda__unidad">${unidad}</span>
      </div>`;
    const lista = contenedor.querySelector('.rueda__lista');
    const items = valores.map((v, i) => {
      const li = document.createElement('li');
      li.className = 'rueda__item'; li.textContent = v; li.setAttribute('role', 'option');
      li.addEventListener('click', () => irAIndice(i, true));
      lista.appendChild(li);
      return li;
    });

    let actual = Math.max(0, valores.indexOf(valor));
    const limitar = i => Math.min(valores.length - 1, Math.max(0, i));
    function irAIndice(i, suave) { lista.scrollTo({ top: limitar(i) * ALTO_ITEM, behavior: suave ? 'smooth' : 'auto' }); }

    // Cada vez que se desliza, se marca como "activo" el número que quedó en el medio.
    function marcar() {
      actual = limitar(Math.round(lista.scrollTop / ALTO_ITEM));
      items.forEach((li, i) => { const si = i === actual; li.classList.toggle('activo', si); li.setAttribute('aria-selected', si); });
    }
    lista.addEventListener('scroll', () => requestAnimationFrame(marcar));

    // Con el teclado: flechas arriba y abajo.
    lista.addEventListener('keydown', e => {
      if (e.key === 'ArrowDown') { e.preventDefault(); irAIndice(actual + 1, false); }
      if (e.key === 'ArrowUp')   { e.preventDefault(); irAIndice(actual - 1, false); }
    });

    irAIndice(actual, false); marcar(); lista.focus({ preventScroll: true });
    return { valor: () => valores[actual] };
  }

  /* ---------------- BALANZA ---------------- */
  function balanza(contenedor, { desde, hasta, valor, unidad, etiqueta }) {
    contenedor.innerHTML = `
      <div class="balanza">
        <div class="balanza__visor" aria-hidden="true"><span class="balanza__numero"></span><span class="balanza__unidad">${unidad}</span></div>
        <div class="regla">
          <div class="regla__pista" tabindex="0" role="slider" aria-label="${etiqueta}" aria-valuemin="${desde}" aria-valuemax="${hasta}">
            <div class="regla__escala"></div>
          </div>
          <div class="regla__aguja"></div>
        </div>
      </div>`;
    const visor = contenedor.querySelector('.balanza__numero');
    const pista = contenedor.querySelector('.regla__pista');
    const escala = contenedor.querySelector('.regla__escala');

    // La regla tiene medio ancho de margen a cada lado, así el primer y el último valor pueden quedar bajo la aguja.
    const mitad = pista.clientWidth / 2;
    const decimas = Math.round((hasta - desde) * 10);
    const largo = decimas * PX_DECIMA;
    escala.style.width = (largo + 2 * mitad) + 'px';
    escala.style.backgroundPosition = `${mitad - 1}px 0, ${mitad}px 0`;
    escala.style.backgroundSize = `${largo + 2}px 40px, ${largo + 1}px 22px`;
    for (let kg = desde; kg <= hasta; kg++) {             // un número por cada kilo
      const n = document.createElement('span');
      n.className = 'regla__numero'; n.textContent = kg;
      n.style.left = (mitad + (kg - desde) * 10 * PX_DECIMA) + 'px';
      escala.appendChild(n);
    }

    const decimaActual = () => Math.min(decimas, Math.max(0, Math.round(pista.scrollLeft / PX_DECIMA)));
    const leer = () => Math.round((desde + decimaActual() / 10) * 10) / 10;
    const mostrar = () => {
      const v = leer();
      visor.textContent = v.toFixed(1).replace('.', ',');     // 58,0 (con coma, como en Argentina)
      pista.setAttribute('aria-valuenow', v);
    };
    const irA = (kg, suave) => pista.scrollTo({ left: Math.round((kg - desde) * 10) * PX_DECIMA, behavior: suave ? 'smooth' : 'auto' });

    // Al soltar, la regla se acomoda en la décima más cercana (como un imán).
    let imán;
    pista.addEventListener('scroll', () => {
      requestAnimationFrame(mostrar);
      clearTimeout(imán);
      imán = setTimeout(() => pista.scrollTo({ left: decimaActual() * PX_DECIMA, behavior: 'smooth' }), 140);
    });

    // En la compu: arrastrar con el mouse y usar la ruedita del mouse.
    let arrastre = null;
    pista.addEventListener('pointerdown', e => { if (e.pointerType !== 'mouse') return; arrastre = { x: e.clientX, inicio: pista.scrollLeft }; pista.setPointerCapture(e.pointerId); pista.style.cursor = 'grabbing'; });
    pista.addEventListener('pointermove', e => { if (arrastre) pista.scrollLeft = arrastre.inicio - (e.clientX - arrastre.x); });
    pista.addEventListener('pointerup', () => { arrastre = null; pista.style.cursor = ''; });
    pista.addEventListener('wheel', e => { if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) { e.preventDefault(); pista.scrollLeft += e.deltaY; } }, { passive: false });

    // Con el teclado: flechas izquierda y derecha (+ Shift para saltar de a 1 kg).
    pista.addEventListener('keydown', e => {
      const salto = e.shiftKey ? 1 : 0.1;
      if (e.key === 'ArrowRight') { e.preventDefault(); irA(Math.min(hasta, leer() + salto), false); }
      if (e.key === 'ArrowLeft')  { e.preventDefault(); irA(Math.max(desde, leer() - salto), false); }
    });

    irA(valor, false); mostrar(); pista.focus({ preventScroll: true });
    return { valor: leer };
  }

  globalThis.RespiraSelectores = { rueda, balanza };
})();
