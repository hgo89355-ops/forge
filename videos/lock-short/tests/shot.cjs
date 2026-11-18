const { chromium } = require('playwright');
(async()=>{ const [file,out,w,h]=process.argv.slice(2); const b=await chromium.launch(); const p=await b.newPage({viewport:{width:+w,height:+h}});
p.on('pageerror',e=>console.log('ERR',e.message)); await p.goto('file://'+require('path').resolve(file)); await p.waitForTimeout(300); await p.screenshot({path:out}); await b.close();})();
