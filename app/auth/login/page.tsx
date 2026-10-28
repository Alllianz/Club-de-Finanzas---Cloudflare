"use client";

import { FormEvent, useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "../../context/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function LoginPage() {
  const { requestOtp, setEmail, user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [email, setEmailLocal] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (loading) return;

    setLoading(true);
    setError("");

    try {
      await requestOtp(email);
      setEmail(email);
      router.push("/auth/verify-otp");
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo enviar el código OTP");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (authLoading) return;
    if (!user) return;
    router.replace(user.role === "ADMIN" ? "/admin" : "/admin/posts");
  }, [authLoading, user, router]);

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
            Portal de Autogestión y Contenidos
          </p>
        </div>

        <Card className="rounded-2xl border border-[#e2e8f0] bg-[#ffffff] shadow-md">
          <CardHeader className="pb-4">
            <CardTitle className="font-serif text-2xl font-bold text-[#0e2246]">
              Ingreso al Backoffice
            </CardTitle>
            <CardDescription className="text-xs leading-relaxed text-[#64748b]">
              Paso 1 de 2. Ingresá tu correo autorizado para recibir un código de acceso único (OTP).
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            <form className="space-y-4" onSubmit={onSubmit}>
              <div className="space-y-1.5">
                <Label htmlFor="email" className="text-xs font-bold uppercase tracking-wider text-[#0e2246]">
                  Correo Electrónico
                </Label>
                <Input
                  id="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmailLocal(e.target.value)}
                  placeholder="nombre@clubdefinanzasuba.com"
                  className="h-11 rounded-xl border-[#e2e8f0] bg-[#ffffff] px-4 text-sm text-[#0e2246] outline-none transition focus:border-[#0062ff] focus:ring-2 focus:ring-[#0062ff]/10"
                />
              </div>

              {error ? (
                <Alert variant="destructive" className="rounded-xl border-red-200 bg-red-50 p-3 text-xs text-red-700">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              ) : null}

              <Button
                type="submit"
                disabled={loading}
                className="w-full rounded-full bg-[#091a36] py-3 text-xs font-bold uppercase tracking-wider text-white shadow-sm transition hover:bg-[#0062ff]"
              >
                {loading ? "Enviando código..." : "Solicitar Código OTP"}
              </Button>
            </form>

            <div className="mt-6 rounded-xl border border-[#d8e5f8] bg-[#f0f6ff] p-3.5 text-xs text-[#475569]">
              <p className="font-bold text-[#091a36]">Información de acceso</p>
              <ul className="mt-1.5 list-disc space-y-1 pl-4 text-[11px] text-[#64748b]">
                <li>Solo pueden ingresar miembros activos registrados por el administrador.</li>
                <li>El código expira en 15 minutos. Si no lo ves, revisá tu casilla de Spam.</li>
              </ul>
            </div>
          </CardContent>
        </Card>

        <p className="text-center text-xs text-[#64748b]">
          <Link href="/" className="font-semibold text-[#091a36] hover:text-[#0062ff]">
            ← Volver al sitio público
          </Link>
        </p>
      </div>
    </main>
  );
}
