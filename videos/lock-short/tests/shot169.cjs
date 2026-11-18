const { chromium } = require('playwright');
(async()=>{ const b=await chromium.launch({args:['--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist']}); const p=await b.newPage({viewport:{width:1920,height:1080}});
p.on('pageerror',e=>console.log('ERR',e.message));
for (const t of process.argv.slice(2)) { await p.goto('file://'+require('path').resolve('tests/lock-16x9.html')+'#'+t); await p.waitForTimeout(1500); await p.screenshot({path:`deliver/lock-16x9-test-${t}s.png`}); }
await b.close();})();
