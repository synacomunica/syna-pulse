import test from "node:test";
import assert from "node:assert/strict";
import { compile } from "./compile.mjs";
const { resolveAdminConfig } = await import(compile("supabase-config"));
const jwt = (role, ref) =>
  `header.${Buffer.from(JSON.stringify({ role, ref })).toString("base64url")}.signature`;
const url = "https://original.supabase.co";
test("uses the app database and its dedicated service key", () => {
  const key = jwt("service_role", "original");
  assert.deepEqual(
    resolveAdminConfig({
      VITE_SUPABASE_URL: url,
      SUPABASE_URL: "https://other.supabase.co",
      SYNA_SUPABASE_SERVICE_ROLE_KEY: key,
    }),
    { url, key },
  );
});
test("rejects mixed projects, anonymous keys and missing credentials", () => {
  for (const env of [
    {},
    {
      VITE_SUPABASE_URL: url,
      SUPABASE_URL: "https://other.supabase.co",
      SUPABASE_SERVICE_ROLE_KEY: "sb_secret_wrong",
    },
    { VITE_SUPABASE_URL: url, SYNA_SUPABASE_SERVICE_ROLE_KEY: jwt("service_role", "other") },
    { VITE_SUPABASE_URL: url, SYNA_SUPABASE_SERVICE_ROLE_KEY: jwt("anon", "original") },
    { VITE_SUPABASE_URL: url, SYNA_SUPABASE_SERVICE_ROLE_KEY: "sb_publishable_wrong" },
  ])
    assert.throws(() => resolveAdminConfig(env), /Conexão administrativa indisponível/);
});
test("supports legacy matching configuration and opaque dedicated keys", () => {
  const key = jwt("service_role", "original");
  assert.deepEqual(resolveAdminConfig({ SUPABASE_URL: url, SUPABASE_SERVICE_ROLE_KEY: key }), {
    url,
    key,
  });
  assert.deepEqual(
    resolveAdminConfig({
      VITE_SUPABASE_URL: url,
      SYNA_SUPABASE_SERVICE_ROLE_KEY: "sb_secret_valid",
    }),
    { url, key: "sb_secret_valid" },
  );
});
