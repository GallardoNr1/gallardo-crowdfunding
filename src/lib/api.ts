// Utilidades pequeñas para los endpoints de src/pages/api/*.

export function json(
  data: unknown,
  init: { status?: number; headers?: Record<string, string> } = {}
): Response {
  return new Response(JSON.stringify(data), {
    status: init.status ?? 200,
    headers: { 'Content-Type': 'application/json', ...(init.headers ?? {}) },
  });
}

/** IP del cliente: primera de X-Forwarded-For (nginx delante) o la del socket. */
export function clientIp(request: Request, socketAddress: string): string {
  const forwarded = request.headers.get('x-forwarded-for');
  const first = forwarded?.split(',')[0]?.trim();
  return first || socketAddress || 'unknown';
}

/** Cuerpo JSON o undefined si no es JSON válido (el llamador responde 400). */
export async function readJson(request: Request): Promise<unknown | undefined> {
  try {
    return await request.json();
  } catch {
    return undefined;
  }
}
