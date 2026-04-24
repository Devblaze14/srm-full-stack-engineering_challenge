export function withCors(init: ResponseInit = {}): ResponseInit {
  const headers = new Headers(init.headers);
  headers.set("Access-Control-Allow-Origin", "*");
  headers.set("Access-Control-Allow-Methods", "POST, OPTIONS");
  headers.set("Access-Control-Allow-Headers", "Content-Type");
  return { ...init, headers };
}
