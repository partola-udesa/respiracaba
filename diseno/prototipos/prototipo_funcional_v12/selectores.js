/* =====================================================================
   RESPIRA — Selectores de números (sin escribir, deslizando)
   - ruedaHorizontal: edad y altura. El número del medio es el elegido y los de los
     costados quedan sombreados (como la alarma del iPhone, pero acostada).
   - balanza: peso. Un visor grande como el display de una balanza y una regla
     que se desliza debajo de una aguja fija, con rayitas cada 0,1 kg.
   Los dos se manejan con el dedo, con el mouse (arrastrando o con la ruedita) y con las flechas.
   ===================================================================== */
(function () {
  const ANCHO = 60;        // ancho de cada número de la rueda (px). Igual que .selector__item en estilos.css
  const PX_DECIMA = 8;     // en la balanza, cada 0,1 kg ocupa 8 px de regla (1 kg = 80 px)

  // Arrastrar con el mouse y usar la ruedita (en el celular ya funciona con el dedo).
  function conMouse(pista, alSoltar) {
    let arrastre = null;
    pista.addEventListener('pointerdown', e => {
      if (e.pointerType !== 'mouse') return;
      arrastre = { x: e.clientX, inicio: pista.scrollLeft };
      pista.style.scrollSnapType = 'none'; pista.style.cursor = 'grabbing';
    });
    window.addEventListener('pointermove', e => { if (arrastre) pista.scrollLeft = arrastre.inicio - (e.clientX - arrastre.x); });
    window.addEventListener('pointerup', () => {
      if (!arrastre) return;
      arrastre = null; pista.style.scrollSnapType = ''; pista.style.cursor = ''; alSoltar();
    });
    pista.addEventListener('wheel', e => {
      if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) { e.preventDefault(); pista.scrollLeft += e.deltaY; }
    }, { passive: false });
  }

  /* ---------------- RUEDA ---------------- */
  function ruedaHorizontal(contenedor, { valores, formato = String, valor, unidad = '', etiqueta = '', alCambiar = () => {} }) {
    contenedor.innerHTML = `
      <div class="selector">
        <div class="selector__ventana">
          <div class="selector__banda"></div>
          <div class="selector__pista" tabindex="0" role="slider" aria-label="${etiqueta}"></div>
        </div>
        <span class="selector__unidad">${unidad}</span>
      </div>`;
    const pista = contenedor.querySelector('.selector__pista');
    const items = valores.map((v, i) => {
      const el = document.createElement('div');
      el.className = 'selector__item'; el.textContent = formato(v);
      el.addEventListener('click', () => irA(i, true));
      pista.appendChild(el);
      return el;
    });

    let actual = Math.max(0, valores.indexOf(valor));
    const limitar = i => Math.min(valores.length - 1, Math.max(0, i));
    function pintar(i) {
      const cambio = i !== actual;
      actual = i;
      items.forEach((el, j) => el.classList.toggle('activo', j === i));
      pista.setAttribute('aria-valuenow', valores[i]);
      pista.setAttribute('aria-valuetext', `${formato(valores[i])} ${unidad}`);
      if (cambio) alCambiar(valores[i]);
    }
    function irA(i, suave) { pista.scrollTo({ left: limitar(i) * ANCHO, behavior: suave ? 'smooth' : 'auto' }); }

    pista.addEventListener('scroll', () => requestAnimationFrame(() => {
      if (pista.clientWidth) pintar(limitar(Math.round(pista.scrollLeft / ANCHO)));
    }));
    conMouse(pista, () => irA(actual, true));
    pista.addEventListener('keydown', e => {
      if (e.key === 'ArrowRight') { e.preventDefault(); irA(actual + 1, false); }
      if (e.key === 'ArrowLeft')  { e.preventDefault(); irA(actual - 1, false); }
    });

    pintar(actual);
    return {
      valor: () => valores[actual],
      // Con la pantalla escondida no se puede deslizar: al mostrarla se acomoda en el valor elegido.
      sincronizar: () => irA(actual, false)
    };
  }

  /* ---------------- BALANZA ---------------- */
  function balanza(contenedor, { desde, hasta, valor, unidad = 'kg', etiqueta = '', alCambiar = () => {} }) {
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
    const decimas = Math.round((hasta - desde) * 10);
    let actual = valor;          // en kg, con un decimal
    let armadaCon = 0;           // ancho con el que se dibujó la regla

    // La regla lleva medio ancho de margen a cada lado: así el primer y el último valor pueden quedar bajo la aguja.
    function armar() {
      const mitad = pista.clientWidth / 2;
      if (!mitad || mitad === armadaCon) return;
      armadaCon = mitad;
      const largo = decimas * PX_DECIMA;
      escala.style.width = (largo + 2 * mitad) + 'px';
      escala.style.backgroundPosition = `${mitad - 1}px 0, ${mitad}px 0`;
      escala.style.backgroundSize = `${largo + 2}px 20px, ${largo + 1}px 10px`;   // = alto de las rayitas en estilos.css (balanza compacta)
      escala.querySelectorAll('.regla__numero').forEach(n => n.remove());
      for (let kg = desde; kg <= hasta; kg++) {               // un número por cada kilo
        const n = document.createElement('span');
        n.className = 'regla__numero'; n.textContent = kg;
        n.style.left = (mitad + (kg - desde) * 10 * PX_DECIMA) + 'px';
        escala.appendChild(n);
      }
    }
    const decimaActual = () => Math.min(decimas, Math.max(0, Math.round(pista.scrollLeft / PX_DECIMA)));
    const leer = () => Math.round((desde + decimaActual() / 10) * 10) / 10;
    function mostrar(v) {
      visor.textContent = v.toFixed(1).replace('.', ',');   // 58,0 (con coma, como en Argentina)
      pista.setAttribute('aria-valuenow', v);
      pista.setAttribute('aria-valuetext', `${visor.textContent} ${unidad}`);
    }
    const irA = (kg, suave) => pista.scrollTo({ left: Math.round((kg - desde) * 10) * PX_DECIMA, behavior: suave ? 'smooth' : 'auto' });

    // Al soltar, la regla se acomoda en la décima más cercana (como un imán).
    let iman;
    pista.addEventListener('scroll', () => {
      if (!pista.clientWidth) return;
      requestAnimationFrame(() => {
        const v = leer();
        if (v !== actual) { actual = v; mostrar(v); alCambiar(v); }
      });
      clearTimeout(iman);
      iman = setTimeout(() => pista.scrollTo({ left: decimaActual() * PX_DECIMA, behavior: 'smooth' }), 140);
    });
    conMouse(pista, () => {});
    pista.addEventListener('keydown', e => {
      const salto = e.shiftKey ? 1 : 0.1;    // Shift + flecha: de a 1 kg
      const nuevo = e.key === 'ArrowRight' ? Math.min(hasta, actual + salto) : e.key === 'ArrowLeft' ? Math.max(desde, actual - salto) : null;
      if (nuevo === null) return;
      e.preventDefault();
      actual = Math.round(nuevo * 10) / 10; mostrar(actual); alCambiar(actual); irA(actual, false);
    });

    mostrar(actual);
    return { valor: () => actual, sincronizar: () => { armar(); irA(actual, false); } };
  }

  globalThis.RespiraSelectores = { ruedaHorizontal, balanza };
})();
