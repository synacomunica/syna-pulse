import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";
const admin = "11111111-1111-4111-8111-111111111111",
  owner = "22222222-2222-4222-8222-222222222222",
  other = "33333333-3333-4333-8333-333333333333",
  client = "44444444-4444-4444-8444-444444444444";
test("scenarios isolate clients, restrict writing to admins and prevent stale overwrites", async () => {
  const db = new PGlite();
  try {
    await db.exec(`CREATE ROLE authenticated; CREATE ROLE service_role; CREATE SCHEMA auth;
 CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
 GRANT USAGE ON SCHEMA auth TO authenticated;
 CREATE FUNCTION public.has_role(uid uuid,role text) RETURNS boolean LANGUAGE sql STABLE AS $$ SELECT uid='${admin}'::uuid $$;
 CREATE TABLE clients(id uuid PRIMARY KEY,owner_id uuid,created_by uuid);
 GRANT SELECT ON clients TO authenticated;
 INSERT INTO clients VALUES('${client}','${owner}','${admin}');`);
    await db.exec(
      readFileSync(
        new URL("../supabase/migrations/20261009180000_marketing_scenarios.sql", import.meta.url),
        "utf8",
      ),
    );
    const login = (id) =>
      db.exec(`RESET ROLE; SET request.jwt.claim.sub='${id}'; SET ROLE authenticated;`);
    await login(admin);
    const row = (
      await db.query(
        `INSERT INTO marketing_scenarios(client_id,content) VALUES($1,'{"month":"2026-10"}') RETURNING *`,
        [client],
      )
    ).rows[0];
    await login(owner);
    assert.equal((await db.query("SELECT * FROM marketing_scenarios")).rows.length, 1);
    assert.equal(
      (await db.query(`UPDATE marketing_scenarios SET content='{}' RETURNING id`)).rows.length,
      0,
    );
    await assert.rejects(
      db.query(`INSERT INTO marketing_scenarios(client_id,content) VALUES($1,'{}')`, [client]),
      /row-level security/,
    );
    await login(other);
    assert.equal((await db.query("SELECT * FROM marketing_scenarios")).rows.length, 0);
    await login(admin);
    assert.equal(
      (
        await db.query(
          `UPDATE marketing_scenarios SET content=content WHERE id=$1 AND updated_at=$2 RETURNING id`,
          [row.id, row.updated_at],
        )
      ).rows.length,
      1,
    );
    assert.equal(
      (
        await db.query(
          `UPDATE marketing_scenarios SET content=content WHERE id=$1 AND updated_at=$2 RETURNING id`,
          [row.id, row.updated_at],
        )
      ).rows.length,
      0,
    );
    await assert.rejects(
      db.query(`UPDATE marketing_scenarios SET client_id=$1 WHERE id=$2`, [other, row.id]),
      /imutável/,
    );
  } finally {
    await db.close();
  }
});
