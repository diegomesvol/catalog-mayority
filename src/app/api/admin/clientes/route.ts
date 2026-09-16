import { NextRequest, NextResponse } from "next/server";
import { crearClienteServidor, crearClienteServicio } from "@/lib/supabase";
import { requierePermisoEscritura, obtenerAdminActivo } from "@/lib/auth";
import { invitarClienteSchema } from "@/lib/schemas/cliente";
import { logError } from "@/lib/logger";

// Lista de clientes para el panel admin — cualquier admin activo (incl.
// demo) puede verla, mismo criterio que el resto de las pantallas de
// solo-lectura del panel.
export async function GET() {
  const supabase = await crearClienteServidor();
  const admin = await obtenerAdminActivo(supabase);
  if (!admin) return NextResponse.json({ ok: false, mensaje: "No autenticado." }, { status: 401 });

  const { data, error } = await supabase.from("clientes").select("*").order("creado_en", { ascending: false });
  if (error) {
    logError("api/admin/clientes GET", error);
    return NextResponse.json({ ok: false, mensaje: "No se pudieron leer los clientes." }, { status: 500 });
  }
  return NextResponse.json({ ok: true, clientes: data });
}

// Invita a un cliente nuevo: crea la cuenta en Supabase Auth (manda el
// email de invitación) y su fila en `clientes`. El alta en auth.users
// necesita la Admin API (service role) — RLS no aplica ahí, así que el
// chequeo de permiso de esta ruta es la única barrera real para esta
// acción en particular.
export async function POST(request: NextRequest) {
  const supabase = await crearClienteServidor();
  const permiso = await requierePermisoEscritura(supabase, "operativo");
  if (!permiso.ok) return permiso.respuesta;

  try {
    const body = await request.json().catch(() => null);
    const parsed = invitarClienteSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ ok: false, mensaje: parsed.error.issues[0].message }, { status: 400 });
    }
    const { email, nombre, empresa, telefono, rif } = parsed.data;

    const servicio = crearClienteServicio();
    const redirectTo = new URL("/cliente/invitacion", request.nextUrl.origin).toString();
    const { data: invitado, error: errorInvitacion } = await servicio.auth.admin.inviteUserByEmail(email, { redirectTo });

    if (errorInvitacion || !invitado.user) {
      logError("api/admin/clientes POST (invite)", errorInvitacion);
      const yaExiste = /already registered|already exists/i.test(errorInvitacion?.message ?? "");
      return NextResponse.json(
        { ok: false, mensaje: yaExiste ? "Ya existe una cuenta con ese email." : "No se pudo enviar la invitación." },
        { status: yaExiste ? 409 : 500 },
      );
    }

    const { data: cliente, error: errorInsert } = await supabase
      .from("clientes")
      .insert({ user_id: invitado.user.id, email, nombre, empresa, telefono, rif })
      .select()
      .single();

    if (errorInsert) {
      logError("api/admin/clientes POST (insert)", errorInsert);
      // La cuenta de auth.users ya se creó e invitó — no se deshace acá
      // (revocar la invitación no es una operación simple de la Admin API y
      // el email ya salió). Queda como cuenta invitada sin fila en
      // `clientes`; se puede reintentar el alta manualmente en Supabase.
      return NextResponse.json(
        { ok: false, mensaje: "La invitación se envió pero no se pudo guardar el perfil del cliente. Avisale a soporte." },
        { status: 500 },
      );
    }

    return NextResponse.json({ ok: true, cliente });
  } catch (err) {
    logError("api/admin/clientes POST", err);
    return NextResponse.json({ ok: false, mensaje: "No se pudo invitar al cliente." }, { status: 500 });
  }
}
