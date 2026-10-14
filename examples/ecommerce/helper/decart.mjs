// The SDK token helper has no AbortSignal option. Use the same documented REST
// endpoint here so closing a request cancels it and a network stall is bounded.
export async function mintClientToken(apiKey, maxSeconds, signal) {
  const response = await fetch("https://api.decart.ai/v1/client/tokens", {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-API-KEY": apiKey },
    body: JSON.stringify({ expiresIn: 60, allowedModels: ["lucy-vton-latest", "lucy-vton-3.6"],
      constraints: { realtime: { maxSessionDuration: maxSeconds } } }),
    signal: signal ? AbortSignal.any([signal, AbortSignal.timeout(15000)]) : AbortSignal.timeout(15000),
  });
  if (!response.ok) {
    await response.body?.cancel();
    throw Object.assign(new Error("Decart request failed"), { status: response.status });
  }
  const token = await response.json();
  if (typeof token.apiKey !== "string" || !token.apiKey || token.apiKey === apiKey) throw new Error("Unexpected token response");
  return { apiKey: token.apiKey, expiresAt: token.expiresAt };
}
export function publicDecartError(error) {
  const messages = {
    401: "密钥无效或已撤销，请检查后重新输入。",
    402: "Decart 账户额度不足，请前往 Decart 确认。",
    403: "密钥权限不足，无法申请试穿令牌。",
    429: "Decart 请求过于频繁，请稍后再试。",
  };
  const status = error?.status;
  return { status: messages[status] ? status : 502,
    error: messages[status] || "无法连接 Decart，请检查网络、代理设置或稍后重试。" };
}
