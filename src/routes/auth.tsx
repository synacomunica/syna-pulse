import { useEffect, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { SynaLogo } from "@/components/syna-logo";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Entrar — Syna Marketing Diagnostic" },
      {
        name: "description",
        content:
          "Acesso restrito à equipe Syna para gerenciar diagnósticos estratégicos de clientes.",
      },
      { property: "og:title", content: "Entrar — Syna Marketing Diagnostic" },
      {
        property: "og:description",
        content: "Acesso restrito à equipe Syna para gerenciar diagnósticos estratégicos.",
      },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/dashboard" });
    });
  }, [navigate]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      navigate({ to: "/dashboard" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Não foi possível entrar.");
    } finally {
      setLoading(false);
    }
  };

  const forgot = async () => {
    if (!email.trim()) {
      toast.error("Informe seu e-mail acima para receber o link.");
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${window.location.origin}/redefinir-senha`,
      });
      if (error) throw error;
      toast.success("Enviamos um link de redefinição para o seu e-mail.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Não foi possível enviar o link.");
    } finally {
      setLoading(false);
    }
  };

  const google = async () => {
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin,
    });
    if (result.error) {
      toast.error("Não foi possível entrar com o Google.");
      return;
    }
    if (result.redirected) return;
    navigate({ to: "/dashboard" });
  };

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="hidden flex-col justify-between bg-sidebar p-12 lg:flex">
        <SynaLogo variant="dark" />
        <div>
          <h2 className="max-w-sm text-4xl leading-tight text-sidebar-foreground">
            Não começar pelo canal.
            <br />
            <span className="text-primary">Começar pelo negócio.</span>
          </h2>
          <p className="mt-5 max-w-sm text-sm text-sidebar-foreground/60">
            Diagnóstico estratégico em 4P + Performance para transformar informação em decisão.
          </p>
        </div>
        <p className="text-xs uppercase tracking-[0.2em] text-sidebar-foreground/40">
          Syna · Uso interno
        </p>
      </div>

      <div className="flex items-center justify-center px-6 py-16">
        <div className="w-full max-w-sm">
          <div className="lg:hidden">
            <SynaLogo />
          </div>
          <h1 className="mt-8 text-2xl font-bold lg:mt-0">Entrar na plataforma</h1>
          <p className="mt-1.5 text-sm text-muted-foreground">
            Acesso restrito à equipe Syna. Os acessos são criados por um administrador.
          </p>

          <form onSubmit={submit} className="mt-8 space-y-4">
            <Field label="E-mail">
              <input
                type="email"
                className="input-base"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </Field>
            <Field label="Senha">
              <input
                type="password"
                className="input-base"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                minLength={6}
                required
              />
            </Field>
            <div className="flex justify-end">
              <button
                type="button"
                onClick={forgot}
                disabled={loading}
                className="text-xs font-medium text-muted-foreground underline-offset-4 transition-colors hover:text-primary hover:underline disabled:opacity-60"
              >
                Esqueci minha senha
              </button>
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-60"
            >
              {loading ? "Aguarde..." : "Entrar"}
            </button>
          </form>

          <div className="my-5 flex items-center gap-3 text-xs uppercase tracking-wider text-muted-foreground">
            <span className="h-px flex-1 bg-border" /> ou <span className="h-px flex-1 bg-border" />
          </div>

          <button
            onClick={google}
            className="w-full rounded-lg border border-border bg-card px-4 py-2.5 text-sm font-semibold transition-colors hover:bg-accent"
          >
            Continuar com Google
          </button>

          <p className="mt-6 text-center text-xs text-muted-foreground">
            Precisa de acesso? Fale com um administrador da Syna.
          </p>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium">{label}</span>
      {children}
    </label>
  );
}
