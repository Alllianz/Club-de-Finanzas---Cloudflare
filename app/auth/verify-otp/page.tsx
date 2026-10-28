"use client";

import { FormEvent, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "../../context/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function VerifyOtpPage() {
  const { email, verifyOtp } = useAuth();
  const router = useRouter();
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const safeEmail = useMemo(() => email.trim(), [email]);

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!safeEmail || loading) return;

    setLoading(true);
    setError("");

    try {
      const user = await verifyOtp(safeEmail, otp);
      router.push(user.role === "ADMIN" ? "/admin" : "/admin/posts");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Código OTP inválido o expirado");
    } finally {
      setLoading(false);
    }
  };

  if (!safeEmail) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#f8fafc] px-4 py-12">
        <Card className="w-full max-w-[440px] rounded-2xl border border-[#e2e8f0] bg-[#ffffff] p-6 shadow-md">
          <CardHeader className="p-0 pb-4">
            <CardTitle className="font-serif text-2xl font-bold text-[#0e2246]">Validación de Acceso</CardTitle>
            <CardDescription className="text-xs text-[#64748b]">
              Primero debés solicitar tu código desde la pantalla de ingreso.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0 pt-2">
            <Link
              href="/auth/login"
              className="inline-flex w-full items-center justify-center rounded-full bg-[#091a36] py-2.5 text-xs font-bold uppercase tracking-wider text-white transition hover:bg-[#0062ff]"
            >
              Ir a Iniciar Sesión
            </Link>
          </CardContent>
        </Card>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f8fafc] px-4 py-12">
      <div className="w-full max-w-[480px] space-y-6">
        <div className="flex flex-col items-center text-center">
          <Link href="/">
            <div className="flex h-14 w-[240px] items-center justify-center overflow-hidden">
              <Image
                src="/clubdefinanzasubalogohorizontal.png"
                alt="Club de Finanzas UBA"
                width={480}
                height={110}
                className="h-full w-full object-contain"
                priority
              />
            </div>
          </Link>
          <p className="mt-2 text-xs font-extrabold uppercase tracking-[0.2em] text-[#0062ff]">
            Verificación de Seguridad
          </p>
        </div>

        <Card className="rounded-2xl border border-[#e2e8f0] bg-[#ffffff] shadow-md">
          <CardHeader className="pb-4">
            <CardTitle className="font-serif text-2xl font-bold text-[#0e2246]">
              Ingresar Código OTP
            </CardTitle>
            <CardDescription className="text-xs leading-relaxed text-[#64748b]">
              Paso 2 de 2. Ingresá el código numérico de 6 dígitos enviado a <strong className="text-[#0e2246]">{safeEmail}</strong>.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            <form className="space-y-4" onSubmit={onSubmit}>
              <div className="space-y-1.5">
                <Label htmlFor="otp" className="text-center block text-xs font-bold uppercase tracking-wider text-[#0e2246]">
                  Código de 6 Dígitos
                </Label>
                <Input
                  id="otp"
                  type="text"
                  required
                  maxLength={6}
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  placeholder="------"
                  className="h-14 rounded-xl border-[#e2e8f0] bg-[#f0f6ff] text-center font-mono text-3xl font-extrabold tracking-[0.4em] text-[#091a36] outline-none transition focus:border-[#0062ff] focus:ring-2 focus:ring-[#0062ff]/10"
                />
              </div>

              {error ? (
                <Alert variant="destructive" className="rounded-xl border-red-200 bg-red-50 p-3 text-xs text-red-700">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              ) : null}

              <Button
                type="submit"
                disabled={loading || otp.length !== 6}
                className="w-full rounded-full bg-[#0062ff] py-3 text-xs font-bold uppercase tracking-wider text-white shadow-sm transition hover:bg-[#091a36]"
              >
                {loading ? "Validando sesión..." : "Ingresar al Backoffice"}
              </Button>
            </form>
          </CardContent>
        </Card>

        <p className="text-center text-xs text-[#64748b]">
          <Link href="/auth/login" className="font-semibold text-[#091a36] hover:text-[#0062ff]">
            ← Solicitar otro código
          </Link>
        </p>
      </div>
    </main>
  );
}
