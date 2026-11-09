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
  for(const phase of ['before','after']){
   const page=await browser.newPage({viewport:{width:390,height:844},deviceScaleFactor:1});
   await page.route('**/*',route=>route.request().url().startsWith('file:')?route.continue():route.abort());
   await page.goto(pathToFileURL(path.resolve(phase,'phone.html')).href);
   await page.screenshot({path:`shots/${phase}-phone-390x844.png`});
   if(phase==='after'){
    const row=await page.locator('#composer textarea,#composer .photo-pick,#composer .voice-mic,#composer .voice-talk-menu summary,#composer .send').evaluateAll(nodes=>nodes.map(n=>{
     const r=n.getBoundingClientRect();return {tag:n.tagName,x:r.x,y:r.y,width:r.width,height:r.height};
    }));
    assert.equal(new Set(row.map(r=>Math.round(r.y))).size,1);
    assert.ok(row.find(r=>r.tag==='TEXTAREA').width>=140);
    assert.ok(row.every(r=>r.x>=0&&r.x+r.width<=390));
    assert.equal(await page.locator('#composer #chat-speech').count(),0);
    assert.equal(await page.locator('#chat-speech').isVisible(),false);
    await page.locator('.chat-options summary').click();
    assert.equal(await page.locator('#chat-speech').isVisible(),true);
    await page.screenshot({path:'shots/after-phone-menu-390x844.png'});
    await page.locator('.chat-options summary').click();
    await page.locator('.voice-talk-menu summary').click();
    assert.equal(await page.getByRole('button',{name:'Start conversation'}).isVisible(),true);
    await page.screenshot({path:'shots/after-phone-conversation-390x844.png'});
    fs.writeFileSync('shots/after-phone-390x844.json',JSON.stringify(row,null,2));
   }
   await page.close();
  }
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
