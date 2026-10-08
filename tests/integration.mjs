import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import crypto from 'node:crypto';
import { databaseApi, pool } from './support/database-api.mjs';
const api=await databaseApi(4319);
await pool.query('delete from public.dashboard_sessions; delete from public.login_attempts; select public.purge_dashboard(); delete from public.message_receipts');
const server=spawn(process.execPath,['node_modules/next/dist/bin/next','start','-p','4318'],{env:{...process.env,SUPABASE_URL:'http://127.0.0.1:4319',SUPABASE_SERVICE_ROLE_KEY:'test-service-key',DASHBOARD_PASSWORD:'test-dashboard-password',APP_HMAC_SECRET:'test-hmac',APP_AES_PASSWORD:'test-aes'},stdio:'ignore'});
const base='http://127.0.0.1:4318';
try{
 let ready=false;for(let i=0;i<100;i++){try{if((await fetch(base+'/login')).ok){ready=true;break;}}catch{}await new Promise(r=>setTimeout(r,100));}assert(ready);
 for(const path of ['/api/data/messages','/api/otp/bharat-taxi','/api/analytics','/api/export']){
  assert.equal((await fetch(base+path)).status,401);
  assert.equal((await fetch(base+path,{headers:{'x-middleware-subrequest':'middleware:middleware:middleware:middleware:middleware'}})).status,401);
 }
 assert.equal((await fetch(base+'/api/auth/login',{method:'POST',body:JSON.stringify({password:'wrong'})})).status,401);
 const login=await fetch(base+'/api/auth/login',{method:'POST',headers:{origin:base},body:JSON.stringify({password:'test-dashboard-password'})});assert.equal(login.status,200);
 const cookie=login.headers.get('set-cookie').split(';')[0];
 assert.equal((await fetch(base+'/api/data/messages',{headers:{cookie}})).status,200);
 assert.equal((await fetch(base+'/api/data/unknown',{headers:{cookie}})).status,404);
 assert.equal((await fetch(base+'/api/data/messages?limit=501',{headers:{cookie}})).status,400);
 assert.equal((await fetch(base+'/api/data/messages',{method:'DELETE',headers:{cookie,origin:'https://evil.example'},body:JSON.stringify({id:crypto.randomUUID()})})).status,403);
 const salt=Buffer.alloc(16,1),iv=Buffer.alloc(12,2),cipher=crypto.createCipheriv('aes-256-gcm',crypto.pbkdf2Sync('test-aes',salt,10000,32,'sha256'),iv);
 const body='Your OTP is 123456';const encrypted=Buffer.concat([cipher.update(body),cipher.final(),cipher.getAuthTag()]);
 const payload={id:crypto.randomUUID(),schema_version:1,encryption:'aes-256-gcm-pbkdf2-sha256-v1',sender:'TEST',body:[salt,iv,encrypted].map(v=>v.toString('hex')).join(':'),timestamp:Date.now()};
 const post=raw=>fetch(base+'/api/webhooks/incoming',{method:'POST',headers:{'x-hmac-signature':crypto.createHmac('sha256','test-hmac').update(raw).digest('hex')},body:raw});
 assert.equal((await fetch(base+'/api/webhooks/incoming',{method:'POST',body:JSON.stringify(payload)})).status,401);
 assert.equal((await post('{')).status,400);assert.equal((await post('[null]')).status,400);
 assert.equal((await post(JSON.stringify(payload))).status,200);assert.equal((await post(JSON.stringify(payload))).status,200);
 assert.equal((await pool.query('select count(*) from public.otp_messages where id=$1',[payload.id])).rows[0].count,'1');
 const logs=(await pool.query('select payload from public.webhook_logs')).rows;assert(!JSON.stringify(logs).includes('123456'));
 const page=await(await fetch(base+'/api/data/all_messages?limit=12',{headers:{cookie}})).json();assert.equal(page.data[0].body,body);
 assert.equal((await fetch(base+'/api/analytics?timezone=Asia%2FKolkata',{headers:{cookie}})).status,200);
 const exportJob=await(await fetch(base+'/api/export',{method:'POST',headers:{cookie}})).json();
 const exported=await fetch(base+'/api/export?id='+exportJob.id,{headers:{cookie}});assert.equal(exported.status,200);assert.equal((await exported.json()).records.length,1);
 const logout=await fetch(base+'/api/auth/logout',{method:'POST',headers:{cookie}});assert.equal(logout.status,200);
 assert.equal((await fetch(base+'/api/data/messages',{headers:{cookie}})).status,401,'Logged-out cookie is revoked server-side');
 await pool.query('delete from public.login_attempts');
 for(let i=0;i<11;i++){const response=await fetch(base+'/api/auth/login',{method:'POST',body:JSON.stringify({password:'wrong'})});assert.equal(response.status,i<10?401:429);}
 console.log('PASS: real SQL-backed authentication/revocation/rate-limit, API authorization, CSRF, encrypted ingestion, atomic retry IDs, redaction, pagination, analytics and export');
}finally{server.kill('SIGTERM');await new Promise(resolve=>api.close(resolve));await pool.end();}
