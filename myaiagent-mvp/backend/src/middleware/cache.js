export function cacheControl(maxAge = 300) {
  return (req, res, next) => {
    res.set('Cache-Control', `public, max-age=${maxAge}`);
    next();
  };
}

export function noCache(req, res, next) {
  res.set({
    'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
    'Pragma': 'no-cache',
    'Expires': '0',
    'Surrogate-Control': 'no-store'
  });
  next();
}

export function staleWhileRevalidate(maxAge = 60, staleTime = 300) {
  return (req, res, next) => {
    res.set('Cache-Control', `public, max-age=${maxAge}, stale-while-revalidate=${staleTime}`);
    next();
  };
}

export function conditionalCache(req, res, next) {
  const etag = res.get('ETag');
  const ifNoneMatch = req.get('If-None-Match');
  
  if (etag && ifNoneMatch === etag) {
    return res.status(304).end();
  }
  
  next();
}
