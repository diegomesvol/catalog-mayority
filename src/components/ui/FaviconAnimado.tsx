"use client";

import { useEffect, useRef } from "react";
import { useNavegacionPendiente } from "@/lib/navegacion";

// Favicon animado mientras hay una navegación en curso — mismo spinner que
// NavegacionOverlay (arco sobre pista, mismos colores de globals.css:
// --color-ink-900/--color-ink-200) pero dibujado cuadro a cuadro en un
// <canvas> en memoria y volcado como data URL sobre los <link rel="icon">
// que Next generó a partir de app/favicon.ico + app/icon.png. Pueden ser
// más de uno — los navegadores no siempre eligen el mismo — así que se
// pisan todos por igual y se restauran a su href original al terminar.
//
// Montado una sola vez en app/layout.tsx junto a NavegacionOverlay. Lee la
// misma señal compartida (lib/navegacion.ts) sin duplicar la lógica de
// detección de clicks/pathname — ver la nota grande en NavegacionOverlay.
const TAMANO = 32;
const COLOR_ARCO = "#1c1a17"; // --color-ink-900
const COLOR_PISTA = "#e7e4de"; // --color-ink-200
const VELOCIDAD_MS = 80;
const PASO_GRADOS = 24;

function dibujarCuadro(anguloGrados: number): string | null {
  const canvas = document.createElement("canvas");
  canvas.width = TAMANO;
  canvas.height = TAMANO;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  const centro = TAMANO / 2;
  const radio = centro - 3;

  ctx.lineWidth = 4;
  ctx.lineCap = "round";
  ctx.strokeStyle = COLOR_PISTA;
  ctx.beginPath();
  ctx.arc(centro, centro, radio, 0, Math.PI * 2);
  ctx.stroke();

  ctx.strokeStyle = COLOR_ARCO;
  const inicio = (anguloGrados * Math.PI) / 180;
  ctx.beginPath();
  ctx.arc(centro, centro, radio, inicio, inicio + Math.PI * 1.5);
  ctx.stroke();

  return canvas.toDataURL("image/png");
}

export function FaviconAnimado() {
  const pendiente = useNavegacionPendiente();
  const originalesRef = useRef<Map<HTMLLinkElement, string> | null>(null);

  useEffect(() => {
    const links = Array.from(document.querySelectorAll<HTMLLinkElement>('link[rel="icon"]'));
    if (links.length === 0) return;

    if (!pendiente) {
      const originales = originalesRef.current;
      if (originales) {
        for (const [link, href] of originales) link.href = href;
        originalesRef.current = null;
      }
      return;
    }

    if (!originalesRef.current) {
      originalesRef.current = new Map(links.map((link) => [link, link.href]));
    }

    let angulo = 0;
    const intervalo = window.setInterval(() => {
      angulo = (angulo + PASO_GRADOS) % 360;
      const dataUrl = dibujarCuadro(angulo);
      if (!dataUrl) return;
      for (const link of links) link.href = dataUrl;
    }, VELOCIDAD_MS);

    return () => window.clearInterval(intervalo);
  }, [pendiente]);

  return null;
}
