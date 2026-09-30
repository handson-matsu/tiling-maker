const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const {pathToFileURL}=require('node:url');
const path=require('node:path');
(async()=>{
 const browser=await chromium.launch({headless:true,channel:'chrome'});
 try {
 const page=await browser.newPage({timezoneId:'Asia/Tokyo',acceptDownloads:true});
 await page.addInitScript(()=>{window.fetch=()=>Promise.resolve();});
 await page.clock.install({time:new Date('2026-01-01T18:04:00Z')});
 await page.goto(pathToFileURL(path.resolve(__dirname,'../index.html')).href);
 assert.ok(await page.locator('#copy').isDisabled());
 await page.evaluate(()=>{original=new ImageData(100,80);original.data.fill(255);processImage();});
 await page.locator('#add').click();
 assert.ok(await page.evaluate(()=>Math.abs(tiles[0].w-180*1.2**3)<1e-8&&tiles[0].scale===1));
 await page.locator('#grow').click();assert.equal(await page.evaluate(()=>tiles[0].scale),1.2);
 await page.locator('#shrink').click();assert.equal(await page.evaluate(()=>tiles[0].scale),1);
 await page.locator('#grow').click();await page.locator('#right').click();await page.locator('#flip').click();await page.locator('#tile-color').fill('#3889dc');
 const before=await page.evaluate(()=>tiles[0].coloredCanvas.toDataURL());
 await page.locator('#copy').click();
 assert.ok(await page.evaluate(()=>{
 const [a,b]=tiles;return selected===b.id&&a.id!==b.id&&a.asset===b.asset&&a.coloredCanvas!==b.coloredCanvas&&a.coloredCanvas.toDataURL()===b.coloredCanvas.toDataURL()&&b.x===a.x+24&&b.y===a.y+24&&['w','h','scale','angle','flip','color'].every(k=>a[k]===b[k]);
 }));
 await page.locator('#tile-color').fill('#e85d45');
 assert.equal(await page.evaluate(()=>tiles[0].coloredCanvas.toDataURL()),before);
 await page.locator('#color-reset').click();assert.equal(await page.evaluate(()=>tiles[0].color),'#3889dc');
 const download=page.waitForEvent('download');await page.locator('#save').click();
 assert.equal((await download).suggestedFilename(),'my-tiling-2026-01-02-0304.png');
 await page.evaluate(()=>{tiles[1].x=1200;tiles[1].y=800;});await page.locator('#copy').click();
 assert.ok(await page.evaluate(()=>tiles[2].x!==tiles[1].x&&tiles[2].y!==tiles[1].y));
 await page.locator('#delete').click();assert.ok(await page.locator('#copy').isDisabled());
 console.log('PASS: larger default, unchanged scaling, full-state independent copy, offset/selection, local padded filename, edge offset, disabled copy.');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
