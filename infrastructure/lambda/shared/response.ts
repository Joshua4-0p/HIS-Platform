// Standard API Gateway HTTP API response helpers (COM-002)
export function ok(body: unknown) {
  return { statusCode: 200, body: JSON.stringify(body) };
}

export function created(body: unknown) {
  return { statusCode: 201, body: JSON.stringify(body) };
}

export function badRequest(message: string) {
  return { statusCode: 400, body: JSON.stringify({ error: message }) };
}

export function unauthorized(message = 'Unauthorized') {
  return { statusCode: 401, body: JSON.stringify({ error: message }) };
}

export function forbidden(message = 'Forbidden') {
  return { statusCode: 403, body: JSON.stringify({ error: message }) };
}

export function notFound(message = 'Not found') {
  return { statusCode: 404, body: JSON.stringify({ error: message }) };
}

export function conflict(body: unknown) {
  return { statusCode: 409, body: JSON.stringify(body) };
}

export function serverError(message = 'Internal server error') {
  return { statusCode: 500, body: JSON.stringify({ error: message }) };
}
