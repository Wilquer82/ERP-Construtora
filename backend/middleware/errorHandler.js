export default function errorHandler(err, req, res, next) {
  console.error(err);
  if (res.headersSent) return next(err);

  if (
    err?.name === 'CastError'
    || err?.name === 'ValidationError'
    || err?.code === 11000
    || err?.type === 'entity.parse.failed'
  ) {
    return res.status(400).json({ error: 'Requisição inválida' });
  }
  if (err?.name === 'DocumentNotFoundError' || err?.status === 404 || err?.statusCode === 404) {
    return res.status(404).json({ error: 'Não encontrado' });
  }
  return res.status(500).json({ error: 'Erro interno do servidor' });
}
