import { NextRequest, NextResponse } from "next/server";
import { crearClienteServidor } from "@/lib/supabase";
import { obtenerClienteActivo } from "@/lib/clienteAuth";
import { loginAdminSchema } from "@/lib/schemas/loginAdmin";
import { logError } from "@/lib/logger";

// Mismo esquema que el login de admin (email + password) — no hay nada
// específico de "cliente" en la forma del formulario, así que se reutiliza
// en vez de duplicar la validación.
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => null);
    const parsed = loginAdminSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ ok: false, mensaje: parsed.error.issues[0].message }, { status: 400 });
    }
    const { email, password } = parsed.data;

    const supabase = await crearClienteServidor();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      return NextResponse.json({ ok: false, mensaje: "Email o contraseña incorrectos." }, { status: 401 });
    }

    // Igual que en el login de admin: una cuenta de auth.users sin fila en
    // `clientes` (o desactivada) no es un cliente válido de este portal,
    // aunque la sesión de Supabase Auth haya quedado bien.
    const cliente = await obtenerClienteActivo(supabase);
    if (!cliente) {
      await supabase.auth.signOut();
      // codigo: "SIN_ACCESO" — ver la misma nota en api/admin/login/route.ts:
      // mensaje genérico a propósito, no distingue no-existe/desactivado/
      // nunca-invitado (evita enumeración de cuentas).
      return NextResponse.json(
        { ok: false, mensaje: "Tu cuenta no tiene acceso a este portal.", codigo: "SIN_ACCESO" },
        { status: 403 },
      );
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    logError("api/cliente/login", err);
    return NextResponse.json({ ok: false, mensaje: "No se pudo iniciar sesión." }, { status: 500 });
  }
}
