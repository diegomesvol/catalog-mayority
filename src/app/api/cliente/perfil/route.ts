import { NextRequest, NextResponse } from "next/server";
import { crearClienteServidor } from "@/lib/supabase";
import { obtenerClienteActivo, requiereClienteActivo } from "@/lib/clienteAuth";
import { actualizarPerfilClienteSchema } from "@/lib/schemas/perfilCliente";
import { logError } from "@/lib/logger";

// Perfil del cliente logueado (los campos "de siempre" + los del
// onboarding, ver lib/clienteAuth.ts) — lo consume /cliente/perfil (el
// formulario) para precargar lo que ya haya completado antes.
export async function GET() {
  const supabase = await crearClienteServidor();
  const permiso = await requiereClienteActivo(supabase);
  if (!permiso.ok) return permiso.respuesta;
  return NextResponse.json({ ok: true, perfil: permiso.perfil });
}

// Completa/edita los campos del onboarding — nombre/empresa/telefono/rif NO
// se tocan acá (los define el admin al invitar, ver api/admin/clientes).
// perfil_completo es una columna generada (ver migración): se recalcula
// sola en la base apenas este UPDATE toca cualquiera de los campos que
// entran en su fórmula, no hace falta (ni se puede) escribirla a mano.
export async function PATCH(request: NextRequest) {
  const supabase = await crearClienteServidor();
  const permiso = await requiereClienteActivo(supabase);
  if (!permiso.ok) return permiso.respuesta;

  try {
    const body = await request.json().catch(() => null);
    const parsed = actualizarPerfilClienteSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ ok: false, mensaje: parsed.error.issues[0].message }, { status: 400 });
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ ok: false, mensaje: "No autenticado." }, { status: 401 });

    const cambios: Record<string, unknown> = {
      telefono_2: parsed.data.telefono2,
      direccion: parsed.data.direccion,
      ciudad: parsed.data.ciudad,
      estado_ubicacion: parsed.data.estadoUbicacion,
      metodos_pago: parsed.data.metodosPago,
    };
    // logo_url NO se acepta acá: solo lo escribe api/cliente/perfil/logo con
    // la URL real del Storage. Antes este PATCH aceptaba cualquier string
    // (URL externa arbitraria guardada como logo del cliente) y el
    // formulario ni siquiera lo usaba.

    const { error } = await supabase.from("clientes").update(cambios).eq("user_id", user.id);
    if (error) {
      logError("api/cliente/perfil PATCH", error);
      return NextResponse.json({ ok: false, mensaje: "No se pudo guardar el perfil." }, { status: 500 });
    }

    // Se relee (no se arma a mano desde `cambios`) para devolver el
    // perfil_completo ya recalculado por la columna generada.
    const perfilActualizado = await obtenerClienteActivo(supabase);
    return NextResponse.json({ ok: true, perfil: perfilActualizado });
  } catch (err) {
    logError("api/cliente/perfil PATCH", err);
    return NextResponse.json({ ok: false, mensaje: "No se pudo guardar el perfil." }, { status: 500 });
  }
}
