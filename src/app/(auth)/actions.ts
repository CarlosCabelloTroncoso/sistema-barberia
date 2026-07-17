"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const loginSchema = z.object({
  email: z.string().email("Email inválido"),
  password: z.string().min(1, "Ingresa tu contraseña"),
});

const signupSchema = z.object({
  fullName: z.string().min(2, "Ingresa tu nombre"),
  phone: z
    .string()
    .regex(/^\+?56?\s?9\s?\d{4}\s?\d{4}$/, "Teléfono chileno inválido (ej: +56 9 1234 5678)")
    .or(z.literal("")),
  email: z.string().email("Email inválido"),
  password: z.string().min(8, "Mínimo 8 caracteres"),
});

export type AuthResult = { error?: string };

export async function login(
  _prev: AuthResult | undefined,
  formData: FormData
): Promise<AuthResult> {
  const parsed = loginSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);

  if (error) {
    return { error: "Email o contraseña incorrectos" };
  }

  revalidatePath("/", "layout");
  const next = formData.get("next");
  redirect(typeof next === "string" && next.startsWith("/") ? next : "/cuenta");
}

export async function signup(
  _prev: AuthResult | undefined,
  formData: FormData
): Promise<AuthResult> {
  const parsed = signupSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const { email, password, fullName, phone } = parsed.data;
  const supabase = await createClient();

  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { full_name: fullName, phone: phone || null },
    },
  });

  if (error) {
    return {
      error:
        error.code === "user_already_exists"
          ? "Este email ya está registrado"
          : "No se pudo crear la cuenta. Intenta de nuevo.",
    };
  }

  revalidatePath("/", "layout");
  redirect("/cuenta");
}

export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/");
}

/* ════════════════════════════════════════════════════════════════════
 * PENDIENTE (2026-07-16): recuperación de contraseña — NO IMPLEMENTADO.
 *
 * Hoy si un cliente olvida su clave queda trabado: no hay link "¿Olvidaste
 * tu contraseña?", ni ruta, ni forma self-service de resetearla. Único
 * remedio actual: admin resetea manual desde Supabase dashboard
 * (Authentication → Users → seleccionar usuario → "Send password
 * recovery" o setear clave nueva a mano).
 *
 * Abajo va el flujo completo listo para activar (código real, solo
 * comentado). Para activarlo una IA futura debe:
 *
 *   1. Descomentar `requestPasswordReset` y `updatePassword` de este
 *      archivo (y el import de `headers` de next/headers, ver abajo).
 *   2. Quitar el sufijo ".disabled" de estos archivos (son código real,
 *      ya escrito, solo inactivos por el sufijo — Next no los enruta así):
 *        - src/app/auth/confirm/route.ts.disabled
 *          (intercambia el token del email por una sesión de recovery)
 *        - src/app/(auth)/recuperar/page.tsx.disabled
 *        - src/app/(auth)/recuperar/recuperar-form.tsx.disabled
 *          (pantalla donde el cliente pide el link por email)
 *        - src/app/cuenta/nueva-clave/page.tsx.disabled
 *        - src/app/cuenta/nueva-clave/nueva-clave-form.tsx.disabled
 *          (pantalla donde entra desde el link del email y setea clave
 *          nueva; requiere sesión de recovery activa)
 *   3. En login-form.tsx: descomentar el link "¿Olvidaste tu
 *      contraseña?" (ver comentario ahí).
 *   4. En Supabase dashboard → Authentication → URL Configuration:
 *      agregar `<url-produccion>/auth/confirm` a Redirect URLs (si no
 *      está ya cubierto por un wildcard).
 *   5. Probar flujo completo en local con una cuenta de prueba antes
 *      de dar por hecho que funciona: pedir reset → revisar email
 *      (llega solo a ignaciocarlos016@gmail.com mientras no haya
 *      dominio verificado en Resend/Supabase SMTP) → click al link →
 *      setear clave nueva → confirmar que loguea con la clave nueva.
 *
 * import { headers } from "next/headers";
 *
 * const resetRequestSchema = z.object({
 *   email: z.string().email("Email inválido"),
 * });
 *
 * export async function requestPasswordReset(
 *   _prev: AuthResult | undefined,
 *   formData: FormData
 * ): Promise<AuthResult> {
 *   const parsed = resetRequestSchema.safeParse(Object.fromEntries(formData));
 *   if (!parsed.success) return { error: parsed.error.issues[0].message };
 *
 *   const supabase = await createClient();
 *   const origin = (await headers()).get("origin");
 *   await supabase.auth.resetPasswordForEmail(parsed.data.email, {
 *     redirectTo: `${origin}/auth/confirm?next=/cuenta/nueva-clave`,
 *   });
 *
 *   // Ojo: no devolvemos error si el email no existe — evita que alguien
 *   // use este formulario para averiguar qué emails están registrados
 *   // (enumeración de usuarios). Siempre se muestra el mismo mensaje de
 *   // éxito ("si el email existe, te llegará un link").
 *   return {};
 * }
 *
 * const newPasswordSchema = z.object({
 *   password: z.string().min(8, "Mínimo 8 caracteres"),
 * });
 *
 * export async function updatePassword(
 *   _prev: AuthResult | undefined,
 *   formData: FormData
 * ): Promise<AuthResult> {
 *   const parsed = newPasswordSchema.safeParse(Object.fromEntries(formData));
 *   if (!parsed.success) return { error: parsed.error.issues[0].message };
 *
 *   const supabase = await createClient();
 *   // Requiere que exista una sesión de recovery activa (viene de
 *   // /auth/confirm tras validar el token del email). Si no, updateUser
 *   // falla con "Auth session missing".
 *   const { error } = await supabase.auth.updateUser({
 *     password: parsed.data.password,
 *   });
 *   if (error) {
 *     return {
 *       error: "No se pudo actualizar la contraseña. El link puede haber expirado, pide uno nuevo.",
 *     };
 *   }
 *
 *   revalidatePath("/", "layout");
 *   redirect("/cuenta");
 * }
 * ════════════════════════════════════════════════════════════════════ */
