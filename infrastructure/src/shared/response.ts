interface ApiResponse {
  statusCode: number;
  headers: Record<string, string>;
  body: string;
}

const HEADERS = { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' };

export const ok        = (data: unknown, status = 200): ApiResponse =>
  ({ statusCode: status, headers: HEADERS, body: JSON.stringify(data) });

export const created   = (data: unknown): ApiResponse => ok(data, 201);

export const noContent = (): ApiResponse =>
  ({ statusCode: 204, headers: HEADERS, body: '' });

export const err = (status: number, code: string, message: string, data?: unknown): ApiResponse =>
  ({ statusCode: status, headers: HEADERS, body: JSON.stringify({ code, message, ...(data ? { data } : {}) }) });

export const badRequest  = (msg: string, data?: unknown) => err(400, 'BAD_REQUEST',    msg, data);
export const unauthorized = ()                            => err(401, 'UNAUTHORIZED',   'Authentication required');
export const forbidden   = (msg = 'Forbidden')           => err(403, 'FORBIDDEN',      msg);
export const notFound    = (msg = 'Not found')           => err(404, 'NOT_FOUND',      msg);
export const conflict    = (msg: string, data?: unknown) => err(409, 'CONFLICT',       msg, data);
export const serverError = (msg = 'Internal server error') => err(500, 'INTERNAL_ERROR', msg);
