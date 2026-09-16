const { chromium } = require('playwright');
const assert = require('node:assert/strict');
(async () => {
  const browser = await chromium.launch({ headless:true, channel:'chrome' });
  try {
    const page = await browser.newPage({ viewport:{width:1280,height:1000}, acceptDownloads:true });
    const errors=[]; page.on('pageerror',error=>errors.push(error.message));
    await page.goto('http://127.0.0.1:8000');
    assert.equal(await page.locator('#tile-color').isDisabled(),true);
    const png = await page.evaluate(() => {
      const c=document.createElement('canvas'); c.width=c.height=100; const x=c.getContext('2d');
      x.fillStyle='white';x.fillRect(0,0,100,100);x.fillStyle='#202020';x.fillRect(10,10,80,80);
      x.fillStyle='#edbd86';x.fillRect(15,15,70,70);
      x.fillStyle='#ffffff';x.fillRect(40,40,20,20);
      x.fillStyle='#999999';x.fillRect(20,20,15,15);
      x.clearRect(70,70,8,8);x.fillStyle='rgba(100,100,100,0.5)';x.fillRect(70,70,4,4);
      return c.toDataURL().split(',')[1];
    });
    await page.locator('#upload').setInputFiles({name:'texture.png',mimeType:'image/png',buffer:Buffer.from(png,'base64')});
    await page.waitForFunction(()=>!!original);await page.locator('#source').click({position:{x:3,y:3}});
    const colors=['#e85d45','#3889dc','#f2cc42','#49a66b',null];
    for (let i=0;i<5;i++) {
      await page.locator('#add').click();
      if (i===0) await page.locator('#tile-color').fill(colors[i]);
      else if(colors[i]) await page.locator(`[data-tile-color="${colors[i]}"]`).click();
      await page.locator('#left').click();await page.locator('#right').click();await page.locator('#right').click();
      await page.locator('#flip').click();await page.locator('#grow').click();await page.locator('#shrink').click();
      await page.locator('#board').scrollIntoViewIfNeeded();
      const r=await page.locator('#board').boundingBox();const t=await page.evaluate(()=>({x:tiles.at(-1).x,y:tiles.at(-1).y}));
      await page.mouse.move(r.x+t.x*r.width/1200,r.y+t.y*r.height/800);await page.mouse.down();
      await page.mouse.move(r.x+(150+i*210)*r.width/1200,r.y+400*r.height/800);await page.mouse.up();
    }
    assert.deepEqual(await page.evaluate(()=>tiles.map(t=>t.color)),colors);
    assert.ok(await page.evaluate(()=>tiles.every(t=>t.angle===30&&t.flip&&t.scale===1)));
    assert.ok(await page.evaluate(()=>tiles.every((t,i)=>Math.abs(t.x-(150+i*210))<2)));
    const checks=await page.evaluate(()=>tiles.slice(0,4).map(t=>{
      const d=t.coloredCanvas.getContext('2d').getImageData(0,0,80,80).data;
      return {alpha:t.asset.pixels.every((v,i)=>i%4!==3||v===d[i]),
        ink:Array.from(d.slice(0,4)),shade:Array.from(d.slice((15*80+15)*4,(15*80+15)*4+3)),
        light:Array.from(d.slice((40*80+40)*4,(40*80+40)*4+3))};
    }));
    for(const c of checks){assert.ok(c.alpha);assert.deepEqual(c.ink,[32,32,32,255]);assert.ok(c.shade.every((v,i)=>v<c.light[i]));}
    // Restore only the selected tile, then recolor it to verify source-based processing.
    await page.locator('#next').click();assert.equal(await page.locator('#tile-color').inputValue(),colors[0]);
    await page.locator('#color-reset').click();
    assert.ok(await page.evaluate(()=>tiles[0].color===null&&tiles[0].coloredCanvas===null));
    assert.equal(await page.evaluate(()=>tiles[1].color),colors[1]);
    await page.locator('#tile-color').fill(colors[0]);
    const downloading=page.waitForEvent('download');await page.locator('#save').click();await downloading;
    const samples=await page.evaluate(async()=>{
      const image=new Image();image.src=downloadUrl;await image.decode();const c=document.createElement('canvas');c.width=image.width;c.height=image.height;const x=c.getContext('2d');x.drawImage(image,0,0);
      // White centers retain their lightness with a 65% tint, even after transforms.
      return tiles.map(t=>Array.from(x.getImageData(Math.round(t.x),Math.round(t.y),1,1).data));
    });
    assert.deepEqual(samples, [[240,150,134,255],[126,178,232,255],[247,222,132,255],[137,197,159,255],[255,255,255,255]]);
    assert.deepEqual(await page.evaluate(()=>tiles.map(t=>t.color)),colors,'chosen colors must remain unchanged');
    // Compare the exported image to the board (white backing, no selection outline).
    assert.ok(await page.evaluate(async()=>{
      selected=null;update();const image=new Image();image.src=downloadUrl;await image.decode();
      const c=document.createElement('canvas');c.width=1200;c.height=800;const x=c.getContext('2d');x.fillStyle='white';x.fillRect(0,0,1200,800);x.drawImage(board,0,0);const display=x.getImageData(0,0,1200,800).data;
      x.clearRect(0,0,1200,800);x.drawImage(image,0,0);const exported=x.getImageData(0,0,1200,800).data;
      return display.every((v,i)=>Math.abs(v-exported[i])<=1);
    }));
    await page.locator('#next').click();await page.locator('#delete').click();assert.equal(await page.evaluate(()=>tiles.length),4);
    await page.screenshot({path:'/private/tmp/tiling-colors.png',fullPage:true});
    await page.setViewportSize({width:390,height:844});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
    assert.deepEqual(errors,[]);console.log('PASS: independent colors, picker/presets, alpha and ink preservation, shading, restore, source-based recoloring, transformed drag, PNG colors/display match, delete, mobile layout.');
  } finally {await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
