const {chromium}=require('playwright');
const {pathToFileURL}=require('node:url');
const path=require('node:path');
const fs=require('node:fs');
const assert=require('node:assert/strict');
(async()=>{
 fs.mkdirSync('shots',{recursive:true});
 const browser=await chromium.launch({headless:true});
 try {
  for(const phase of ['before','after'])for(const [width,height] of [[1280,800],[390,844]]){
   const page=await browser.newPage({viewport:{width,height},deviceScaleFactor:1});
   await page.route('**/*',route=>route.request().url().startsWith('file:')?route.continue():route.abort());
   await page.goto(pathToFileURL(path.resolve(phase,'index.html')).href);
   await page.screenshot({path:`shots/${phase}-${width}x${height}.png`});
   const controls=await page.locator('#composer .btns button').evaluateAll(nodes=>nodes.map(n=>{
    const r=n.getBoundingClientRect();return{text:n.textContent.trim()||'Microphone',x:r.x,y:r.y,width:r.width,height:r.height};
   }));
   fs.writeFileSync(`shots/${phase}-${width}x${height}.json`,JSON.stringify(controls,null,2));
   if(phase==='after'){
    assert.equal(controls.length,5);
    assert.deepEqual(controls.map(x=>x.text),['+ Attach','Microphone','Start conversation','Paste only','Send ➤']);
    for(const r of controls){assert.equal(r.height,44);assert.ok(r.x>=0&&r.x+r.width<=width);}
    assert.ok(new Set(controls.map(r=>Math.round(r.y))).size<=(width===390?2:1));
   }
   await page.close();
  }
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
