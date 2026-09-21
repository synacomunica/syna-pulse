import test from "node:test";
import assert from "node:assert/strict";
import { compile } from "./compile.mjs";
const { aiRequest } = await import(compile("ai-request.server"));
test("transient provider failure retries once with same payload, without switching models", async () => {
  const original = globalThis.fetch;
  let calls = 0;
  const payload = { method: "POST", body: "test" };
  globalThis.fetch = async (url, init) => {
    assert.equal(init, payload);
    return new Response("response", { status: ++calls === 1 ? 503 : 200 });
  };
  try {
    assert.equal((await aiRequest("https://example.invalid", payload)).status, 200);
    assert.equal(calls, 2);
  } finally {
    globalThis.fetch = original;
  }
});
test("quota and authentication failures are not retried", async () => {
  const original = globalThis.fetch;
  try {
    for (const status of [401, 403, 429]) {
      let calls = 0;
      globalThis.fetch = async () => {
        calls++;
        return new Response("", { status });
      };
      assert.equal((await aiRequest("https://example.invalid", {})).status, status);
      assert.equal(calls, 1);
    }
  } finally {
    globalThis.fetch = original;
  }
});
test("Gemini schema complexity fallback retains schema and JSON validation contract", async () => {
  const original = globalThis.fetch;
  let calls = 0;
  globalThis.fetch = async (url, init) => {
    const body = JSON.parse(init.body);
    if (++calls === 1)
      return new Response('{"error":{"message":"schema too complex"}}', { status: 400 });
    assert.equal(body.response_format.type, "json_object");
    assert.match(body.messages[0].content, /required/);
    return new Response('{"choices":[]}');
  };
  try {
    const response = await aiRequest(
      "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions",
      {
        body: JSON.stringify({
          response_format: { json_schema: { schema: { required: ["actions"] } } },
          messages: [],
        }),
      },
    );
    assert.equal(response.status, 200);
    assert.equal(calls, 2);
  } finally {
    globalThis.fetch = original;
  }
});
