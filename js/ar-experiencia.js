const producto = document.querySelector('#objeto-producto');
const controlesColor = document.querySelectorAll('.color-swatch');
const controlEscala = document.querySelector('#scale-control');
const valorEscala = document.querySelector('#scale-value');
const controlRotacion = document.querySelector('#rotation-control');
const valorRotacion = document.querySelector('#rotation-value');
const controlGiro = document.querySelector('#spin-control');
const estado = document.querySelector('#interaction-status');
const escena = document.querySelector('a-scene');
const botonAR = document.querySelector('#enter-ar');
const reticula = document.querySelector('#ar-reticle');
const suelo = document.querySelector('#showroom-ground');
let sesionAR = null;
let fuenteHitTest = null;
let espacioReferencia = null;
let ultimaSuperficie = null;
let listenerSeleccion = null;
let transformacionShowroom = null;

function actualizarEstadoAR(mensaje) {
  estado.textContent = mensaje;
}

function limpiarSesionAR() {
  if (sesionAR && listenerSeleccion) {
    sesionAR.removeEventListener('select', listenerSeleccion);
  }
  if (fuenteHitTest) {
    fuenteHitTest.cancel();
    fuenteHitTest = null;
  }
  sesionAR = null;
  espacioReferencia = null;
  ultimaSuperficie = null;
  reticula.setAttribute('visible', false);
  if (transformacionShowroom) {
    producto.object3D.position.copy(transformacionShowroom.posicion);
    producto.object3D.quaternion.copy(transformacionShowroom.orientacion);
    producto.object3D.scale.copy(transformacionShowroom.escala);
    producto.object3D.updateMatrix();
    transformacionShowroom = null;
  }
  producto.setAttribute('visible', true);
  suelo.setAttribute('visible', true);
  actualizarEstadoAR('Modo AR finalizado. El showroom 3D sigue disponible.');
}

async function iniciarDeteccionDeSuperficies() {
  sesionAR = escena.xrSession;
  espacioReferencia = escena.renderer.xr.getReferenceSpace();
  transformacionShowroom = {
    posicion: producto.object3D.position.clone(),
    orientacion: producto.object3D.quaternion.clone(),
    escala: producto.object3D.scale.clone()
  };
  const espacioVisor = await sesionAR.requestReferenceSpace('viewer');
  fuenteHitTest = await sesionAR.requestHitTestSource({ space: espacioVisor });
  listenerSeleccion = colocarProductoEnSuperficie;
  sesionAR.addEventListener('select', listenerSeleccion);
  producto.setAttribute('visible', false);
  suelo.setAttribute('visible', false);
  actualizarEstadoAR('Mueve el teléfono para detectar una superficie.');

  const actualizarReticula = (tiempo, frame) => {
    if (!sesionAR || sesionAR !== escena.xrSession || !fuenteHitTest) {
      return;
    }

    const resultados = frame.getHitTestResults(fuenteHitTest);
    if (resultados.length > 0) {
      const pose = resultados[0].getPose(espacioReferencia);
      if (pose) {
        ultimaSuperficie = {
          posicion: pose.transform.position,
          orientacion: pose.transform.orientation
        };
        reticula.object3D.position.set(
          pose.transform.position.x,
          pose.transform.position.y,
          pose.transform.position.z
        );
        reticula.object3D.quaternion.set(
          pose.transform.orientation.x,
          pose.transform.orientation.y,
          pose.transform.orientation.z,
          pose.transform.orientation.w
        );
        reticula.object3D.visible = true;
        actualizarEstadoAR('Superficie detectada. Toca la pantalla para colocar el producto.');
      }
    } else {
      ultimaSuperficie = null;
      reticula.object3D.visible = false;
      actualizarEstadoAR('Mueve el teléfono para detectar una superficie.');
    }

    sesionAR.requestAnimationFrame(actualizarReticula);
  };

  sesionAR.requestAnimationFrame(actualizarReticula);
}

function colocarProductoEnSuperficie() {
  if (!ultimaSuperficie) {
    actualizarEstadoAR('Aún no se detecta una superficie. Mueve el teléfono lentamente.');
    return;
  }

  const THREE = AFRAME.THREE;
  const posicion = ultimaSuperficie.posicion;
  const orientacion = ultimaSuperficie.orientacion;
  const rotacion = new THREE.Quaternion(
    orientacion.x,
    orientacion.y,
    orientacion.z,
    orientacion.w
  );
  const desplazamientoCentro = new THREE.Vector3(0, 0.5, 0).applyQuaternion(rotacion);

  producto.object3D.position.set(
    posicion.x + desplazamientoCentro.x,
    posicion.y + desplazamientoCentro.y,
    posicion.z + desplazamientoCentro.z
  );
  producto.object3D.quaternion.copy(rotacion);
  producto.object3D.updateMatrix();
  producto.setAttribute('visible', true);
  registrarInteraccion('Producto colocado en AR', {
    x: Number(posicion.x.toFixed(2)),
    y: Number(posicion.y.toFixed(2)),
    z: Number(posicion.z.toFixed(2))
  });
  actualizarEstadoAR('Producto colocado. Apúntalo con el cursor virtual para interactuar.');
}

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

botonAR.addEventListener('click', async () => {
  botonAR.disabled = true;
  actualizarEstadoAR('Solicitando acceso a la cámara y al seguimiento de superficies…');

  try {
    await escena.enterAR();
  } catch (error) {
    console.error('No se pudo iniciar la experiencia WebAR:', error);
    actualizarEstadoAR(`No se pudo iniciar AR: ${error.message}`);
    botonAR.disabled = false;
  }
});

escena.addEventListener('enter-vr', () => {
  if (!escena.is('ar-mode')) {
    return;
  }

  iniciarDeteccionDeSuperficies().catch((error) => {
    console.error('No se pudo iniciar la detección de superficies AR:', error);
    actualizarEstadoAR(`No se pudo detectar superficies: ${error.message}`);
    escena.exitVR();
  });
});

escena.addEventListener('exit-vr', () => {
  limpiarSesionAR();
  botonAR.disabled = false;
});

async function comprobarCompatibilidadAR() {
  if (!window.isSecureContext || !navigator.xr || typeof navigator.xr.isSessionSupported !== 'function') {
    botonAR.textContent = 'AR requiere un navegador compatible';
    actualizarEstadoAR('La AR requiere HTTPS y un navegador móvil compatible con WebXR. El showroom 3D sigue disponible.');
    return;
  }

  try {
    const compatible = await navigator.xr.isSessionSupported('immersive-ar');
    botonAR.disabled = !compatible;
    botonAR.textContent = compatible ? 'Iniciar AR con cámara' : 'AR no disponible en este dispositivo';
    actualizarEstadoAR(compatible
      ? 'Dispositivo compatible: inicia AR para colocar el producto en una superficie.'
      : 'Este dispositivo no admite WebXR AR. Puedes usar todos los controles del showroom 3D.');
  } catch (error) {
    console.error('No se pudo comprobar la compatibilidad WebXR:', error);
    botonAR.textContent = 'No se pudo comprobar compatibilidad AR';
    actualizarEstadoAR('No se pudo comprobar la compatibilidad WebXR. El showroom 3D sigue disponible.');
  }
}

if (escena.hasLoaded) {
  comprobarCompatibilidadAR();
} else {
  escena.addEventListener('loaded', comprobarCompatibilidadAR, { once: true });
}
