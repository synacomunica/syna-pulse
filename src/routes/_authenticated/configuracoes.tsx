import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import { createTeamMember, deleteTeamMember } from "@/lib/admin.functions";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/app-shell";
import { useAuth } from "@/hooks/useAuth";
import { STEPS } from "@/lib/questions";
import { METRICS, PILLARS, PILLAR_LABEL } from "@/lib/pillars";
import { formatDate } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/configuracoes")({
  head: () => ({
    meta: [
      { title: "Configurações — Syna Marketing Diagnostic" },
      {
        name: "description",
        content: "Equipe, papéis de acesso e estrutura do questionário de diagnóstico.",
      },
      { property: "og:title", content: "Configurações — Syna Marketing Diagnostic" },
      { property: "og:description", content: "Equipe, papéis de acesso e questionário." },
    ],
  }),
  component: Settings,
});

function Settings() {
  const { fullName, isAdmin, user } = useAuth();
  const qc = useQueryClient();
  const [name, setName] = useState(fullName);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  useEffect(() => setName(fullName), [fullName]);

  const changePassword = useMutation({
    mutationFn: async () => {
      if (newPassword !== confirmPassword) throw new Error("As senhas não conferem.");
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
    },
    onSuccess: () => {
      setNewPassword("");
      setConfirmPassword("");
      toast.success("Senha alterada.");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const saveProfile = useMutation({
    mutationFn: async () => {
      if (!user) return;
      const { error } = await supabase
        .from("profiles")
        .update({ full_name: name.trim() })
        .eq("id", user.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Perfil atualizado.");
      void qc.invalidateQueries({ queryKey: ["team"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const invite = useServerFn(createTeamMember);
  const removeMember = useServerFn(deleteTeamMember);
  const [newMember, setNewMember] = useState({
    fullName: "",
    email: "",
    role: "equipe" as "admin" | "equipe",
  });
  const [tempPassword, setTempPassword] = useState<{ email: string; password: string } | null>(
    null,
  );

  const createMember = useMutation({
    mutationFn: () => invite({ data: newMember }),
    onSuccess: (res) => {
      setTempPassword(res);
      setNewMember({ fullName: "", email: "", role: "equipe" });
      toast.success("Acesso criado.");
      void qc.invalidateQueries({ queryKey: ["team"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const dropMember = useMutation({
    mutationFn: (userId: string) => removeMember({ data: { userId } }),
    onSuccess: () => {
      toast.success("Acesso removido.");
      void qc.invalidateQueries({ queryKey: ["team"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const changeRole = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: "admin" | "equipe" }) => {
      await supabase.from("user_roles").delete().eq("user_id", userId);
      const { error } = await supabase.from("user_roles").insert({ user_id: userId, role });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Papel atualizado.");
      void qc.invalidateQueries({ queryKey: ["team"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const { data: team = [] } = useQuery({
    queryKey: ["team"],
    queryFn: async () => {
      const [profiles, roles] = await Promise.all([
        supabase.from("profiles").select("id, full_name, email, created_at"),
        supabase.from("user_roles").select("user_id, role"),
      ]);
      return (profiles.data ?? []).map((p) => ({
        ...p,
        role: roles.data?.find((r) => r.user_id === p.id)?.role ?? "equipe",
      }));
    },
  });

  return (
    <AppShell title="Configurações" subtitle="Equipe, acessos e estrutura do diagnóstico">
      <div className="grid gap-6 lg:grid-cols-2">
        <section className="surface-card p-6">
          <h2 className="text-lg font-bold">Seu acesso</h2>
          <label className="mt-4 block">
            <span className="mb-1.5 block text-sm font-medium">Nome</span>
            <input className="input-base" value={name} onChange={(e) => setName(e.target.value)} />
          </label>
          <button
            className="btn-primary mt-3"
            disabled={saveProfile.isPending || !name.trim()}
            onClick={() => saveProfile.mutate()}
          >
            {saveProfile.isPending ? "Salvando..." : "Salvar perfil"}
          </button>
          <dl className="mt-4 space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-muted-foreground">E-mail</dt>
              <dd className="font-medium">{user?.email}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Papel</dt>
              <dd className="font-medium">{isAdmin ? "Administrador" : "Equipe Syna"}</dd>
            </div>
          </dl>

          <form
            className="mt-6 space-y-3 rounded-xl border border-border bg-muted/40 p-4"
            onSubmit={(e) => {
              e.preventDefault();
              changePassword.mutate();
            }}
          >
            <p className="text-sm font-semibold">Alterar senha</p>
            <p className="text-xs text-muted-foreground">
              Se você entrou com uma senha provisória, defina uma senha própria aqui.
            </p>
            <input
              className="input-base"
              type="password"
              placeholder="Nova senha"
              minLength={6}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
            />
            <input
              className="input-base"
              type="password"
              placeholder="Confirmar nova senha"
              minLength={6}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
            />
            <button className="btn-primary" type="submit" disabled={changePassword.isPending}>
              {changePassword.isPending ? "Salvando..." : "Salvar nova senha"}
            </button>
          </form>
        </section>

        <section className="surface-card p-6">
          <h2 className="text-lg font-bold">Equipe</h2>
          {isAdmin ? (
            <form
              className="mt-4 space-y-3 rounded-xl border border-border bg-muted/40 p-4"
              onSubmit={(e) => {
                e.preventDefault();
                createMember.mutate();
              }}
            >
              <p className="text-sm font-semibold">Criar novo acesso</p>
              <input
                className="input-base"
                placeholder="Nome completo"
                value={newMember.fullName}
                onChange={(e) => setNewMember({ ...newMember, fullName: e.target.value })}
                required
              />
              <input
                className="input-base"
                type="email"
                placeholder="E-mail"
                value={newMember.email}
                onChange={(e) => setNewMember({ ...newMember, email: e.target.value })}
                required
              />
              <select
                className="input-base"
                value={newMember.role}
                onChange={(e) =>
                  setNewMember({ ...newMember, role: e.target.value as "admin" | "equipe" })
                }
              >
                <option value="equipe">Equipe Syna</option>
                <option value="admin">Administrador</option>
              </select>
              <button className="btn-primary" type="submit" disabled={createMember.isPending}>
                {createMember.isPending ? "Criando..." : "Criar acesso"}
              </button>
              {tempPassword ? (
                <div className="rounded-lg border border-primary/40 bg-primary/5 p-3 text-xs">
                  <p className="font-semibold">Senha provisória de {tempPassword.email}</p>
                  <div className="mt-1 flex items-center gap-2">
                    <p className="select-all font-mono text-sm">{tempPassword.password}</p>
                    <button
                      type="button"
                      className="btn-ghost"
                      onClick={() => {
                        void navigator.clipboard
                          .writeText(tempPassword.password)
                          .then(() => toast.success("Senha copiada."))
                          .catch(() => toast.error("Não foi possível copiar."));
                      }}
                    >
                      Copiar
                    </button>
                  </div>
                  <p className="mt-1 text-muted-foreground">
                    Ela aparece uma única vez — copie e envie com segurança. O novo integrante pode
                    trocá-la em Configurações &gt; Seu acesso.
                  </p>
                </div>
              ) : null}
            </form>
          ) : null}
          <div className="mt-4 divide-y divide-border text-sm">
            {team.map((m) => (
              <div key={m.id} className="flex items-center justify-between gap-3 py-3">
                <div className="min-w-0">
                  <p className="truncate font-medium">{m.full_name || m.email}</p>
                  <p className="text-xs text-muted-foreground">Desde {formatDate(m.created_at)}</p>
                </div>
                {isAdmin ? (
                  <div className="flex items-center gap-2">
                    <select
                      className="input-base w-auto"
                      value={m.role}
                      disabled={changeRole.isPending}
                      onChange={(e) =>
                        changeRole.mutate({
                          userId: m.id,
                          role: e.target.value as "admin" | "equipe",
                        })
                      }
                    >
                      <option value="admin">Admin</option>
                      <option value="equipe">Equipe</option>
                    </select>
                    {m.id !== user?.id ? (
                      <button
                        className="btn-ghost"
                        disabled={dropMember.isPending}
                        onClick={() => {
                          if (confirm(`Remover o acesso de ${m.full_name || m.email}?`))
                            dropMember.mutate(m.id);
                        }}
                      >
                        Remover
                      </button>
                    ) : null}
                  </div>
                ) : (
                  <span className="rounded-full border border-border bg-muted px-2.5 py-0.5 text-xs">
                    {m.role === "admin" ? "Admin" : "Equipe"}
                  </span>
                )}
              </div>
            ))}
          </div>
        </section>

        <section className="surface-card p-6">
          <h2 className="text-lg font-bold">Estrutura do questionário</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {STEPS.length} etapas cobrindo os 5 pilares.
          </p>
          <ul className="mt-4 space-y-2 text-sm">
            {STEPS.map((s) => (
              <li key={s.id} className="flex justify-between gap-3">
                <span>{s.title}</span>
                <span className="text-muted-foreground">{s.questions.length} perguntas</span>
              </li>
            ))}
          </ul>
        </section>

        <section className="surface-card p-6">
          <h2 className="text-lg font-bold">Pilares e indicadores</h2>
          <div className="mt-4 flex flex-wrap gap-2">
            {PILLARS.map((p) => (
              <span
                key={p}
                className="rounded-full border border-border bg-muted px-3 py-1 text-xs font-medium"
              >
                {PILLAR_LABEL[p]}
              </span>
            ))}
          </div>
          <div className="mt-5 flex flex-wrap gap-2">
            {METRICS.map((m) => (
              <span
                key={m.key}
                className="rounded-full border border-border px-3 py-1 text-xs text-muted-foreground"
              >
                {m.label}
              </span>
            ))}
          </div>
        </section>
      </div>
    </AppShell>
  );
}
