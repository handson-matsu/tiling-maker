const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
(async () => {
 const browser = await chromium.launch({channel:'chrome', headless:true});
 try {
  for (const file of ['index.html', 'gas/index.html']) {
   const page = await browser.newPage({viewport:{width:390,height:844}, isMobile:true, hasTouch:true});
   const errors=[]; page.on('pageerror', e=>errors.push(e.message));
   await page.goto(pathToFileURL(path.resolve(__dirname,'..',file)).href);
   await page.evaluate(() => {
    original = new ImageData(100,100); original.data.fill(255);
    // A transparent hole must remain untouchable after rotation/flip/viewport changes.
    for(let y=40;y<60;y++) for(let x=40;x<60;x++) original.data[(y*100+x)*4+3]=0;
    processImage(); $('add').click();
    tiles[0].x=600; tiles[0].y=400; tiles[0].angle=30; tiles[0].flip=true;
    setTileColor(tiles[0], '#abcdef'); update();
   });
   const initial=await page.evaluate(()=>({x:tiles[0].x,y:tiles[0].y,angle:tiles[0].angle,flip:tiles[0].flip,color:tiles[0].color,scale:tiles[0].scale}));
   async function tapTile(hole=false) {
    await page.locator('#board').scrollIntoViewIfNeeded();
    const p=await page.evaluate(hole=>{
     const t=tiles[0],a=t.angle*Math.PI/180,u=hole?0:-t.w*.3*t.scale,r=board.getBoundingClientRect();
     return {x:r.left+(t.x+u*Math.cos(a))/board.width*r.width,y:r.top+(t.y+u*Math.sin(a))/board.height*r.height};
    },hole);
    await page.touchscreen.tap(p.x,p.y);
   }
   for(let i=0;i<6;i++) {
    // Simulate an interrupted drag whose pointerup/cancel was never delivered.
    await page.evaluate(()=>{drag={id:99,tile:tiles[0],dx:1,dy:1};});
    await page.setViewportSize(i%2?{width:390,height:844}:{width:844,height:390});
    await page.waitForFunction(()=>drag===null);
    await tapTile(true); assert.equal(await page.evaluate(()=>selected),null);
    await tapTile(); assert.equal(await page.evaluate(()=>selected),1);
    assert.equal(await page.evaluate(()=>drag),null);
   }
   assert.deepEqual(await page.evaluate(()=>({x:tiles[0].x,y:tiles[0].y,angle:tiles[0].angle,flip:tiles[0].flip,color:tiles[0].color,scale:tiles[0].scale})),initial);
   // Fresh primary touch recovers even with no resize notification.
   await page.evaluate(()=>{selected=null;drag={id:99,tile:tiles[0],dx:0,dy:0};});
   await tapTile(); assert.equal(await page.evaluate(()=>selected),1);
   // Orientation notification alone and outside-canvas pointerup also terminate gestures.
   for(const type of ['orientationchange','blur','pointerup','pointercancel']) {
    await page.evaluate(type=>{drag={id:99,tile:tiles[0],dx:0,dy:0};window.dispatchEvent(type.startsWith('pointer')?new PointerEvent(type,{pointerId:99}):new Event(type));},type);
    assert.equal(await page.evaluate(()=>drag),null);
   }
   // Next changes selection/redraw, not geometry or the hit-test data.
   const next=await page.evaluate(async()=>{
    $('copy').click();const before=tiles.map(t=>[t.x,t.y,t.angle,t.flip,t.scale,t.color]);
    let count=0;const real=draw;draw=()=>{count++;real();};$('next').click();await new Promise(requestAnimationFrame);
    return {selected,before,after:tiles.map(t=>[t.x,t.y,t.angle,t.flip,t.scale,t.color]),count};
   });
   assert.equal(next.selected,1);assert.deepEqual(next.before,next.after);assert.equal(next.count,1);
   assert.deepEqual(errors,[]); await page.close(); console.log('PASS orientation / touch recovery:',file);
  }
 } finally { await browser.close(); }
})().catch(e=>{console.error(e);process.exitCode=1;});
