const {chromium}=require('playwright');
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{pathToFileURL}=require('node:url');
const root=path.resolve(__dirname,'..');
(async()=>{
 const browser=await chromium.launch({channel:'chrome',headless:true});
 const results=[];
 try{
 const maker=await browser.newPage();
 async function fixture(w,h,type){return Buffer.from(await maker.evaluate(({w,h,type})=>{
 const c=document.createElement('canvas');c.width=w;c.height=h;const x=c.getContext('2d');
 x.fillStyle='white';x.fillRect(0,0,w,h);const g=x.createLinearGradient(0,0,w,h);g.addColorStop(0,'#de9352');g.addColorStop(1,'#fff5e0');x.fillStyle=g;x.fillRect(w*.04,h*.04,w*.92,h*.92);x.strokeStyle='#202020';x.lineWidth=w*.01;x.strokeRect(w*.1,h*.1,w*.8,h*.8);
 return c.toDataURL(type,.94).split(',')[1];},{w,h,type}),'base64');}
 const inputs=[{name:'small',buffer:await fixture(160,120,'image/png'),mimeType:'image/png'},{name:'photo',buffer:await fixture(4032,3024,'image/jpeg'),mimeType:'image/jpeg'}];await maker.close();
 for(const input of inputs){const snapshots=[];
 for(const version of ['legacy','pages','gas']){
 const page=await browser.newPage({acceptDownloads:true});let errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.route(/^https?:/,r=>r.abort());
 await page.goto(pathToFileURL(path.join(root,version==='legacy'?'gas/index.legacy.html':version==='gas'?'gas/index.html':'index.html')).href);
 await page.evaluate(()=>{window.drawCalls=0;const previous=draw;draw=function(){window.drawCalls++;previous();};window.processCalls=0;const process=processImage;processImage=function(){window.processCalls++;process();};});
 const loadStart=performance.now();await page.locator('#upload').setInputFiles({name:input.name+(input.mimeType==='image/jpeg'?'.jpg':'.png'),mimeType:input.mimeType,buffer:input.buffer});await page.waitForFunction(()=>!!tileAsset);
 const loadMs=performance.now()-loadStart;
 const outcome=await page.evaluate(async()=>{
 const hash=data=>{let h=2166136261;for(const v of data)h=Math.imul(h^v,16777619);return h>>>0;};
 const sourceHash=hash(original.data);
 const pixelsOf=canvas=>{const c=document.createElement('canvas');c.width=canvas.width;c.height=canvas.height;const x=c.getContext('2d');x.drawImage(canvas,0,0);const data=x.getImageData(0,0,c.width,c.height).data;c.width=c.height=0;return data;};
 $('add').click();$('tile-color').value='#3889dc';$('tile-color').dispatchEvent(new Event('input'));$('tile-color').dispatchEvent(new Event('change'));
 $('right').click();$('flip').click();$('grow').click();
 const before=performance.now();window.drawCalls=0;
 for(let i=0;i<40;i++)$('copy').click();
 const mutationMs=performance.now()-before;
 await new Promise(requestAnimationFrame);await new Promise(requestAnimationFrame);
 const totalMs=performance.now()-before;
 const colored=new Set(tiles.map(t=>t.coloredCanvas).filter(Boolean));
 const colorBytes=[...colored].reduce((sum,c)=>sum+c.width*c.height*4,0);
 const coloredHash=hash(pixelsOf(tiles[0].coloredCanvas));
 // Independent color mutation after sharing must not change the first tile.
 $('tile-color').value='#e85d45';$('tile-color').dispatchEvent(new Event('input'));$('tile-color').dispatchEvent(new Event('change'));
 const unchanged=coloredHash===hash(pixelsOf(tiles[0].coloredCanvas));
 selected=null;draw();const boardHash=hash(ctx.getImageData(0,0,1200,800).data);
 return {sourceHash,coloredHash,boardHash,unchanged,colorBytes,uniqueColorCanvases:colored.size,mutationMs,totalMs,drawCalls:window.drawCalls,tileCount:tiles.length};
 });
 assert.ok(outcome.unchanged);assert.equal(outcome.tileCount,41);
 const download=page.waitForEvent('download');await page.locator('#save').click();const saved=await download;const location=await saved.path();const png=fs.readFileSync(location);const digest=require('node:crypto').createHash('sha256').update(png).digest('hex');
 // A slider burst must produce the same final preview, even when Add follows immediately.
 const background=await page.evaluate(async()=>{
 source.dispatchEvent(new MouseEvent('click',{clientX:source.getBoundingClientRect().left+1,clientY:source.getBoundingClientRect().top+1,bubbles:true}));
 window.processCalls=0;const start=performance.now();
 for(let i=0;i<20;i++){$('threshold').value=i+10;$('threshold').dispatchEvent(new Event('input'));}
 $('add').click();
 const elapsed=performance.now()-start;
 const data=pctx.getImageData(0,0,processed.width,processed.height).data;let hash=2166136261;for(const v of data)hash=Math.imul(hash^v,16777619);
 return {hash:hash>>>0,calls:window.processCalls,ms:elapsed};
 });
 if(version!=='legacy'){
 const stress=await page.evaluate(async()=>{
 const t=tiles[0];selected=t.id;update();window.drawCalls=0;
 const start=performance.now();for(let i=0;i<500;i++)$('copy').click();
 const elapsed=performance.now()-start;
 const pending=tiles.at(-1);for(let i=0;i<100;i++){$('tile-color').value='#'+(0x123400+i).toString(16);$('tile-color').dispatchEvent(new Event('input'));}
 $('copy').click(); // Must flush the final color before copying.
 const correct=tiles.at(-1).color==='#123463'&&tiles.at(-1).coloredCanvas===pending.coloredCanvas;
 await new Promise(requestAnimationFrame);
 const colorCount=new Set(tiles.map(t=>t.coloredCanvas).filter(Boolean)).size;
 const assets=new Set(tiles.map(t=>t.asset));window.confirm=()=>true;$('reset').click();
 return {elapsed,correct,colorCount,drawCalls:window.drawCalls,cleared:[...assets].every(a=>a.colors.size===0)};
 });assert.ok(stress.correct&&stress.cleared);assert.ok(stress.colorCount<=3);assert.ok(stress.drawCalls<=2);outcome.stress=stress;
 }
 results.push({input:input.name,version,loadMs,...outcome,background,pngHash:digest});snapshots.push({source:outcome.sourceHash,color:outcome.coloredHash,board:outcome.boardHash,png:digest,background:background.hash});
 assert.deepEqual(errors,[]);await page.close();
 }
 assert.deepEqual(snapshots[1],snapshots[0]);assert.deepEqual(snapshots[2],snapshots[0]);
 }
 fs.writeFileSync('/private/tmp/tiling-performance.json',JSON.stringify(results,null,2));console.log(JSON.stringify(results,null,2));
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
