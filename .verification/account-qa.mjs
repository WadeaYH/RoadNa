import {createRequire} from 'node:module';
import fs from 'node:fs';
import assert from 'node:assert/strict';
const require=createRequire(import.meta.url);
const {chromium}=require('C:/Users/user/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const out='.verification/account-review/formal'; fs.mkdirSync(out,{recursive:true});
const browser=await chromium.launch({channel:'msedge',headless:true});
const page=await browser.newPage();
const errors=[],checks=[]; page.on('pageerror',e=>errors.push(e.message));
const url=(screen,suffix='')=>'http://127.0.0.1:4174/screens/'+screen+'/index.html'+suffix;
for(const [width,height] of [[1440,900],[1280,720],[1024,768],[768,1024],[375,812],[320,740]]){
  await page.setViewportSize({width,height});
  for(const screen of ['login','register']){
    await page.goto(url(screen),{waitUntil:'domcontentloaded'});
    await page.locator('form button[type=submit]').waitFor({state:'visible'});
    assert.ok(await page.locator('[data-account-form]').isVisible());
    const layout=await page.evaluate(()=>({width:innerWidth,scrollWidth:document.documentElement.scrollWidth,canvases:document.querySelectorAll('canvas').length,animations:document.getAnimations().length,graphics:performance.getEntriesByType('resource').filter(e=>/three|office|cityworld/i.test(e.name)).map(e=>e.name),brokenImages:[...document.images].filter(i=>!i.complete||i.naturalWidth===0).map(i=>i.src)}));
    assert.equal(layout.scrollWidth,width);assert.equal(layout.canvases,0);assert.equal(layout.animations,0);assert.deepEqual(layout.graphics,[]);assert.deepEqual(layout.brokenImages,[]);
    checks.push({screen,...layout});
    await page.screenshot({path:`${out}/${screen}-${width}.png`,fullPage:true});
  }
}
await page.goto(url('register'));
await page.getByRole('button',{name:'Create Account',exact:true}).click();
assert.equal(await page.locator('[aria-invalid=true]').count(),5);assert.equal(await page.evaluate(()=>document.activeElement.id),'full-name');
await page.locator('#full-name').fill('Omar Haddad');await page.locator('#email').fill('omar@example.com');
await page.locator('#password').fill('short');await page.locator('#confirm-password').fill('short');await page.locator('#certify').check();
await page.getByRole('button',{name:'Create Account',exact:true}).click();assert.match(await page.locator('#password-error').innerText(),/8 characters/);
await page.locator('#password').fill('example-password');await page.locator('#confirm-password').fill('different-password');
await page.getByRole('button',{name:'Create Account',exact:true}).click();assert.match(await page.locator('#confirm-password-error').innerText(),/do not match/);
assert.equal(await page.locator('#full-name').inputValue(),'Omar Haddad');assert.ok(await page.locator('[data-account-form]').isVisible());
await page.getByRole('button',{name:'Show password',exact:true}).first().click();assert.equal(await page.locator('#password').getAttribute('type'),'text');
assert.equal(await page.getByRole('button',{name:'Hide password',exact:true}).innerText(),'Hide');
await page.locator('#confirm-password').fill('example-password');await page.getByRole('button',{name:'Create Account',exact:true}).click();
await page.waitForURL('**/login/index.html');
assert.match(await page.getByRole('link',{name:'Forgot password?',exact:true}).getAttribute('href'),/forgot-password/);
for(const role of ['resident','staff']){
  await page.goto(url('login'));
  await page.getByRole('button',{name:'Log In',exact:true}).click();assert.equal(await page.locator('[aria-invalid=true]').count(),2);
  await page.locator('#email').fill('omar@example.com');await page.locator('#password').fill('example-password');
  await page.locator(`[name=account][value=${role}]`).check();await page.getByRole('button',{name:'Log In',exact:true}).click();
  await page.waitForURL(role==='staff'?'**/admin-dashboard/index.html':'**/home-menu/index.html',{waitUntil:'domcontentloaded'});
}
await page.goto(url('login'));await page.getByRole('link',{name:'Create an account',exact:true}).click();await page.waitForURL('**/register/index.html');
await page.locator('.skip-link').focus();await page.keyboard.press('Enter');assert.equal(await page.evaluate(()=>document.activeElement.id),'registration');
await page.goto(url('login'));await page.locator('[name=account][value=resident]').focus();await page.keyboard.press('ArrowRight');assert.equal(await page.locator('[name=account]:checked').inputValue(),'staff');
await page.locator('.demo-access summary').click();assert.equal(await page.locator('.demo-access__actions a').count(),4);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth),320);
await page.emulateMedia({reducedMotion:'reduce'});await page.goto(url('register','?office=animated-v3#registration'));assert.ok(await page.locator('[data-account-form]').isVisible());assert.equal(await page.locator('canvas').count(),0);
const noGL=await browser.newPage();await noGL.addInitScript(()=>{window.canvasCalls=0;HTMLCanvasElement.prototype.getContext=()=>{window.canvasCalls++;return null;};});
await noGL.goto(url('register'));assert.ok(await noGL.locator('[data-account-form]').isVisible());assert.equal(await noGL.evaluate(()=>window.canvasCalls),0);
const noJS=await browser.newPage({javaScriptEnabled:false});
for(const screen of ['register','login']){await noJS.goto(url(screen));assert.ok(await noJS.locator('[data-account-form]').isVisible());assert.ok(await noJS.locator('form button[type=submit]').isDisabled());}
assert.deepEqual(errors,[]);fs.writeFileSync(`${out}/results.json`,JSON.stringify({checks,errors},null,2));
console.log('PASS: both formal forms at six sizes, no motion or graphics resources, validation, password visibility, resident/staff routing, recovery, keyboard navigation, preview links, no WebGL, no JavaScript.',JSON.stringify({checks,errors}));
await browser.close();

