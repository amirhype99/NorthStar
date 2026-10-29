#!/usr/bin/env node
import { pbkdf2Sync, randomBytes } from 'node:crypto';

const [username, password] = process.argv.slice(2);
if (!username || !password) {
  console.error("Usage: node scripts/create-admin-hash.mjs <username> <password>");
  process.exit(1);
}
if (username.length > 64 || password.length < 12 || password.length > 1024) {
  console.error('Username must be at most 64 chars; password must be 12-1024 chars.');
  process.exit(1);
}
const iterations = 210000;
const salt = randomBytes(16);
const hash = pbkdf2Sync(password, salt, iterations, 32, 'sha256');
const b64url = value => value.toString('base64url');
const encoded = `pbkdf2$${iterations}$${b64url(salt)}$${b64url(hash)}`;
console.log('Run these commands from the project directory:');
console.log(`npx wrangler kv key put "auth:username" '${username.replace(/'/g, "'\\''")}' --binding ADMIN_KV`);
console.log(`npx wrangler kv key put "auth:password" '${encoded}' --binding ADMIN_KV`);
