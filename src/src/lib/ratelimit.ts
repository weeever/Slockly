const buckets = new Map<string, {count:number, reset:number}>();
const WINDOW_MS = 60_000;
const LIMIT = 60;

export function checkRateLimit(ip: string){
  const now = Date.now();
  const b = buckets.get(ip) || {count:0, reset: now + WINDOW_MS};
  if (now > b.reset) { b.count = 0; b.reset = now + WINDOW_MS; }
  b.count += 1;
  buckets.set(ip, b);
  const remaining = Math.max(0, LIMIT - b.count);
  const limited = b.count > LIMIT;
  return { limited, remaining, reset: b.reset };
}
