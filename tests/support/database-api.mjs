import { createServer } from 'node:http';
import pg from 'pg';
export const pool = new pg.Pool({ connectionString: process.env.TEST_DATABASE_URL || 'postgresql://127.0.0.1:55329/postgres' });
const functions = {
 consume_login_attempt: ['client_scope'], ingest_messages: ['entries','audit_payload'], query_message_page: ['category','page_offset','page_size','search_text','only_unread','only_reminder'],
 set_message_flag: ['target_table','target_id','flag','flag_value'], dashboard_analytics: ['zone'], purge_dashboard: [], export_dashboard: [], start_export: ["owner_session"], export_page: ["export_id", "page_offset"], finish_export: ["export_id"], prune_dashboard_data: [],
};
const tables = new Set(['dashboard_sessions','messages','otp_messages','bank_activity','webhook_logs','all_messages','message_receipts','export_jobs']);
const columns = new Set(['id','sender','body','time','received_at','metadata','created_at','revoked_at','expires_at','owner_session','total']);
export async function databaseApi(port) {
 const server = createServer(async(req,res)=>{
  const client = await pool.connect();
  try {
   let raw=''; for await(const chunk of req) raw+=chunk;
   const body=raw ? JSON.parse(raw) : undefined;
   const url=new URL(req.url,'http://localhost');
   await client.query('begin');
   await client.query(`set local role ${req.headers.apikey==='test-anon-key'?'anon':'service_role'}`);
   let output;
   const name=url.pathname.split('/').at(-1);
   if(url.pathname.startsWith('/rest/v1/rpc/')) {
    const args=functions[name]; if(!args) throw new Error('Unknown function');
    const values=args.map(key=> ['entries','audit_payload'].includes(key) ? JSON.stringify(body[key]) : body[key]);
    const result=await client.query(`select public.${name}(${args.map((_,i)=>'$'+(i+1)).join(',')}) as result`,values);
    output=result.rows[0].result;
   } else {
    if(!tables.has(name)) throw new Error('Unknown table');
    const params=[]; const conditions=[];
    for(const [key,value] of url.searchParams){
     if(!columns.has(key)) continue;
     if(value==='is.null'){conditions.push(`${key} is null`);continue;}
     const split=value.indexOf('.'); const op=value.slice(0,split); const val=value.slice(split+1);
     const symbol={eq:'=',gt:'>',gte:'>=',lt:'<',lte:'<='}[op]; if(!symbol)throw new Error('Unsupported filter');
     params.push(val);conditions.push(`${key} ${symbol} $${params.length}`);
    }
    const where=conditions.length?' where '+conditions.join(' and '):'';
    if(req.method==='GET') {
     const selected=(url.searchParams.get('select')||'*').split(',');
     if(selected.some(key=>key!=='*'&&!columns.has(key)))throw new Error('Unknown column');
     let order=''; if(url.searchParams.has('order')){
      const parts=url.searchParams.get('order').split(',').map(part=>{const [key,direction]=part.split('.');if(!columns.has(key))throw new Error('Invalid order');return `${key} ${direction==='desc'?'desc':'asc'}`;});order=' order by '+parts.join(',');
     }
     const limit=Number(url.searchParams.get('limit')||1000),offset=Number(url.searchParams.get('offset')||0);
     const result=await client.query(`select ${selected.join(',')} from public.${name}${where}${order} limit ${limit} offset ${offset}`,params);
     output=result.rows;
     if(req.headers.prefer?.includes('count=exact')){
      const count=await client.query(`select count(*) from public.${name}${where}`,params);
      res.setHeader('Content-Range',`${offset}-${offset+Math.max(0,result.rows.length-1)}/${count.rows[0].count}`);
     }
    } else if(req.method==='POST') {
     const rows=Array.isArray(body)?body:[body];
     for(const row of rows){const keys=Object.keys(row);if(keys.some(key=>!columns.has(key)))throw new Error('Unknown column');await client.query(`insert into public.${name}(${keys.join(',')}) values(${keys.map((_,i)=>'$'+(i+1)).join(',')})`,Object.values(row));}
     output=null;
    } else if(req.method==='PATCH') {
     const keys=Object.keys(body);if(keys.some(key=>!columns.has(key)))throw new Error('Unknown column');
     const oldLength=params.length;params.push(...Object.values(body));
     await client.query(`update public.${name} set ${keys.map((key,i)=>`${key}=$${oldLength+i+1}`).join(',')}${where}`,params);output=null;
    } else if(req.method==='DELETE'){await client.query(`delete from public.${name}${where}`,params);output=null;}
   }
   await client.query('commit');res.setHeader('Content-Type','application/json');res.end(JSON.stringify(output));
  } catch(error){await client.query('rollback');res.statusCode=error.code==='42501'?403:400;res.setHeader('Content-Type','application/json');res.end(JSON.stringify({code:error.code||'TEST_DB',message:error.message}));}
  finally{client.release();}
 });
 await new Promise(resolve=>server.listen(port,'127.0.0.1',resolve));return server;
}
