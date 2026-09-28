// Middleware: verifica se o usuario tem acesso a uma obra especifica
// Use após `protect`. Requer req.params.id ou req.params.obra ou req.body?.obra ou req.query?.obra como ObjectId da obra.
// Admins e super-admins tem acesso a todas as obras.
// Usuarios regulares so podem acessar obras listadas em req.user.obras (ou todas se a lista for vazia e role for admin).
export function obraAccess(req, res, next) {
  const obraId = req.params.id || req.params.obra || req.body?.obra || req.query?.obra;
  if (!obraId) return next();

  const adminOuSuper = req.user?.role === 'admin' || req.user?.superAdmin;

  if (adminOuSuper) return next();

  const obras = req.user?.obras || [];
  if (obras.length === 0) {
    return res.status(403).json({ error: 'Acesso restrito — nenhuma obra atribuida' });
  }

  const hasAccess = obras.some((obra) => String(obra) === String(obraId));
  if (!hasAccess) {
    return res.status(403).json({ error: 'Acesso negado a esta obra' });
  }
  next();
}

// Middleware para filtrar listagens por obras permitidas.
// Adiciona req.obrasFiltro = { _id: { $in: [...] } } para uso em controllers.
export function obraScope() {
  return (req, res, next) => {
    const adminOuSuper = req.user?.role === 'admin' || req.user?.superAdmin;
    if (adminOuSuper) {
      req.obrasFiltro = {};
    } else {
      const obras = req.user?.obras || [];
      req.obrasFiltro = obras.length > 0
        ? { _id: { $in: obras } }
        : { _id: { $in: [] } };
    }
    next();
  };
}
