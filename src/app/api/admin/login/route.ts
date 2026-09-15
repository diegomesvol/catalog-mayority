import { NextRequest, NextResponse } from "next/server";
import { crearClienteServicio, crearClienteServidor } from "@/lib/supabase";
import { obtenerAdminActivo } from "@/lib/auth";
import { loginAdminSchema } from "@/lib/schemas/loginAdmin";
import { logError } from "@/lib/logger";

const MENSAJE_REQUIERE_GOOGLE =
  "Tu último ingreso fue mediante Google y no posees una contraseña asignada. Por favor ingresa con Google o define una clave desde tu perfil de usuario.";

/**
 * true solo si "email" es una cuenta de ADMIN (tiene fila en admin_perfiles)
 * que se autenticó alguna vez con Google y NUNCA configuró una contraseña
 * propia (no tiene identidad "email" en auth.identities) — es la condición
 * real y estable detrás de "tu último ingreso fue por Google": no hace
 * falta guardar un "último método" aparte (que podría desincronizarse) —
 * si YA tiene contraseña (la trajo la invitación, o la definió después
 * desde su perfil — ver PerfilSeguridadAdmin), el login normal sigue de
 * largo y este chequeo ni se consulta.
 *
 * Usa el cliente de SERVICIO (auth.admin.*) — necesario para leer
 * identidades ajenas; por eso se acota el resultado a cuentas que además
 * tienen fila en admin_perfiles, para no convertir esto en un oráculo que
 * revele si CUALQUIER email (ej. de un cliente) existe en el sistema.
 * listUsers no tiene filtro por email en el SDK — con la base chica de
 * administradores de este panel, traer una página y filtrar acá es más
 * simple y confiable que depender de un parámetro que varía entre
 * versiones del SDK.
 */
async function requiereLoginConGoogle(email: string): Promise<boolean> {
  try {
    const servicio = crearClienteServicio();
    const { data, error } = await servicio.auth.admin.listUsers({ page: 1, perPage: 1000 });
    if (error || !data) return false;

    const usuario = data.users.find((u) => u.email?.toLowerCase() === email.toLowerCase());
    if (!usuario) return false;

    const identidades = usuario.identities ?? [];
    const tieneGoogle = identidades.some((i) => i.provider === "google");
    const tienePassword = identidades.some((i) => i.provider === "email");
    if (!tieneGoogle || tienePassword) return false;

    const { data: perfil } = await servicio.from("admin_perfiles").select("user_id").eq("user_id", usuario.id).maybeSingle();
    return Boolean(perfil);
  } catch (err) {
    logError("api/admin/login requiereLoginConGoogle", err);
    return false;
  }
}

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
      if (await requiereLoginConGoogle(email)) {
        return NextResponse.json({ ok: false, mensaje: MENSAJE_REQUIERE_GOOGLE, requiereGoogle: true }, { status: 401 });
      }
      return NextResponse.json({ ok: false, mensaje: "Email o contraseña incorrectos." }, { status: 401 });
    }

    // La sesión ya quedó válida en Supabase Auth, pero eso no alcanza: solo
    // los usuarios con fila en admin_perfiles (activo=true) son admins de
    // este panel. Sin este chequeo, una cuenta de auth.users sin perfil
    // quedaría "logueada" acá y rebotada por el proxy en el siguiente click,
    // sin entender por qué.
    const admin = await obtenerAdminActivo(supabase);
    if (!admin) {
      await supabase.auth.signOut();
      // codigo: "SIN_ACCESO" — lo usa LoginAdminForm para mostrar la card de
      // AccesoNoAutorizado en vez de un toast (ver components/ui). El
      // mensaje es el mismo genérico sea cual sea el motivo real (no
      // existe, desactivado, nunca invitado) — no distinguir evita que
      // alguien use este endpoint para "probar" qué emails están dados de
      // alta en el sistema.
      return NextResponse.json(
        { ok: false, mensaje: "Tu cuenta no tiene acceso al panel de administración.", codigo: "SIN_ACCESO" },
        { status: 403 },
      );
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    logError("api/admin/login", err);
    return NextResponse.json({ ok: false, mensaje: "No se pudo iniciar sesión." }, { status: 500 });
  }
}
