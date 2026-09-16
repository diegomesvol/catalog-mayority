// Señal global de "arrancó una navegación", para NavegacionOverlay.tsx (el
// overlay de pantalla completa montado una sola vez en app/layout.tsx).
// Mismo patrón que registrarAvisoDemo en lib/apiCliente.ts: un único
// callback registrado por el componente que vive montado siempre, en vez de
// Context — no hace falta re-renderizar un árbol entero por esto.
//
// NavegacionOverlay ya detecta solo los clicks en cualquier <a href> del
// documento (no hace falta llamar a esto para <Link/> normales) — esto es
// solo para las pocas navegaciones que se disparan por código, con
// router.push, sin pasar por un <a> (ver BuscadorNavbar y
// PerfilClienteForm).
type ManejadorInicioNavegacion = () => void;
let manejador: ManejadorInicioNavegacion | null = null;

export function registrarInicioNavegacion(m: ManejadorInicioNavegacion | null) {
  manejador = m;
}

export function iniciarNavegacion() {
  manejador?.();
}
