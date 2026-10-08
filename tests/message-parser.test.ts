import test from 'node:test';
import assert from 'node:assert/strict';
import { parseMessage } from '../lib/message-parser';
import { normalizeMessages } from '../lib/webhook';
import crypto from 'node:crypto';
test('OTP and banking extraction ignores dates, account numbers, balance and substring false positives',()=>{
 assert.equal(parseMessage('On 08/10/2026 your OTP is 123456').code,'123456');
 assert.equal(parseMessage('Please decode the barcode on your account').type,'message');
 assert.equal(parseMessage('Account 9876543210 debited Rs. 1,234.50. Balance Rs. 9999').amount,'1234.50');
 assert.equal(parseMessage('Payment of ₹500 was made').currency,'INR');
 assert.equal(parseMessage('INR 300 credited to your bank').bank_type,'DEPOSIT');
 assert.equal(parseMessage('G-123456 is your Google verification code').code,'123456');
});
test('versioned protocol requires stable IDs, explicit encryption and timestamp',()=>{
 const message={schema_version:1,id:crypto.randomUUID(),timestamp:Date.now(),encryption:'none',sender:'TEST',body:'ab:cd:ef'};
 assert.equal(normalizeMessages(message)[0].row.body,'ab:cd:ef');
 for(const value of [{...message,id:undefined},{...message,encryption:'unknown'},{...message,schema_version:2},{...message,encryption:'aes-256-gcm-pbkdf2-sha256-v1'}])assert.throws(()=>normalizeMessages(value));
 const a=normalizeMessages({sender:'TEST',body:'identical'})[0].row.id,b=normalizeMessages({sender:'TEST',body:'identical'})[0].row.id;
 assert.notEqual(a,b,'Legacy messages without identity do not collapse distinct arrivals');
});
