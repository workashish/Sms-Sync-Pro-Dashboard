import { databaseApi, pool } from './support/database-api.mjs';
import { spawn } from 'node:child_process';
const api=await databaseApi(4321);
const app=spawn(process.execPath,['node_modules/next/dist/bin/next','start','-p','4320','-H','0.0.0.0'],{env:{...process.env,SUPABASE_URL:'http://127.0.0.1:4321',SUPABASE_SERVICE_ROLE_KEY:'test-service-key',DASHBOARD_PASSWORD:'emulator-test-password',APP_HMAC_SECRET:'YOUR_HMAC_SECRET_KEY',APP_AES_PASSWORD:'YOUR_AES_PASSWORD'},stdio:'inherit'});
for(const signal of ['SIGINT','SIGTERM'])process.on(signal,async()=>{app.kill();await new Promise(r=>api.close(r));await pool.end();process.exit()});
