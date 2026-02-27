export interface MockPR {
    id: string;
    title: string;
    author: string;
    repo: string;
    walletAddress: string;
    diff: string;
    filesChanged: number;
    additions: number;
    deletions: number;
}

export const MOCK_PRS: MockPR[] = [
    {
        id: "pr-1",
        title: "feat: Add rate limiter middleware with sliding window",
        author: "alex-dev",
        repo: "acme/api-gateway",
        walletAddress: "0x742d35Cc6634C0532925a3b844Bc9e7595f2bD28",
        diff: `diff --git a/src/middleware/rateLimiter.ts b/src/middleware/rateLimiter.ts
new file mode 100644
index 0000000..a8f3e12
--- /dev/null
+++ b/src/middleware/rateLimiter.ts
@@ -0,0 +1,58 @@
+import { Request, Response, NextFunction } from 'express';
+
+interface RateLimitEntry {
+  tokens: number;
+  lastRefill: number;
+}
+
+const store = new Map<string, RateLimitEntry>();
+
+export function createRateLimiter(opts: {
+  maxTokens: number;
+  refillRate: number;
+  windowMs: number;
+}) {
+  const { maxTokens, refillRate, windowMs } = opts;
+
+  // Cleanup stale entries every 5 minutes
+  setInterval(() => {
+    const now = Date.now();
+    for (const [key, entry] of store) {
+      if (now - entry.lastRefill > windowMs * 2) {
+        store.delete(key);
+      }
+    }
+  }, 5 * 60 * 1000);
+
+  return (req: Request, res: Response, next: NextFunction) => {
+    const clientId = req.ip || req.headers['x-forwarded-for'] as string || 'unknown';
+    const now = Date.now();
+
+    let entry = store.get(clientId);
+    if (!entry) {
+      entry = { tokens: maxTokens, lastRefill: now };
+      store.set(clientId, entry);
+    }
+
+    // Refill tokens based on elapsed time
+    const elapsed = now - entry.lastRefill;
+    const refill = Math.floor(elapsed / 1000) * refillRate;
+    entry.tokens = Math.min(maxTokens, entry.tokens + refill);
+    entry.lastRefill = now;
+
+    if (entry.tokens <= 0) {
+      res.status(429).json({
+        error: 'Rate limit exceeded',
+        retryAfter: Math.ceil((1 / refillRate) * 1000),
+      });
+      return;
+    }
+
+    entry.tokens -= 1;
+    res.setHeader('X-RateLimit-Remaining', entry.tokens);
+    res.setHeader('X-RateLimit-Limit', maxTokens);
+    next();
+  };
+}`,
        filesChanged: 1,
        additions: 58,
        deletions: 0,
    },
    {
        id: "pr-2",
        title: "fix: Patch XSS vulnerability in user input sanitizer",
        author: "security-sarah",
        repo: "acme/web-client",
        walletAddress: "0x8ba1f109551bD432803012645Ac136ddd64DBA72",
        diff: `diff --git a/src/utils/sanitize.ts b/src/utils/sanitize.ts
index 3e1f8a7..b2d9c4e 100644
--- a/src/utils/sanitize.ts
+++ b/src/utils/sanitize.ts
@@ -1,8 +1,32 @@
-export function sanitizeInput(input: string): string {
-  return input.replace(/</g, '&lt;').replace(/>/g, '&gt;');
-}
+const DANGEROUS_PATTERNS = [
+  /javascript:/gi,
+  /on\\w+\\s*=/gi,
+  /data:\\s*text\\/html/gi,
+  /<\\s*script/gi,
+  /<\\s*iframe/gi,
+  /<\\s*object/gi,
+  /<\\s*embed/gi,
+];
+
+export function sanitizeInput(input: string): string {
+  let clean = input;
+
+  // Strip dangerous patterns
+  for (const pattern of DANGEROUS_PATTERNS) {
+    clean = clean.replace(pattern, '[removed]');
+  }
+
+  // Encode HTML entities
+  clean = clean
+    .replace(/&/g, '&amp;')
+    .replace(/</g, '&lt;')
+    .replace(/>/g, '&gt;')
+    .replace(/"/g, '&quot;')
+    .replace(/'/g, '&#x27;');
+
+  return clean;
+}
+
+export function isCleanInput(input: string): boolean {
+  return DANGEROUS_PATTERNS.every(p => !p.test(input));
+}`,
        filesChanged: 1,
        additions: 28,
        deletions: 3,
    },
    {
        id: "pr-3",
        title: "chore: Add console.log debugging and hardcoded API key",
        author: "junior-jake",
        repo: "acme/backend",
        walletAddress: "0x1234567890abcdef1234567890abcdef12345678",
        diff: `diff --git a/src/api/users.ts b/src/api/users.ts
index 1a2b3c4..5d6e7f8 100644
--- a/src/api/users.ts
+++ b/src/api/users.ts
@@ -1,10 +1,18 @@
 import { db } from '../database';
 
+const API_KEY = 'sk_live_abc123_DONT_COMMIT_THIS';
+
 export async function getUser(id: string) {
+  console.log('getting user', id);
+  console.log('debug: this is working??');
   const user = await db.users.findById(id);
+  console.log('got user', user);
+  console.log('TODO: remove this later');
   if (!user) {
+    console.log('user not found lol');
     throw new Error('User not found');
   }
+  // @ts-ignore
   return user;
 }`,
        filesChanged: 1,
        additions: 8,
        deletions: 0,
    },
    {
        id: "pr-4",
        title: "feat: Implement WebSocket connection pool with health checks",
        author: "infra-maya",
        repo: "acme/realtime-engine",
        walletAddress: "0xdAC17F958D2ee523a2206206994597C13D831ec7",
        diff: `diff --git a/src/ws/pool.ts b/src/ws/pool.ts
new file mode 100644
index 0000000..f9a8b2c
--- /dev/null
+++ b/src/ws/pool.ts
@@ -0,0 +1,72 @@
+import WebSocket from 'ws';
+
+interface PooledConnection {
+  ws: WebSocket;
+  id: string;
+  lastPing: number;
+  isAlive: boolean;
+}
+
+export class ConnectionPool {
+  private connections: Map<string, PooledConnection> = new Map();
+  private healthCheckInterval: NodeJS.Timer;
+
+  constructor(private maxConnections: number = 1000) {
+    this.healthCheckInterval = setInterval(() => this.healthCheck(), 30_000);
+  }
+
+  add(id: string, ws: WebSocket): boolean {
+    if (this.connections.size >= this.maxConnections) {
+      this.evictStale();
+      if (this.connections.size >= this.maxConnections) return false;
+    }
+
+    const conn: PooledConnection = {
+      ws,
+      id,
+      lastPing: Date.now(),
+      isAlive: true,
+    };
+
+    ws.on('pong', () => { conn.isAlive = true; conn.lastPing = Date.now(); });
+    ws.on('close', () => this.connections.delete(id));
+    ws.on('error', () => { ws.terminate(); this.connections.delete(id); });
+
+    this.connections.set(id, conn);
+    return true;
+  }
+
+  broadcast(data: string, exclude?: string): void {
+    for (const [id, conn] of this.connections) {
+      if (id !== exclude && conn.ws.readyState === WebSocket.OPEN) {
+        conn.ws.send(data);
+      }
+    }
+  }
+
+  private healthCheck(): void {
+    for (const [id, conn] of this.connections) {
+      if (!conn.isAlive) {
+        conn.ws.terminate();
+        this.connections.delete(id);
+        continue;
+      }
+      conn.isAlive = false;
+      conn.ws.ping();
+    }
+  }
+
+  private evictStale(): void {
+    const sorted = [...this.connections.entries()]
+      .sort(([, a], [, b]) => a.lastPing - b.lastPing);
+    const toEvict = Math.ceil(sorted.length * 0.1);
+    for (let i = 0; i < toEvict; i++) {
+      sorted[i][1].ws.terminate();
+      this.connections.delete(sorted[i][0]);
+    }
+  }
+
+  get size(): number { return this.connections.size; }
+
+  destroy(): void {
+    clearInterval(this.healthCheckInterval);
+    for (const [, conn] of this.connections) conn.ws.terminate();
+    this.connections.clear();
+  }
+}`,
        filesChanged: 1,
        additions: 72,
        deletions: 0,
    },
    {
        id: "pr-5",
        title: "refactor: Overhaul JWT auth middleware with refresh token rotation",
        author: "lead-security",
        repo: "acme/api-gateway",
        walletAddress: "0xABCDEF1234567890ABCDEF1234567890ABCDEF12",
        diff: `diff --git a/src/middleware/auth.ts b/src/middleware/auth.ts
index 4a5b6c7..d8e9f10 100644
--- a/src/middleware/auth.ts
+++ b/src/middleware/auth.ts
@@ -1,30 +1,95 @@
-import jwt from 'jsonwebtoken';
-import { Request, Response, NextFunction } from 'express';
-
-const SECRET = process.env.JWT_SECRET!;
-
-export function authenticate(req: Request, res: Response, next: NextFunction) {
-  const token = req.headers.authorization?.split(' ')[1];
-  if (!token) return res.status(401).json({ error: 'No token' });
-  try {
-    req.user = jwt.verify(token, SECRET);
-    next();
-  } catch {
-    res.status(401).json({ error: 'Invalid token' });
-  }
-}
+import jwt, { JwtPayload } from 'jsonwebtoken';
+import { Request, Response, NextFunction } from 'express';
+import { Redis } from 'ioredis';
+import crypto from 'crypto';
+
+interface TokenPair {
+  accessToken: string;
+  refreshToken: string;
+  expiresAt: number;
+}
+
+const ACCESS_TOKEN_TTL = 15 * 60; // 15 minutes
+const REFRESH_TOKEN_TTL = 7 * 24 * 60 * 60; // 7 days
+const redis = new Redis(process.env.REDIS_URL!);
+
+export class AuthMiddleware {
+  private readonly jwtSecret: string;
+  private readonly issuer: string;
+
+  constructor() {
+    this.jwtSecret = process.env.JWT_SECRET!;
+    this.issuer = process.env.JWT_ISSUER || 'acme-api';
+    if (!this.jwtSecret) throw new Error('JWT_SECRET is required');
+  }
+
+  authenticate = async (req: Request, res: Response, next: NextFunction) => {
+    const authHeader = req.headers.authorization;
+    if (!authHeader?.startsWith('Bearer ')) {
+      return res.status(401).json({ error: 'Missing authorization header' });
+    }
+
+    const token = authHeader.slice(7);
+    try {
+      const payload = jwt.verify(token, this.jwtSecret, {
+        issuer: this.issuer,
+        algorithms: ['HS256'],
+      }) as JwtPayload;
+
+      // Check if token has been revoked
+      const isRevoked = await redis.get(\`revoked:\${payload.jti}\`);
+      if (isRevoked) {
+        return res.status(401).json({ error: 'Token has been revoked' });
+      }
+
+      req.user = { id: payload.sub!, role: payload.role, jti: payload.jti! };
+      next();
+    } catch (err) {
+      if (err instanceof jwt.TokenExpiredError) {
+        return res.status(401).json({ error: 'Token expired', code: 'TOKEN_EXPIRED' });
+      }
+      return res.status(401).json({ error: 'Invalid token' });
+    }
+  };
+
+  async rotateRefreshToken(oldRefreshToken: string): Promise<TokenPair> {
+    const stored = await redis.get(\`refresh:\${oldRefreshToken}\`);
+    if (!stored) throw new Error('Invalid refresh token');
+
+    const userData = JSON.parse(stored);
+
+    // Revoke old refresh token (one-time use)
+    await redis.del(\`refresh:\${oldRefreshToken}\`);
+
+    // Generate new token pair
+    return this.generateTokenPair(userData.userId, userData.role);
+  }
+
+  generateTokenPair(userId: string, role: string): TokenPair {
+    const jti = crypto.randomUUID();
+    const accessToken = jwt.sign(
+      { sub: userId, role, jti },
+      this.jwtSecret,
+      { expiresIn: ACCESS_TOKEN_TTL, issuer: this.issuer, algorithm: 'HS256' }
+    );
+
+    const refreshToken = crypto.randomBytes(32).toString('hex');
+    redis.setex(\`refresh:\${refreshToken}\`, REFRESH_TOKEN_TTL, JSON.stringify({ userId, role }));
+
+    return {
+      accessToken,
+      refreshToken,
+      expiresAt: Date.now() + ACCESS_TOKEN_TTL * 1000,
+    };
+  }
+
+  async revokeToken(jti: string): Promise<void> {
+    await redis.setex(\`revoked:\${jti}\`, ACCESS_TOKEN_TTL, '1');
+  }
+}`,
        filesChanged: 1,
        additions: 80,
        deletions: 15,
    },
    {
        id: "pr-6",
        title: "docs: Fix typo in README installation instructions",
        author: "first-timer",
        repo: "acme/api-gateway",
        walletAddress: "0x1111222233334444555566667777888899990000",
        diff: `diff --git a/README.md b/README.md
index abc1234..def5678 100644
--- a/README.md
+++ b/README.md
@@ -12,7 +12,7 @@
 ## Installation
 
-To instal the project, run:
+To install the project, run:
 
 \`\`\`bash
 npm install`,
        filesChanged: 1,
        additions: 1,
        deletions: 1,
    },
];

export function getRandomMockPR(): MockPR {
    const idx = Math.floor(Math.random() * MOCK_PRS.length);
    return MOCK_PRS[idx];
}

