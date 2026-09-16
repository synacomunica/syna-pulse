import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";
const admin = "11111111-1111-4111-8111-111111111111",
  owner = "22222222-2222-4222-8222-222222222222",
  other = "33333333-3333-4333-8333-333333333333",
  client = "44444444-4444-4444-8444-444444444444",
  doc = "55555555-5555-4555-8555-555555555555";
test("migration, RLS, private storage, immutable scopes and approved-plan guard execute in PostgreSQL", async () => {
  const db = new PGlite();
  try {
    await db.exec(`CREATE ROLE anon;CREATE ROLE authenticated;CREATE ROLE service_role;CREATE SCHEMA auth;CREATE SCHEMA storage;
 CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
 GRANT USAGE ON SCHEMA auth TO authenticated;GRANT EXECUTE ON FUNCTION auth.uid() TO authenticated;
 CREATE TYPE public.app_role AS ENUM('admin','equipe');
 CREATE TABLE public.clients(id uuid PRIMARY KEY,owner_id uuid,created_by uuid);
 CREATE FUNCTION public.has_role(uid uuid,role public.app_role) RETURNS boolean LANGUAGE sql STABLE AS $$ SELECT uid='${admin}'::uuid $$;
 GRANT SELECT,UPDATE ON public.clients TO authenticated;
 CREATE TABLE public.marketing_plans(id uuid PRIMARY KEY,client_id uuid,status text,content jsonb);
 GRANT SELECT,INSERT,UPDATE ON public.marketing_plans TO authenticated;
 CREATE TABLE storage.buckets(id text PRIMARY KEY,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
 CREATE TABLE storage.objects(id uuid DEFAULT gen_random_uuid(),bucket_id text,name text);
 ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;GRANT USAGE ON SCHEMA storage TO authenticated;GRANT SELECT,INSERT,UPDATE,DELETE ON storage.objects TO authenticated;
 INSERT INTO public.clients VALUES('${client}','${owner}','${admin}');`);
    await db.exec(
      readFileSync(
        new URL("../supabase/migrations/20260916100000_contract_scope.sql", import.meta.url),
        "utf8",
      ),
    );
    const login = async (id) =>
      db.exec(`RESET ROLE;SET request.jwt.claim.sub='${id}';SET ROLE authenticated;`);
    await login(owner);
    await db.query(
      `INSERT INTO client_documents(id,client_id,title,kind,storage_path) VALUES($1,$2,'Contrato','contrato',$3)`,
      [doc, client, `${client}/${doc}/document.pdf`],
    );
    await db.query(`INSERT INTO storage.objects(bucket_id,name) VALUES('client-contracts',$1)`, [
      `${client}/${doc}/document.pdf`,
    ]);
    assert.equal((await db.query("SELECT * FROM client_documents")).rows.length, 1);
    await login(other);
    assert.equal((await db.query("SELECT * FROM client_documents")).rows.length, 0);
    assert.equal((await db.query("SELECT * FROM storage.objects")).rows.length, 0);
    await assert.rejects(
      db.query(
        `INSERT INTO client_documents(client_id,title,kind,storage_path) VALUES($1,'foreign','contrato','x')`,
        [client],
      ),
    );
    await login(owner);
    const c = { items: [{ id: "posts", quantity: 8 }] };
    await db.query(
      `INSERT INTO client_scopes(client_id,status,origin,document_ids,content) VALUES($1,'confirmado','contrato_conferido',ARRAY[$2::uuid],$3::jsonb)`,
      [client, doc, JSON.stringify(c)],
    );
    await db.query(
      `INSERT INTO client_scopes(client_id,status,origin,content) VALUES($1,'provisorio','manual','{"items":[]}'::jsonb)`,
      [client],
    );
    const versions = (await db.query("SELECT version,content FROM client_scopes ORDER BY version"))
      .rows;
    assert.deepEqual(
      versions.map((v) => v.version),
      [1, 2],
    );
    assert.equal(versions[0].content.items[0].quantity, 8);
    await assert.rejects(db.query(`UPDATE client_scopes SET content='{}'`));
    await assert.rejects(db.query(`UPDATE client_documents SET storage_path='changed'`));
    await login(other);
    assert.equal((await db.query("SELECT * FROM client_scopes")).rows.length, 0);
    await login(admin);
    assert.equal((await db.query("SELECT * FROM client_documents")).rows.length, 1);
    await db.exec(
      `INSERT INTO marketing_plans VALUES('66666666-6666-4666-8666-666666666666','${client}','rascunho_ia','{}');`,
    );
    await assert.rejects(db.exec(`UPDATE marketing_plans SET status='aprovado'`), /Revalide/);
    await db.exec("RESET ROLE");
    assert.equal((await db.query("SELECT public FROM storage.buckets")).rows[0].public, false);
  } finally {
    await db.close();
  }
});
