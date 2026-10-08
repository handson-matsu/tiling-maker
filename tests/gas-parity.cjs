const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..'),read=name=>fs.readFileSync(path.join(root,name),'utf8');
const gas=read('gas/index.html'),legacy=read('gas/index.legacy.html');
assert.equal(gas.match(/<script>([\s\S]*?)<\/script>/)[1].trim(),read('app.js').trim());
assert.equal(gas.match(/<style>([\s\S]*?)<\/style>/)[1].trim(),read('style.css').trim());
assert.ok(!/fetch\(|script\.google\.com|google\.script\.run/.test(read('app.js')));
assert.ok(legacy.includes('script.google.com'));
console.log('PASS: active GAS/Pages scripts and styles match; counter removed from active code; legacy retained separately.');
