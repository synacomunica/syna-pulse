import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../integrations/supabase/types";

export async function provisionTeamMember(
  db: SupabaseClient<Database>,
  member: { email: string; fullName: string; role: "admin" | "equipe" },
  password: string,
) {
  const { data, error } = await db.auth.admin.createUser({
    email: member.email,
    password,
    email_confirm: true,
    user_metadata: { full_name: member.fullName },
  });
  if (error || !data.user) throw new Error(error?.message ?? "Não foi possível criar o acesso.");
  const id = data.user.id;
  try {
    const profile = await db
      .from("profiles")
      .upsert({ id, full_name: member.fullName, email: member.email });
    if (profile.error) throw profile.error;
    const role = await db
      .from("user_roles")
      .upsert({ user_id: id, role: member.role }, { onConflict: "user_id,role" });
    if (role.error) throw role.error;
    const previousRoles = await db
      .from("user_roles")
      .delete()
      .eq("user_id", id)
      .neq("role", member.role);
    if (previousRoles.error) throw previousRoles.error;
  } catch {
    // Only roll back the new user from this request; never touch an existing account.
    const rollback = await db.auth.admin.deleteUser(id);
    if (rollback.error)
      throw new Error(
        "O acesso foi criado parcialmente. Revise a lista da equipe antes de tentar novamente.",
      );
    throw new Error(
      "Não foi possível atribuir o perfil solicitado. O cadastro foi desfeito; tente novamente.",
    );
  }
  return { email: member.email, password };
}
