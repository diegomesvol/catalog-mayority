"use client";

import { useSyncExternalStore } from "react";

// Store mínimo (sin Context, mismo criterio que registrarAvisoDemo en
// lib/apiCliente.ts) para la señal global de "hay una navegación en curso".
// El único "driver" real — quien decide cuándo prende/apaga esto mirando
// clicks en <a href>, cambios de pathname/searchParams y el timeout de
// seguridad — sigue siendo NavegacionOverlay.tsx. Este archivo solo guarda
// el valor compartido para que OTROS consumidores (FaviconAnimado.tsx) lo
// lean sin duplicar esa lógica de detección.
type Escuchador = () => void;

let pendiente = false;
const escuchadores = new Set<Escuchador>();

export function fijarNavegacionPendiente(valor: boolean) {
  if (pendiente === valor) return;
  pendiente = valor;
  escuchadores.forEach((fn) => fn());
}

// Para las pocas navegaciones que se disparan por código, sin pasar por un
// <a> (buscador al presionar Enter, redirect tras completar el onboarding
// del perfil) — ver BuscadorNavbar.tsx y PerfilClienteForm.tsx. Los clicks
// en <a href> normales ya los detecta NavegacionOverlay solo.
export function iniciarNavegacion() {
  fijarNavegacionPendiente(true);
}

function suscribir(fn: Escuchador) {
  escuchadores.add(fn);
  return () => escuchadores.delete(fn);
}

function obtenerSnapshot() {
  return pendiente;
}

function obtenerSnapshotServidor() {
  return false;
}

export function useNavegacionPendiente(): boolean {
  return useSyncExternalStore(suscribir, obtenerSnapshot, obtenerSnapshotServidor);
}
