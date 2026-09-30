import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";
const admin = "11111111-1111-4111-8111-111111111111",
  owner = "22222222-2222-4222-8222-222222222222",
  other = "33333333-3333-4333-8333-333333333333",
  client = "44444444-4444-4444-8444-444444444444",
  plan = "55555555-5555-4555-8555-555555555555";
test("editorial migration enforces tenant read access, admin write, unique month and immutable origin", async () => {
  const db = new PGlite();
  try {
    await db.exec(`CREATE ROLE authenticated;CREATE ROLE service_role;CREATE SCHEMA auth;
 CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
 GRANT USAGE ON SCHEMA auth TO authenticated;
 CREATE FUNCTION public.has_role(uid uuid,role text) RETURNS boolean LANGUAGE sql STABLE AS $$ SELECT uid='${admin}'::uuid $$;
 CREATE TABLE clients(id uuid PRIMARY KEY,owner_id uuid,created_by uuid);
 CREATE TABLE marketing_plans(id uuid PRIMARY KEY,client_id uuid);
 GRANT SELECT ON clients,marketing_plans TO authenticated;
 INSERT INTO clients VALUES('${client}','${owner}','${admin}');INSERT INTO marketing_plans VALUES('${plan}','${client}');`);
    await db.exec(
      readFileSync(
        new URL("../supabase/migrations/20260930120000_editorial_cycles.sql", import.meta.url),
        "utf8",
      ),
    );
    const login = (id) =>
      db.exec(`RESET ROLE;SET request.jwt.claim.sub='${id}';SET ROLE authenticated;`);
    await login(admin);
    const inserted = await db.query(
      `INSERT INTO editorial_cycles(client_id,plan_id,source_updated_at,month,content) VALUES($1,$2,now(),'2026-10','{"month":"2026-10"}') RETURNING *`,
      [client, plan],
    );
    const row = inserted.rows[0];
    await assert.rejects(
      db.query(
        `UPDATE editorial_cycles SET month='2026-11',content='{"month":"2026-11"}' WHERE id=$1`,
        [row.id],
      ),
      /imutável/,
    );
    await assert.rejects(
      db.query(
        `INSERT INTO editorial_cycles(client_id,plan_id,source_updated_at,month,content) VALUES($1,$2,now(),'2026-10','{"month":"2026-10"}')`,
        [client, plan],
      ),
      /unique/,
    );
    await login(owner);
    assert.equal((await db.query("SELECT * FROM editorial_cycles")).rows.length, 1);
    assert.equal(
      (await db.query(`UPDATE editorial_cycles SET content='{}' RETURNING id`)).rows.length,
      0,
    );
    await login(other);
    assert.equal((await db.query("SELECT * FROM editorial_cycles")).rows.length, 0);
    await login(admin);
    assert.equal(
      (
        await db.query(
          `UPDATE editorial_cycles SET content=content WHERE id=$1 AND updated_at=$2 RETURNING id`,
          [row.id, row.updated_at],
        )
      ).rows.length,
      1,
    );
    assert.equal(
      (
        await db.query(
          `UPDATE editorial_cycles SET content=content WHERE id=$1 AND updated_at=$2 RETURNING id`,
          [row.id, row.updated_at],
        )
      ).rows.length,
      0,
    );
  } finally {
    await db.close();
  }
});
