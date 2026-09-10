import { NextRequest, NextResponse } from "next/server";
import { crearClienteServidor } from "@/lib/supabase";
import { obtenerAdminActivo } from "@/lib/auth";
import { loginAdminSchema } from "@/lib/schemas/loginAdmin";
import { logError } from "@/lib/logger";

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
      // Logging temporal de diagnóstico: el mensaje genérico al cliente no
      // dice POR QUÉ Supabase rechazó el login (credenciales, rate limit,
      // API key de otro proyecto...) — esto sí queda en los Runtime Logs de
      // Vercel. Sacar una vez resuelto.
      logError("api/admin/login (signInWithPassword)", error, `status=${error.status} code=${error.code}`);
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
      return NextResponse.json(
        { ok: false, mensaje: "Tu cuenta no tiene acceso al panel de administración." },
        { status: 403 },
      );
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    logError("api/admin/login", err);
    return NextResponse.json({ ok: false, mensaje: "No se pudo iniciar sesión." }, { status: 500 });
  }
}
