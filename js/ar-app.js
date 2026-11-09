const producto = document.querySelector('#objeto-producto');

function registrarInteraccion(evento, detalle) {
  try {
    const metricas = JSON.parse(localStorage.getItem('ar_metrics') || '[]');

    if (!Array.isArray(metricas)) {
      throw new TypeError('Los datos guardados en ar_metrics no tienen el formato esperado.');
    }

    metricas.push({
      fecha: new Date().toLocaleTimeString(),
      evento,
      detalle
    });
    localStorage.setItem('ar_metrics', JSON.stringify(metricas));
    console.log('Métrica AR registrada:', metricas);
  } catch (error) {
    console.error('No se pudo guardar la interacción en LocalStorage:', error);
  }
}

if (producto) {
  producto.addEventListener('click', () => {
    const nuevosColores = ['#2AFF6B', '#2A75FF', '#FF2AEE', '#FFCC00'];
    const colorAleatorio = nuevosColores[Math.floor(Math.random() * nuevosColores.length)];

    producto.setAttribute('color', colorAleatorio);
    registrarInteraccion('Clic en Producto AR', colorAleatorio);
  });
} else {
  console.error('No se encontró el objeto AR #objeto-producto.');
}
