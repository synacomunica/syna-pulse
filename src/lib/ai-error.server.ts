/** Translate provider failures without exposing API keys, prompts or customer data. */
export async function aiFailure(response: Response): Promise<Error> {
  let detail = "";
  try {
    detail = await response.text();
  } catch {
    // A provider may close the connection before returning its error body.
  }
  if (/API_KEY_INVALID|API_KEY_EXPIRED|API key (?:not valid|expired)|invalid api key/i.test(detail))
    return new Error(
      "Chave de IA inválida ou expirada. Atualize GEMINI_API_KEY na Vercel e publique novamente.",
    );
  if (
    /API_KEY_SERVICE_BLOCKED|API_KEY_HTTP_REFERRER_BLOCKED|API_KEY_IP_ADDRESS_BLOCKED|SERVICE_DISABLED/i.test(
      detail,
    )
  )
    return new Error(
      "Chave de IA sem permissão para este servidor. Verifique as restrições da chave e a API Gemini no Google Cloud.",
    );
  if (response.status === 429)
    return new Error("Limite de uso da IA atingido. Verifique a cota e o faturamento do provedor.");
  if (response.status === 401 || response.status === 403)
    return new Error("Chave de IA recusada. Verifique a chave e as permissões na Vercel.");
  if (/location.*not supported|not available in your country/i.test(detail))
    return new Error(
      "IA indisponível na região do servidor. Verifique a região de implantação na Vercel.",
    );
  if (
    response.status === 404 ||
    /model.*(?:not found|not supported|not available|deprecated)/i.test(detail)
  )
    return new Error(
      "Modelo de IA indisponível. Verifique GEMINI_MODEL e os modelos disponíveis para a chave configurada.",
    );
  if (/schema|too many states|constraint|complexity/i.test(detail))
    return new Error(
      "A IA recusou o formato do plano. Não foi salva uma versão incompleta; tente novamente.",
    );
  if (/token.*(?:limit|exceed)|input.*too (?:large|long)/i.test(detail))
    return new Error(
      "Os dados excedem o limite da IA. Reduza o histórico incluído no planejamento.",
    );
  return new Error(
    `A solicitação à IA foi recusada (${response.status}). Nenhum plano incompleto foi salvo.`,
  );
}
