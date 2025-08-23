export function getIP(req: Request){
  // Next behind proxies -> use headers
  // @ts-ignore
  return req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'local';
}

export function toMinutes(ms: number){
  return Math.round(ms/1000/60);
}
