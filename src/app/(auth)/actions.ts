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
