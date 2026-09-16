'use strict';
const $ = id => document.getElementById(id);
const source = $('source'), processed = $('processed'), board = $('board');
const sctx = source.getContext('2d', { willReadFrequently: true });
const pctx = processed.getContext('2d', { willReadFrequently: true });
const ctx = board.getContext('2d');
let original = null, background = null, tileAsset = null, tiles = [], selected = null;
// Earlier clicks are committed; the slider recalculates only the latest fill.
let committedPixels = null, activeSeed = null;
let drag = null, sequence = 0, loadSequence = 0, downloadUrl = null;
const controls = ['left', 'right', 'flip', 'grow', 'shrink', 'delete'];
function status(message) { $('status').textContent = message; }
function update() {
  const tile = tiles.find(t => t.id === selected);
  controls.forEach(id => $(id).disabled = !tile);
  $('tile-color').disabled = !tile;
  $('color-reset').disabled = !tile || !tile.color;
  $('tile-color').value = tile?.color || '#e85d45';
  $('tile-color-state').textContent = tile?.color || '元の色';
  document.querySelectorAll('[data-tile-color]').forEach(button => {
    button.disabled = !tile;
    button.setAttribute('aria-pressed', String(tile?.color === button.dataset.tileColor));
  });
  $('grow').disabled = !tile || tile.scale >= 5;
  $('shrink').disabled = !tile || tile.scale <= .2;
  $('reset').disabled = $('save').disabled = $('next').disabled = tiles.length === 0;
  $('count').textContent = `${tiles.length} 枚`;
  $('board-empty').hidden = tiles.length > 0;
  $('selection-label').textContent = tile ? `選択中：${tile.angle}° / ${Math.round(tile.scale * 100)}%${tile.flip ? ' / 反転' : ''}` : 'タイルを選ぶと編集できます';
  draw();
}
function paintTile(context, tile) {
  context.save(); context.translate(tile.x, tile.y); context.rotate(tile.angle * Math.PI / 180);
  context.scale(tile.scale * (tile.flip ? -1 : 1), tile.scale);
  context.drawImage(tile.coloredCanvas || tile.asset.canvas, -tile.w / 2, -tile.h / 2, tile.w, tile.h); context.restore();
}
// Tint from the immutable source on every change: no cumulative color degradation.
// Original luminance modulates the chosen color; alpha and dark ink are retained.
function setTileColor(tile, color) {
  tile.color = color;
  if (!color) { tile.coloredCanvas = null; return; }
  const canvas = tile.coloredCanvas || document.createElement('canvas');
  canvas.width = tile.asset.canvas.width; canvas.height = tile.asset.canvas.height;
  const pixels = new ImageData(new Uint8ClampedArray(tile.asset.pixels), canvas.width, canvas.height);
  const rgb = [1, 3, 5].map(start => parseInt(color.slice(start, start + 2), 16));
  for (let i = 0; i < pixels.data.length; i += 4) {
    const d = pixels.data;
    if (!d[i + 3]) continue;
    const luminance = .2126 * d[i] + .7152 * d[i + 1] + .0722 * d[i + 2];
    // Keep dark strokes unchanged; retain 35% of the source for a softer tint.
    const amount = .65 * Math.max(0, Math.min(1, (luminance - 40) / 40));
    for (let channel = 0; channel < 3; channel++) {
      d[i + channel] = Math.round(d[i + channel] * (1 - amount) + rgb[channel] * luminance / 255 * amount);
    }
  }
  canvas.getContext('2d').putImageData(pixels, 0, 0);
  tile.coloredCanvas = canvas;
}
function draw() {
  ctx.clearRect(0, 0, board.width, board.height);
  tiles.forEach(tile => paintTile(ctx, tile));
  const tile = tiles.find(t => t.id === selected);
  if (tile) {
    ctx.save(); ctx.translate(tile.x, tile.y); ctx.rotate(tile.angle * Math.PI / 180);
    ctx.strokeStyle = '#177c70'; ctx.lineWidth = 3; ctx.setLineDash([9, 6]);
    ctx.strokeRect(-tile.w * tile.scale / 2 - 4, -tile.h * tile.scale / 2 - 4, tile.w * tile.scale + 8, tile.h * tile.scale + 8); ctx.restore();
  }
}
// Iterative four-neighbour fill avoids recursion limits on large photos.
function floodFill(pixels, seed, color, threshold) {
  const { width, height, data } = pixels;
  const visited = new Uint8Array(width * height);
  const queue = new Int32Array(width * height);
  const limit = 3 * threshold * threshold;
  let head = 0, tail = 0;
  function enqueue(index) {
    if (visited[index]) return;
    visited[index] = 1;
    const i = index * 4;
    if (data[i + 3] === 0) return;
    const distance = (data[i] - color[0]) ** 2 + (data[i + 1] - color[1]) ** 2 + (data[i + 2] - color[2]) ** 2;
    if (distance > limit) return;
    queue[tail++] = index;
  }
  enqueue(seed.y * width + seed.x);
  while (head < tail) {
    const index = queue[head++], x = index % width;
    data[index * 4 + 3] = 0;
    if (x > 0) enqueue(index - 1);
    if (x + 1 < width) enqueue(index + 1);
    if (index >= width) enqueue(index - width);
    if (index + width < width * height) enqueue(index + width);
  }
}
function processImage() {
  if (!original) return;
  const pixels = new ImageData(new Uint8ClampedArray((committedPixels || original).data), original.width, original.height);
  const threshold = Number($('threshold').value);
  if (activeSeed) floodFill(pixels, activeSeed, background, threshold);
  let minX = pixels.width, minY = pixels.height, maxX = -1, maxY = -1;
  for (let i = 0; i < pixels.data.length; i += 4) {
    const d = pixels.data;
    if (d[i+3] > 0) {
      const x = (i/4) % pixels.width, y = Math.floor(i/4/pixels.width);
      minX = Math.min(minX,x); maxX = Math.max(maxX,x); minY = Math.min(minY,y); maxY = Math.max(maxY,y);
    }
  }
  processed.width = pixels.width; processed.height = pixels.height;
  sctx.putImageData(pixels,0,0);
  pctx.putImageData(pixels,0,0); processed.classList.add('ready'); $('empty-result').hidden = true;
  if (maxX < 0) {
    tileAsset = null; $('add').disabled = true;
    status('すべて透明になりました。強さを下げるか、背景削除をやり直してください。'); return;
  }
  const canvas = document.createElement('canvas'); canvas.width = maxX-minX+1; canvas.height = maxY-minY+1;
  const context = canvas.getContext('2d', { willReadFrequently: true });
  context.drawImage(processed,minX,minY,canvas.width,canvas.height,0,0,canvas.width,canvas.height);
  tileAsset = { canvas, pixels: context.getImageData(0,0,canvas.width,canvas.height).data };
  $('add').disabled = false;
}
$('upload').addEventListener('change', async event => {
  const file = event.target.files[0]; if (!file) return;
  const request = ++loadSequence; const url = URL.createObjectURL(file);
  status('写真を読み込んでいます…');
  try {
    const image = new Image(); image.src = url; await image.decode();
    if (request !== loadSequence) return;
    const ratio = Math.min(1, 1400 / Math.max(image.naturalWidth,image.naturalHeight));
    source.width = Math.max(1,Math.round(image.naturalWidth*ratio)); source.height = Math.max(1,Math.round(image.naturalHeight*ratio));
    sctx.drawImage(image,0,0,source.width,source.height);
    original = sctx.getImageData(0,0,source.width,source.height); background = null;
    committedPixels = null; activeSeed = null;
    source.classList.add('ready'); $('empty-source').hidden = true;
    $('threshold').value = 40; $('threshold-value').value = 40; $('threshold').disabled = true;
    $('restore').disabled = false; $('swatch').style.background = '#f1f2ef'; $('color-label').textContent = '背景色は未選択';
    processImage(); status('読み込みました。上の写真の背景をタップしてください。');
  } catch (error) { if (request === loadSequence) status('この画像を開けませんでした。JPEGまたはPNGに変換して、もう一度選んでください。'); }
  finally { URL.revokeObjectURL(url); event.target.value = ''; }
});
source.addEventListener('click', event => {
  if (!original) return;
  const rect = source.getBoundingClientRect();
  const x = Math.max(0,Math.min(source.width-1,Math.floor((event.clientX-rect.left)*source.width/rect.width)));
  const y = Math.max(0,Math.min(source.height-1,Math.floor((event.clientY-rect.top)*source.height/rect.height)));
  const i = (y*source.width+x)*4;
  const current = pctx.getImageData(0,0,source.width,source.height);
  if (current.data[i+3] === 0) {
    status('ここはすでに透明です。残っている背景をタップしてください。'); return;
  }
  committedPixels = current;
  activeSeed = { x, y };
  background = Array.from(current.data.slice(i,i+3));
  $('swatch').style.background = `rgb(${background.join(',')})`; $('color-label').textContent = `背景色：RGB ${background.join(', ')}`;
  $('threshold').disabled = false; status('つながった背景を透明にしました。残った背景は追加でタップして消せます。'); processImage();
});
$('threshold').addEventListener('input', () => {
  $('threshold-value').value = $('threshold').value; status('最後にタップした領域の強さを変更しました。'); processImage();
});
$('restore').addEventListener('click', () => {
  committedPixels = null; activeSeed = null;
  background = null; $('threshold').disabled = true; $('swatch').style.background = '#f1f2ef'; $('color-label').textContent = '背景色は未選択';
  processImage(); status('元の画像に戻しました。背景をもう一度タップしてください。');
});
$('add').addEventListener('click', () => {
  if (!tileAsset) return;
  const size = 180 / Math.max(tileAsset.canvas.width,tileAsset.canvas.height);
  const offset = (tiles.length % 8)*22;
  const tile = { id: ++sequence, asset: tileAsset, x: board.width/2-70+offset, y: board.height/2-70+offset, w: tileAsset.canvas.width*size, h: tileAsset.canvas.height*size, angle:0, flip:false, scale:1, color:null, coloredCanvas:null };
  tiles.push(tile); selected = tile.id; update(); status('タイルを追加しました。ドラッグして好きな場所に動かしましょう。');
});
function point(event) { const r = board.getBoundingClientRect(); return { x:(event.clientX-r.left)*board.width/r.width, y:(event.clientY-r.top)*board.height/r.height }; }
function hit(tile,p) {
  const a = -tile.angle*Math.PI/180, dx = p.x-tile.x, dy = p.y-tile.y;
  const x = (dx*Math.cos(a)-dy*Math.sin(a))/tile.scale*(tile.flip?-1:1)+tile.w/2;
  const y = (dx*Math.sin(a)+dy*Math.cos(a))/tile.scale+tile.h/2;
  if (x<0 || y<0 || x>=tile.w || y>=tile.h) return false;
  const px = Math.floor(x/tile.w*tile.asset.canvas.width), py = Math.floor(y/tile.h*tile.asset.canvas.height);
  return tile.asset.pixels[(py*tile.asset.canvas.width+px)*4+3]>0;
}
board.addEventListener('pointerdown', event => {
  if (drag || !event.isPrimary || event.button !== 0) return;
  const p = point(event), tile = [...tiles].reverse().find(t=>hit(t,p));
  selected = tile ? tile.id : null;
  if (tile) { drag = { id:event.pointerId, tile, dx:p.x-tile.x, dy:p.y-tile.y }; board.setPointerCapture(event.pointerId); board.style.cursor = 'grabbing'; }
  board.focus({preventScroll:true}); update();
});
board.addEventListener('pointermove', event => {
  if (!drag || event.pointerId !== drag.id) return;
  const p = point(event); drag.tile.x = Math.max(0,Math.min(board.width,p.x-drag.dx)); drag.tile.y = Math.max(0,Math.min(board.height,p.y-drag.dy)); draw();
});
function endDrag(event) { if (drag && event.pointerId === drag.id) { drag=null; board.style.cursor='default'; } }
['pointerup','pointercancel','lostpointercapture'].forEach(name=>board.addEventListener(name,endDrag));
function edit(action) { const tile = tiles.find(t=>t.id===selected); if (!tile) return; action(tile); update(); }
$('tile-color').addEventListener('input', event => edit(tile => setTileColor(tile, event.target.value)));
$('color-reset').onclick = () => edit(tile => setTileColor(tile, null));
document.querySelectorAll('[data-tile-color]').forEach(button => {
  button.onclick = () => edit(tile => setTileColor(tile, button.dataset.tileColor));
});
$('left').onclick = () => edit(t=>t.angle=(t.angle+330)%360);
$('right').onclick = () => edit(t=>t.angle=(t.angle+30)%360);
$('flip').onclick = () => edit(t=>t.flip=!t.flip);
$('grow').onclick = () => edit(t=>t.scale=Math.min(5,t.scale*1.2));
$('shrink').onclick = () => edit(t=>t.scale=Math.max(.2,t.scale/1.2));
$('delete').onclick = () => edit(t=>{ tiles=tiles.filter(v=>v.id!==t.id); selected=null; status('選択したタイルを削除しました。'); });
$('next').onclick = () => { if (!tiles.length) return; const index=tiles.findIndex(t=>t.id===selected); selected=tiles[(index+1)%tiles.length].id; update(); };
board.addEventListener('keydown',event=>{
  if (!selected || !['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Delete','Backspace'].includes(event.key)) return;
  event.preventDefault();
  if (['Delete','Backspace'].includes(event.key)) { $('delete').click(); return; }
  const step=event.shiftKey?20:5;
  edit(t=>{t.x=Math.max(0,Math.min(board.width,t.x+(event.key==='ArrowLeft'?-step:event.key==='ArrowRight'?step:0))); t.y=Math.max(0,Math.min(board.height,t.y+(event.key==='ArrowUp'?-step:event.key==='ArrowDown'?step:0)));});
});
$('reset').onclick = () => {
  if (!tiles.length || !window.confirm('配置したタイルをすべて消しますか？ 読み込んだ写真は残ります。')) return;
  tiles=[]; selected=null; drag=null; update(); status('制作エリアをリセットしました。');
};
$('save').onclick = () => {
  if (!tiles.length) return;
  const output = document.createElement('canvas'); output.width=board.width; output.height=board.height;
  const context = output.getContext('2d'); context.fillStyle='#ffffff'; context.fillRect(0,0,output.width,output.height);
  tiles.forEach(t=>paintTile(context,t));
  output.toBlob(blob=>{
    if (!blob) {status('画像を保存できませんでした。もう一度お試しください。');return;}
    if (downloadUrl) URL.revokeObjectURL(downloadUrl);
    downloadUrl=URL.createObjectURL(blob);
    const a=document.createElement('a'); a.href=downloadUrl; a.download=`my-tiling-${new Date().toISOString().slice(0,10)}.png`; document.body.append(a); a.click(); a.remove();
    $('download-link').href=downloadUrl; $('download-fallback').hidden=false;
    status('PNG画像を書き出しました（1200 × 800）。保存先をご確認ください。');
  },'image/png');
};
update();
