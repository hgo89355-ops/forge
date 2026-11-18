const { chromium } = require('playwright');
(async()=>{ const b=await chromium.launch({args:['--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist']});
for (const [i, spec] of process.argv.slice(2).entries()) { const [w,h]=spec.split(',').map(Number); const p=await b.newPage({viewport:{width:w,height:h}});
p.on('pageerror',e=>console.log('ERR',e.message)); await p.goto('file://'+require('path').resolve(__dirname,'esc-still.html')+'#'+spec); await p.waitForFunction(()=>window.__done,null,{timeout:60000});
await p.screenshot({path:`/tmp/claude-0/-home-user-forge/089480d2-2e2f-5ea8-bbcf-9117815b9b97/scratchpad/esc-${i}.png`}); await p.close(); }
await b.close();})();
