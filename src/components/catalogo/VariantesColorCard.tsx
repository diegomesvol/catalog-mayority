"use client";

import { ImagenProducto } from "./ImagenProducto";
import { tieneStockColor } from "@/lib/producto";
import type { VarianteColor } from "@/lib/types";

interface Props {
  colores: VarianteColor[];
  colorActivo: string;
  onSeleccionar: (color: VarianteColor) => void;
  onPrevisualizar: (color: VarianteColor | null) => void;
}

// Miniaturas de color DENTRO de la tarjeta del catálogo — dejan ver (y
// previsualizar) las variantes de color de un modelo sin entrar al detalle.
// Solo se renderiza cuando el producto tiene MÁS DE UN color (ver
// ProductCard): con uno solo no hay nada que elegir.
//
// Dos gestos distintos a propósito:
// - Pasar el mouse (o el foco de teclado) por una miniatura solo
//   PREVISUALIZA: cambia la foto grande mientras dura el hover/foco, sin
//   tocar la selección real (onPrevisualizar). Al salir, vuelve al color
//   elegido.
// - Tocar/clickear una miniatura sí SELECCIONA (onSeleccionar): pasa a ser
//   el color activo de la tarjeta (foto grande, botón de agregar y de
//   compartir). En mobile, sin hover real, el toque es directamente el
//   gesto de elegir — no hace falta ningún manejo especial para touch.
//
// Mismo lenguaje visual que SelectorCurvaCard (activo = trazo oscuro) pero
// con un anillo en vez de relleno sólido, porque acá lo que hay que ver es
// la foto en miniatura, no taparla. Vive por ENCIMA del <Link> que cubre
// toda la card (z-20, igual que SelectorCurvaCard — ver ProductCard) así
// el click acá nunca navega al detalle.
export function VariantesColorCard({ colores, colorActivo, onSeleccionar, onPrevisualizar }: Props) {
  return (
    <div className="relative z-20 flex flex-wrap gap-1.5" role="group" aria-label="Elegir color">
      {colores.map((color) => {
        const activo = color.color === colorActivo;
        const conStock = tieneStockColor(color);
        return (
          <button
            key={color.color}
            type="button"
            aria-pressed={activo}
            aria-label={conStock ? `Ver en color ${color.color}` : `Ver en color ${color.color} — sin stock`}
            title={color.color}
            onMouseEnter={() => onPrevisualizar(color)}
            onMouseLeave={() => onPrevisualizar(null)}
            onFocus={() => onPrevisualizar(color)}
            onBlur={() => onPrevisualizar(null)}
            onClick={(e) => {
              // Igual que SelectorCurvaCard/AgregarCarritoCard: este botón ya
              // vive por encima del link fantasma (z-20 > z-10), el
              // stopPropagation es solo un resguardo extra.
              e.stopPropagation();
              onSeleccionar(color);
            }}
            className={[
              "h-8 w-8 shrink-0 overflow-hidden rounded-lg ring-2 ring-offset-1 ring-offset-paper-raised transition-all duration-150 focus:outline-none focus-visible:ring-accent-600",
              !conStock ? "opacity-50" : "",
              activo ? "ring-ink-900" : "ring-ink-200 hover:ring-ink-500",
            ].join(" ")}
          >
            {/* Decorativa: el botón ya describe el color por su aria-label. */}
            <ImagenProducto src={color.fotos[0]} alt="" className="h-full w-full" sizes="32px" />
          </button>
        );
      })}
    </div>
  );
}
