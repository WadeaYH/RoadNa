import {createRequire} from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
const require=createRequire(import.meta.url);
const {chromium}=require('C:/Users/user/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const browser=await chromium.launch({channel:'msedge',headless:true,args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const folder=path.resolve('.verification/account-review');fs.mkdirSync(folder,{recursive:true});
const screens=fs.readdirSync('screens',{withFileTypes:true}).filter(d=>d.isDirectory()).map(d=>d.name);
const output=[];
for(const width of [1280,375]){
  const context=await browser.newContext({viewport:{width,height:900},reducedMotion:'reduce'});
  const page=await context.newPage();
  for(const screen of screens){
    const errors=[];const onError=e=>errors.push(e.message);page.on('pageerror',onError);
    try{
      const suffix=screen==='city-world'?'?view=ops&role=supervisor':'';
      const response=await page.goto('http://127.0.0.1:4174/screens/'+screen+'/index.html'+suffix,{waitUntil:'domcontentloaded',timeout:20000});
      if(screen==='city-world')await page.waitForFunction(()=>window.RoadNaCityWorldOps||document.querySelector('.cw-fallback')?.offsetHeight,{timeout:20000});
      if(screen==='landing-page')await page.waitForTimeout(1200);
      await page.waitForTimeout(180);
      const state=await page.evaluate(()=>{
        const shown=e=>e.getClientRects().length&&!e.closest('[hidden]')&&getComputedStyle(e).visibility!=='hidden';
        const ids=[...document.querySelectorAll('[id]')].map(e=>e.id);
        return {width:innerWidth,scrollWidth:document.documentElement.scrollWidth,h1:[...document.querySelectorAll('h1')].filter(shown).map(e=>e.textContent.trim()),brokenImages:[...document.images].filter(i=>new URL(i.src).origin===location.origin&&(!i.complete||!i.naturalWidth)).map(i=>i.getAttribute('src')),externalImagesPending:[...document.images].filter(i=>new URL(i.src).origin!==location.origin&&(!i.complete||!i.naturalWidth)).length,duplicateIds:ids.filter((id,i)=>ids.indexOf(id)<i),missingSymbols:[...document.querySelectorAll('use[href^="#"]')].filter(e=>!document.getElementById(e.getAttribute('href').slice(1))).map(e=>e.getAttribute('href'))};
      });
      output.push({screen,width,status:response.status(),errors,...state});
      console.log(width,screen,errors.length ? errors : 'OK');
      if(['landing-page','city-world'].includes(screen))await page.screenshot({path:path.join(folder,`${screen}-${width}.png`),fullPage:false});
    }catch(e){output.push({screen,width,errors:[...errors,e.message]});}
    page.off('pageerror',onError);
    fs.writeFileSync(path.join(folder,'project-scan.json'),JSON.stringify(output,null,2));
  }
  await context.close();
}
fs.writeFileSync(path.join(folder,'project-scan.json'),JSON.stringify(output,null,2));
const failed=output.filter(r=>r.errors.length||r.status!==200||r.scrollWidth>r.width+1||r.brokenImages?.length||r.duplicateIds?.length||r.missingSymbols?.length);
console.log(JSON.stringify({pages:output.length,failed},null,2));
await browser.close();
