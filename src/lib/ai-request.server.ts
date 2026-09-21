/** Keep retries bounded by the original timeout; validation remains mandatory at the caller. */
export async function aiRequest(url: string, init: RequestInit): Promise<Response> {
  let request = init;
  let response = await fetch(url, request);
  // Large nested schemas can exceed Gemini's constrained-decoding limits. Use JSON mode
  // only for a schema-specific rejection, preserving the exact schema in the instructions.
  if (
    response.status === 400 &&
    url.startsWith("https://generativelanguage.googleapis.com/") &&
    typeof init.body === "string"
  ) {
    const error = await response.clone().text();
    const body = JSON.parse(init.body);
    if (
      /schema|too many states|constraint|complexity/i.test(error) &&
      body.response_format?.json_schema
    ) {
      const schema = body.response_format.json_schema.schema;
      body.response_format = { type: "json_object" };
      body.messages.unshift({
        role: "system",
        content: `Retorne somente JSON conforme este esquema. A resposta será validada por código: ${JSON.stringify(schema)}`,
      });
      await response.body?.cancel();
      request = { ...init, body: JSON.stringify(body) };
      response = await fetch(url, request);
    }
  }
  if (![502, 503, 504].includes(response.status) || init.signal?.aborted) return response;
  await response.body?.cancel();
  await new Promise((resolve) => setTimeout(resolve, 1500));
  init.signal?.throwIfAborted();
  return fetch(url, request);
}
