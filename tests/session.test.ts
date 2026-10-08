import test from 'node:test';
import assert from 'node:assert/strict';
import { createSessionToken, verifySessionToken } from '../lib/session';
import crypto from 'node:crypto';
test('session expiry, signature tampering, random session IDs and rotated secrets', async()=>{
 const id=crypto.randomUUID();const secret='test-secret';const expires=Date.now()+60000;
 const token=await createSessionToken(secret,id,expires);
 assert.equal((await verifySessionToken(token,secret))?.id,id);
 assert.equal(await verifySessionToken(token,secret,expires+1),null);
 assert.equal(await verifySessionToken(token,'wrong-secret'),null);
 assert.equal(await verifySessionToken(token.slice(0,-1)+(token.endsWith('0')?'1':'0'),secret),null);
 assert.equal(await verifySessionToken('static-old-cookie',secret),null);
});
