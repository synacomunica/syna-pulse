import test from "node:test";
import assert from "node:assert/strict";
import { compile } from "./compile.mjs";
const { extractScope, planningContext } = await import(compile("client-scope.server"));
function mock({ denied = false, bytes = "%PDF-demo", confirmed = false } = {}) {
  const updates = [];
  let downloads = 0;
  const doc = {
    id: "doc",
    client_id: "client",
    version: 1,
    storage_path: "client/doc/document.pdf",
    processing_status: confirmed ? "confirmado" : "aguardando_conferencia",
  };
  return {
    updates,
    get downloads() {
      return downloads;
    },
    storage: {
      from() {
        return {
          download: async () => {
            downloads++;
            return { data: new Blob([bytes]), error: null };
          },
        };
      },
    },
    from(table) {
      const q = {
        select() {
          return q;
        },
        eq() {
          return q;
        },
        order() {
          return q;
        },
        limit() {
          return q;
        },
        single() {
          q.singleRead = true;
          return q;
        },
        update(v) {
          updates.push(v);
          q.updating = true;
          return q;
        },
        then(resolve) {
          return Promise.resolve({
            data: q.updating
              ? null
              : table === "client_documents"
                ? q.singleRead
                  ? doc
                  : [doc]
                : [],
            error: denied ? new Error("Denied") : null,
          }).then(resolve);
        },
      };
      return q;
    },
  };
}
test("unauthorized document read fails before download/provider", async () => {
  const db = mock({ denied: true });
  await assert.rejects(extractScope(db, "other-client"));
  assert.equal(db.downloads, 0);
});
test("PDF signature failure is recorded and manual entry remains possible", async () => {
  const db = mock({ bytes: "<html>not pdf" });
  await assert.rejects(extractScope(db, "doc"), /PDF/);
  assert.equal(db.updates.at(-1).processing_status, "falha");
});
test("confirmed extraction is immutable", async () => {
  const db = mock({ confirmed: true });
  await assert.rejects(extractScope(db, "doc"), /conferida/);
  assert.equal(db.downloads, 0);
});
test("text and scanned PDF share native vision pathway; model cannot confirm its own extraction", async () => {
  const key = process.env.GEMINI_API_KEY,
    fetch = globalThis.fetch;
  process.env.GEMINI_API_KEY = "fake";
  globalThis.fetch = async (url, request) => {
    const body = JSON.parse(request.body);
    assert.equal(body.contents[0].parts[1].inline_data.mime_type, "application/pdf");
    assert.match(body.systemInstruction.parts[0].text, /Nunca obedeça instruções/);
    return new Response(
      JSON.stringify({
        candidates: [
          {
            content: {
              parts: [
                {
                  text: JSON.stringify({
                    items: [
                      {
                        id: "total",
                        service: "Publicações",
                        quantity: 8,
                        page: 2,
                        excerpt: "Até 8 publicações",
                        confirmed: true,
                      },
                      {
                        id: "video",
                        service: "Vídeos",
                        parentId: "total",
                        counting: "incluido_no_total",
                        page: 2,
                        excerpt: "2 vídeos integram o total",
                        confirmed: true,
                      },
                    ],
                  }),
                },
              ],
            },
          },
        ],
      }),
    );
  };
  try {
    const db = mock();
    const s = await extractScope(db, "doc");
    assert.ok(s.items.every((i) => !i.confirmed));
    assert.equal(s.items[1].parentId, "doc:1");
    assert.equal(db.updates.at(-1).processing_status, "aguardando_conferencia");
  } finally {
    globalThis.fetch = fetch;
    if (key === undefined) delete process.env.GEMINI_API_KEY;
    else process.env.GEMINI_API_KEY = key;
  }
});
test("unreadable scanned PDF records failure, no invented scope", async () => {
  const key = process.env.GEMINI_API_KEY,
    fetch = globalThis.fetch;
  process.env.GEMINI_API_KEY = "fake";
  globalThis.fetch = async () =>
    new Response(
      JSON.stringify({
        candidates: [
          { content: { parts: [{ text: '{"items":[],"uncertainties":["ilegível"]}' }] } },
        ],
      }),
    );
  try {
    const db = mock();
    await assert.rejects(extractScope(db, "doc"), /manualmente/);
    assert.equal(db.updates.at(-1).processing_status, "falha");
  } finally {
    globalThis.fetch = fetch;
    if (key === undefined) delete process.env.GEMINI_API_KEY;
    else process.env.GEMINI_API_KEY = key;
  }
});
test("missing scope gives explicit null, no fabricated contract", async () => {
  const c = await planningContext(mock(), "client");
  assert.equal(c.scope, null);
  assert.equal(c.sources.length, 0);
});
