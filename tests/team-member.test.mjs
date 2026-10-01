import test from "node:test";
import assert from "node:assert/strict";
import { compile } from "./compile.mjs";
const { provisionTeamMember } = await import(compile("team-member.server"));
const member = { email: "admin@example.test", fullName: "Test Admin", role: "admin" };
function mock(failure) {
  const calls = [];
  const result = (stage) => ({ error: failure === stage ? new Error(stage) : null });
  const db = {
    auth: {
      admin: {
        createUser: async () => ({
          data: { user: failure === "create" ? null : { id: "new-id" } },
          ...result("create"),
        }),
        deleteUser: async (id) => {
          calls.push(["rollback", id]);
          return result("rollback");
        },
      },
    },
    from: (table) => ({
      upsert: async (row) => {
        calls.push([table, row]);
        return result(table);
      },
      delete: () => ({
        eq: (_key, id) => ({
          neq: async (_role, role) => {
            calls.push(["cleanup", id, role]);
            return result("cleanup");
          },
        }),
      }),
    }),
  };
  return { db, calls };
}
test("only returns credentials after assigning the requested role", async () => {
  const { db, calls } = mock();
  assert.deepEqual(await provisionTeamMember(db, member, "test-password"), {
    email: member.email,
    password: "test-password",
  });
  assert.deepEqual(calls[1], ["user_roles", { user_id: "new-id", role: "admin" }]);
  assert.deepEqual(calls[2], ["cleanup", "new-id", "admin"]);
});
test("rolls back newly created users if profile or role configuration fails", async () => {
  for (const stage of ["profiles", "user_roles", "cleanup"]) {
    const { db, calls } = mock(stage);
    await assert.rejects(provisionTeamMember(db, member, "test-password"), /cadastro foi desfeito/);
    assert.deepEqual(calls.at(-1), ["rollback", "new-id"]);
  }
});
test("does not delete existing users when creation fails", async () => {
  const { db, calls } = mock("create");
  await assert.rejects(provisionTeamMember(db, member, "test-password"));
  assert.deepEqual(calls, []);
});
