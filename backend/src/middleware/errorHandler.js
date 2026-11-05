export function notFound(_req, res) {
  res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Resource not found' } });
}

export function errorHandler(error, _req, res, _next) {
  const status = Number.isInteger(error.status) ? error.status : 500;
  if (status >= 500) console.error(error);
  res.status(status).json({
    error: {
      code: error.code && status < 500 ? error.code : 'INTERNAL_ERROR',
      message: status < 500 ? error.message : 'An unexpected error occurred'
    }
  });
}
