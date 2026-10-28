"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { BackofficeShell } from "../../components/backoffice-shell";
import { API_BASE_URL } from "../../lib/config";
import type { Role } from "../../lib/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";

type AdminUser = {
  id: string;
  email: string;
  fullName: string;
  role: Role;
  isActive: boolean;
  createdAt: string;
};

type UsersResponse = { items: AdminUser[] };

export default function AdminUsersPage() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [role, setRole] = useState<Role>("EDITOR");
  const [search, setSearch] = useState("");

  const loadUsers = async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch(`${API_BASE_URL}/admin/users`, { credentials: "include" });
      if (!response.ok) throw new Error("No se pudieron cargar usuarios");
      const data = (await response.json()) as UsersResponse;
      setUsers(data.items);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al cargar usuarios");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadUsers();
  }, []);

  const filteredUsers = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return users;
    return users.filter((user) =>
      [user.email, user.fullName, user.role].join(" ").toLowerCase().includes(q),
    );
  }, [users, search]);

  const createUser = async (event: FormEvent) => {
    event.preventDefault();
    setError("");

    try {
      const response = await fetch(`${API_BASE_URL}/admin/users`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, fullName, role }),
      });
      if (!response.ok) throw new Error("No se pudo crear usuario");

      setEmail("");
      setFullName("");
      setRole("EDITOR");
      await loadUsers();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error");
    }
  };

  const patchUser = async (userId: string, payload: Partial<Pick<AdminUser, "isActive" | "role">>) => {
    setError("");
    try {
      const response = await fetch(`${API_BASE_URL}/admin/users/${userId}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!response.ok) throw new Error("No se pudo actualizar usuario");
      await loadUsers();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error");
    }
  };

  return (
    <BackofficeShell
      title="Usuarios y Permisos"
      subtitle="Alta de usuarios preaprobados, asignación de roles (ADMIN / EDITOR) y control de acceso."
    >
      <div className="grid gap-6 lg:grid-cols-[1fr_1.3fr]">
        {/* Formulario de Alta */}
        <Card className="rounded-2xl border border-[#e2e8f0] bg-[#ffffff] p-6 shadow-sm">
          <CardHeader className="p-0 pb-4">
            <CardTitle className="font-serif text-2xl font-bold text-[#0e2246]">Nuevo Usuario</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <form onSubmit={createUser} className="space-y-3.5">
              <div className="space-y-1">
                <label className="text-xs font-bold uppercase tracking-wider text-[#0e2246]">Email de Acceso</label>
                <Input
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  type="email"
                  required
                  placeholder="usuario@clubdefinanzasuba.com"
                  className="rounded-xl border-[#e2e8f0] text-sm text-[#0e2246]"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold uppercase tracking-wider text-[#0e2246]">Nombre Completo</label>
                <Input
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Nombre y Apellido"
                  className="rounded-xl border-[#e2e8f0] text-sm text-[#0e2246]"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold uppercase tracking-wider text-[#0e2246]">Rol Asignado</label>
                <Select value={role} onValueChange={(v) => setRole(v as Role)}>
                  <SelectTrigger className="rounded-xl border-[#e2e8f0] text-sm text-[#0e2246]">
                    <SelectValue placeholder="Rol" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="EDITOR">EDITOR (Publicar y editar)</SelectItem>
                    <SelectItem value="ADMIN">ADMIN (Control total)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Button type="submit" className="w-full rounded-full bg-[#0062ff] py-2.5 text-xs font-bold uppercase tracking-wider text-white shadow-sm hover:bg-[#091a36]">
                Crear Usuario Preaprobado
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Listado de Usuarios */}
        <Card className="rounded-2xl border border-[#e2e8f0] bg-[#ffffff] p-6 shadow-sm">
          <CardHeader className="p-0 pb-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <CardTitle className="font-serif text-2xl font-bold text-[#0e2246]">Usuarios ({users.length})</CardTitle>
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar usuario..."
                className="h-9 w-48 rounded-xl border-[#e2e8f0] text-xs"
              />
            </div>
          </CardHeader>
          <CardContent className="p-0 pt-2">
            {error ? (
              <Alert variant="destructive" className="mb-4 rounded-xl border-red-200 bg-red-50 p-3 text-xs text-red-700">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            ) : null}

            {loading ? (
              <p className="text-xs text-[#64748b]">Cargando usuarios...</p>
            ) : filteredUsers.length === 0 ? (
              <p className="text-xs text-[#64748b]">No se encontraron usuarios.</p>
            ) : (
              <div className="space-y-3">
                {filteredUsers.map((user) => (
                  <article key={user.id} className="rounded-xl border border-[#e2e8f0] bg-[#ffffff] p-4 transition hover:border-[#0062ff]">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="font-serif font-bold text-[#0e2246]">{user.fullName || "Sin nombre"}</p>
                        <p className="text-xs text-[#64748b]">{user.email}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="rounded-full border border-[#d8e5f8] bg-[#f0f6ff] px-2.5 py-0.5 text-[10px] font-extrabold uppercase text-[#0062ff]">
                          {user.role}
                        </span>
                        <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-extrabold uppercase ${user.isActive ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-red-50 text-red-600 border border-red-200"}`}>
                          {user.isActive ? "ACTIVO" : "INACTIVO"}
                        </span>
                      </div>
                    </div>

                    <div className="mt-3 flex flex-wrap gap-2 border-t border-[#f1f5f9] pt-3">
                      <button
                        className="rounded-full border border-[#e2e8f0] bg-white px-3 py-1 text-xs font-semibold text-[#0e2246] transition hover:bg-[#f8fafc]"
                        onClick={() => void patchUser(user.id, { isActive: !user.isActive })}
                      >
                        {user.isActive ? "Desactivar" : "Activar"}
                      </button>
                      <button
                        className="rounded-full border border-[#e2e8f0] bg-white px-3 py-1 text-xs font-semibold text-[#0e2246] transition hover:bg-[#f8fafc]"
                        onClick={() => void patchUser(user.id, { role: user.role === "ADMIN" ? "EDITOR" : "ADMIN" })}
                      >
                        Pasar a {user.role === "ADMIN" ? "EDITOR" : "ADMIN"}
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </BackofficeShell>
  );
}
