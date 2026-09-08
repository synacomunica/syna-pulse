import { useEffect, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { SynaLogo } from "@/components/syna-logo";

export const Route = createFileRoute("/redefinir-senha")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Redefinir senha — Syna Marketing Diagnostic" },
      {
        name: "description",
        content: "Defina uma nova senha de acesso à plataforma interna da Syna.",
      },
      { property: "og:title", content: "Redefinir senha — Syna Marketing Diagnostic" },
      { property: "og:description", content: "Defina uma nova senha de acesso à plataforma Syna." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  const [valid, setValid] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let active = true;
    const check = async () => {
      const { data } = await supabase.auth.getSession();
      if (!active) return;
      setValid(Boolean(data.session));
      setReady(true);
    };
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      if (!active) return;
      if (session) setValid(true);
      setReady(true);
    });
    void check();
    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirm) {
      toast.error("As senhas não conferem.");
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      toast.success("Senha redefinida. Entre com a nova senha.");
      await supabase.auth.signOut();
      navigate({ to: "/auth" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Não foi possível redefinir a senha.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center px-6 py-16">
      <div className="w-full max-w-sm">
        <SynaLogo />
        <h1 className="mt-8 text-2xl font-bold">Redefinir senha</h1>

        {!ready ? (
          <p className="mt-3 text-sm text-muted-foreground">Validando o link...</p>
        ) : !valid ? (
          <>
            <p className="mt-1.5 text-sm text-muted-foreground">
              Este link de redefinição é inválido ou já expirou. Peça um novo na tela de entrada.
            </p>
            <button className="btn-primary mt-5" onClick={() => navigate({ to: "/auth" })}>
              Voltar para o login
            </button>
          </>
        ) : (
          <>
            <p className="mt-1.5 text-sm text-muted-foreground">
              Escolha uma nova senha com pelo menos 6 caracteres.
            </p>
            <form onSubmit={submit} className="mt-8 space-y-4">
              <label className="block">
                <span className="mb-1.5 block text-sm font-medium">Nova senha</span>
                <input
                  type="password"
                  className="input-base"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  minLength={6}
                  required
                />
              </label>
              <label className="block">
                <span className="mb-1.5 block text-sm font-medium">Confirmar nova senha</span>
                <input
                  type="password"
                  className="input-base"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  minLength={6}
                  required
                />
              </label>
              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-60"
              >
                {loading ? "Salvando..." : "Salvar nova senha"}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
