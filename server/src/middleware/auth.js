// 鉴权中间件：要求登录
export function requireAuth(req, res, next) {
  if (!req.session || !req.session.userId) {
    return res.status(401).json({ error: '请先登录' });
  }
  next();
}

// 可选鉴权：登录了就附上用户信息
export function optionalAuth(req, _res, next) {
  req.user = req.session?.userId ? { id: req.session.userId } : null;
  next();
}

export function currentUser(req) {
  return req.session?.userId ? { id: req.session.userId } : null;
}
