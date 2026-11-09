const producto = document.querySelector('#objeto-producto');
const controlesColor = document.querySelectorAll('.color-swatch');
const controlEscala = document.querySelector('#scale-control');
const valorEscala = document.querySelector('#scale-value');
const controlRotacion = document.querySelector('#rotation-control');
const valorRotacion = document.querySelector('#rotation-value');
const controlGiro = document.querySelector('#spin-control');
const estado = document.querySelector('#interaction-status');

function registrarInteraccion(evento, detalle) {
  try {
    const metricas = JSON.parse(localStorage.getItem('ar_metrics') || '[]');
    if (!Array.isArray(metricas)) {
      throw new TypeError('El historial guardado no es una lista.');
    }

    metricas.push({
      fecha: new Date().toLocaleTimeString(),
      evento,
      detalle
    });
    localStorage.setItem('ar_metrics', JSON.stringify(metricas));
    console.log('Métrica AR registrada:', metricas);
  } catch (error) {
    console.error('No se pudo guardar la interacción AR:', error);
  }
}

function seleccionarColor(color) {
  producto.setAttribute('color', color);
  controlesColor.forEach((boton) => {
    const seleccionado = boton.dataset.color === color;
    boton.classList.toggle('is-selected', seleccionado);
    boton.setAttribute('aria-pressed', String(seleccionado));
  });
  estado.textContent = `Color actualizado: ${color}`;
  registrarInteraccion('Cambio de color', color);
}

controlesColor.forEach((boton) => {
  boton.addEventListener('click', () => seleccionarColor(boton.dataset.color));
});

producto.addEventListener('click', () => {
  const colores = Array.from(controlesColor, (boton) => boton.dataset.color);
  const colorActual = producto.getAttribute('color');
  const siguientes = colores.filter((color) => color !== colorActual);
  seleccionarColor(siguientes[Math.floor(Math.random() * siguientes.length)]);
  estado.textContent = '¡Producto activado! Color cambiado al hacer clic.';
  registrarInteraccion('Clic en Producto AR', producto.getAttribute('color'));
});

controlEscala.addEventListener('input', () => {
  const escala = Number(controlEscala.value);
  producto.setAttribute('scale', `${escala} ${escala} ${escala}`);
  valorEscala.value = `${escala.toFixed(1)}×`;
  valorEscala.textContent = `${escala.toFixed(1)}×`;
  registrarInteraccion('Cambio de escala', escala);
});

controlRotacion.addEventListener('input', () => {
  const grados = Number(controlRotacion.value);
  producto.setAttribute('rotation', `0 ${grados} 0`);
  valorRotacion.value = `${grados}°`;
  valorRotacion.textContent = `${grados}°`;
  registrarInteraccion('Cambio de rotación', grados);
});

controlGiro.addEventListener('change', () => {
  if (controlGiro.checked) {
    producto.setAttribute('animation__spin', {
      property: 'rotation',
      from: '0 0 0',
      to: '0 360 0',
      loop: true,
      dur: 4000,
      easing: 'linear'
    });
    estado.textContent = 'Giro automático activado';
  } else {
    producto.removeAttribute('animation__spin');
    const grados = Number(controlRotacion.value);
    producto.setAttribute('rotation', `0 ${grados} 0`);
    estado.textContent = 'Giro automático desactivado';
  }

  registrarInteraccion('Cambio de giro automático', controlGiro.checked);
});
