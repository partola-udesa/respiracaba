/* =====================================================================
   RESPIRA — Rueda horizontal de números
   El número del medio es el elegido y los de los costados quedan sombreados
   (como la alarma del iPhone, pero acostada). Se usa para edad, altura, peso y distancia.
   Se desliza con el dedo, con el mouse (arrastrando o con la ruedita) o con las flechas.
   ===================================================================== */
(function () {
  const ANCHO = 56;   // ancho de cada número (px). Tiene que coincidir con .selector__item en estilos.css

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

    // Pinta el número elegido y avisa el cambio.
    function pintar(i) {
      const cambio = i !== actual;
      actual = i;
      items.forEach((el, j) => el.classList.toggle('activo', j === i));
      pista.setAttribute('aria-valuenow', valores[i]);
      pista.setAttribute('aria-valuetext', `${formato(valores[i])} ${unidad}`);
      if (cambio) alCambiar(valores[i]);
    }
    function irA(i, suave) { pista.scrollTo({ left: limitar(i) * ANCHO, behavior: suave ? 'smooth' : 'auto' }); }

    // Al deslizar, el que queda en el medio pasa a ser el elegido.
    pista.addEventListener('scroll', () => requestAnimationFrame(() => {
      if (pista.clientWidth) pintar(limitar(Math.round(pista.scrollLeft / ANCHO)));
    }));

    // Mouse: arrastrar y ruedita.
    let arrastre = null;
    pista.addEventListener('pointerdown', e => { if (e.pointerType !== 'mouse') return; arrastre = { x: e.clientX, inicio: pista.scrollLeft, movio: false }; pista.style.scrollSnapType = 'none'; });
    window.addEventListener('pointermove', e => { if (!arrastre) return; arrastre.movio = true; pista.scrollLeft = arrastre.inicio - (e.clientX - arrastre.x); });
    window.addEventListener('pointerup', () => { if (!arrastre) return; arrastre = null; pista.style.scrollSnapType = ''; irA(actual, true); });
    pista.addEventListener('wheel', e => { if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) { e.preventDefault(); pista.scrollLeft += e.deltaY; } }, { passive: false });

    // Teclado: flechas izquierda y derecha.
    pista.addEventListener('keydown', e => {
      if (e.key === 'ArrowRight') { e.preventDefault(); irA(actual + 1, false); }
      if (e.key === 'ArrowLeft')  { e.preventDefault(); irA(actual - 1, false); }
    });

    pintar(actual);
    return {
      valor: () => valores[actual],
      // Cuando la pantalla estaba escondida no se puede deslizar: al mostrarla, se acomoda en el valor elegido.
      sincronizar: () => irA(actual, false)
    };
  }

  globalThis.RespiraSelectores = { ruedaHorizontal };
})();
