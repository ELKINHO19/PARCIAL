const boton = document.querySelector("#boton-interactivo");
const titulo = document.querySelector(".hero-title");
const seccion = document.querySelector(".hero-banner");

const tituloOriginal = titulo.innerHTML;
const tituloAlternativo =
    'Sistema Interactivo <span class="text-accent">MMA</span>';

boton.addEventListener("click", function () {
    const estaActivo = seccion.classList.toggle("seccion-dinamica");

    if (estaActivo) {
        titulo.innerHTML = tituloAlternativo;
        boton.textContent = "Restaurar presentación";
    } else {
        titulo.innerHTML = tituloOriginal;
        boton.textContent = "Cambiar presentación";
    }
});
