import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import pg from 'pg';
const url = process.env.TEST_DATABASE_URL;
test('real database RLS, atomic ingest, idempotency, pagination, full export, timezone analytics and rate limits', { skip: !url }, async () => {
 const client = new pg.Client({ connectionString: url }); await client.connect();
 try {
  await client.query('begin'); await client.query('set local role service_role');
  await client.query('select public.purge_dashboard()');
  const id=crypto.randomUUID();const row={id,sender:'TEST',body:'Your OTP is 123456',time:new Date().toISOString(),received_at:new Date().toISOString(),metadata:{is_unread:true}};
  const insert=()=>client.query('select public.ingest_messages($1,$2)',[JSON.stringify([{table:'otp_messages',row}]),JSON.stringify({body:'[redacted]'})]);
  await insert(); await insert();
  assert.equal((await client.query('select count(*) from public.otp_messages where id=$1',[id])).rows[0].count,'1');
  await client.query('savepoint badbatch');
  await assert.rejects(client.query('select public.ingest_messages($1,$2)',[JSON.stringify([{table:'messages',row:{...row,id:crypto.randomUUID()}},{table:'invalid',row}]),'{}']));
  await client.query('rollback to savepoint badbatch');
  assert.equal((await client.query('select count(*) from public.messages')).rows[0].count,'0');
  for(let i=0;i<6;i++){
   const rows=Array.from({length:100},(_,j)=>({table:'messages',row:{...row,id:crypto.randomUUID(),body:`Record ${i*100+j}`}}));
   await client.query('select public.ingest_messages($1,$2)',[JSON.stringify(rows),'{}']);
  }
  const page=(await client.query("select public.query_message_page('messages',500,12,'',false,false) as result")).rows[0].result;
  assert.equal(page.data.length,12);assert.equal(page.count,600);
  assert.equal((await client.query('select public.export_dashboard() as result')).rows[0].result.messages.length,600);
  const exportId=(await client.query('select public.start_export($1) as id',[crypto.randomUUID()])).rows[0].id;
  let last=0,total=0; while(true){const items=(await client.query('select public.export_page($1,$2) as data',[exportId,last])).rows[0].data;if(!items.length)break;total+=items.length;last=items.at(-1).item_index;}
  assert.equal(total,601);await client.query('select public.finish_export($1)',[exportId]);
  const analytics=(await client.query("select public.dashboard_analytics('Asia/Kolkata') as result")).rows[0].result;
  assert.equal(analytics.counts.messages,600);assert.equal(analytics.days.reduce((n: number,d: { messages: number })=>n+d.messages,0),600);
  for(let i=0;i<11;i++){const result=(await client.query('select public.consume_login_attempt($1) as allowed',['test-scope'])).rows[0].allowed;assert.equal(result,i<10);}
  await client.query('savepoint denied');await client.query('set local role anon');
  await assert.rejects(client.query('select * from public.messages'));
  await client.query('rollback to savepoint denied');
  await client.query('rollback');
 } finally { await client.end(); }
});
