const {chromium}=require('playwright'),assert=require('node:assert/strict'),path=require('node:path'),{pathToFileURL}=require('node:url');
(async()=>{const browser=await chromium.launch({headless:true,channel:'chrome'});try{
for(const file of ['index.html','gas/index.html']){
 const page=await browser.newPage({acceptDownloads:true});const errors=[],requests=[];page.on('pageerror',e=>errors.push(e.message));await page.route(/^https?:/,r=>{requests.push(r.request().url());return r.abort();});
 await page.goto(pathToFileURL(path.resolve(__dirname,'..',file)).href);
 const result=await page.evaluate(async()=>{
 const pause=ms=>new Promise(r=>setTimeout(r,ms));
 const frame=()=>new Promise(requestAnimationFrame);
 original=new ImageData(200,160);original.data.fill(255);processImage();$('restore').disabled=false;
 // Burst updates coalesce; continuous slider input still recalculates during the gesture.
 background=[255,255,255];activeSeed={x:0,y:0};
 let processedCount=0;const originalProcess=processImage;processImage=()=>{processedCount++;originalProcess();};
 for(let i=0;i<10;i++){$('threshold').value=20+i;$('threshold').dispatchEvent(new Event('input'));await pause(25);}
 const intermediate=processedCount;
 $('threshold').dispatchEvent(new Event('change'));
 $('threshold').value=80;$('threshold').dispatchEvent(new Event('input'));$('restore').click();await pause(100);
 const restored=pctx.getImageData(0,0,200,160).data.every((v,i)=>v===original.data[i]);
 $('add').click();await frame();await frame();
 let draws=0;const originalDraw=draw;draw=()=>{draws++;originalDraw();};
 drag={id:7,tile:tiles[0],dx:0,dy:0};const rect=board.getBoundingClientRect();
 for(let i=0;i<100;i++)board.dispatchEvent(new PointerEvent('pointermove',{pointerId:7,clientX:rect.left+10+i,clientY:rect.top+30}));
 const x=tiles[0].x;await frame();await frame();const moveDraws=draws;drag=null;
 $('tile-color').value='#abcdef';$('tile-color').dispatchEvent(new Event('input'));$('next').click();
 const latestColor=tiles[0].color;
 // Rapid photo selection: only the latest selection may replace the source; at most one decode.
 let decoding=0,maxDecoding=0,decodes=0;const realDecode=Image.prototype.decode;
 Image.prototype.decode=async function(){decoding++;decodes++;maxDecoding=Math.max(maxDecoding,decoding);try{await pause(30);return await realDecode.call(this);}finally{decoding--;}};
 const files=[];for(const width of [320,640,960]){const c=document.createElement('canvas');c.width=width;c.height=100;c.getContext('2d').fillRect(0,0,width,100);const blob=await new Promise(r=>c.toBlob(r));files.push(new File([blob],'sample.png',{type:'image/png'}));c.width=c.height=0;}
 function load(file){const transfer=new DataTransfer();transfer.items.add(file);$('upload').files=transfer.files;$('upload').dispatchEvent(new Event('change'));}
 load(files[0]);await pause(1);load(files[1]);load(files[2]);await imageLoad;
 return {intermediate,restored,moveDraws,x,expectedX:109*1200/rect.width,latestColor,maxDecoding,decodes,width:source.width};
 });
 assert.ok(result.intermediate>=2&&result.intermediate<10);assert.ok(result.restored);assert.equal(result.moveDraws,1);assert.ok(Math.abs(result.x-result.expectedX)<.001);assert.equal(result.latestColor,'#abcdef');assert.equal(result.maxDecoding,1);assert.equal(result.decodes,2);assert.equal(result.width,960);assert.deepEqual(errors,[]);assert.deepEqual(requests,[]);
 await page.close();console.log('PASS:',file,result);
}
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
