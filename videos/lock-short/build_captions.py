import json, re, html
words = json.load(open('assets/transcript.json'))
KEY = {'password','pins','springs','locked','right','line','click','wrong','jams','thousands','ancient','wooden','follow','millimetre','millimeter','gap','cylinder'}
def clean(w):
    w = w.replace('millimeter', 'millimetre')
    return w
PHRASES = ["Your key is","a password","made of metal.","Inside your lock","are tiny pins,","stacked in pairs","and pushed down","by springs.",
"The top pins","cross the gap,","so the cylinder","can't turn.","Locked.","Now slide in","the right key.","Each cut","lifts its pins","to a different height,",
"until every gap","lines up","on one line.","Click.","It turns.","Wrong key?","One pin","less than a millimetre off,","and it jams.","Five or six pins,",
"several heights each:","tens of thousands","of possible keys.","And the idea","is thousands","of years old.","Ancient wooden","pin locks","worked the same way.",
"Follow for more","hidden engineering."]
groups, i = [], 0
for ph in PHRASES:
    toks = ph.split()
    g = []
    for tk in toks:
        w = dict(words[i]); w['text'] = tk; g.append(w); i += 1
    groups.append(g)
assert i == len(words), (i, len(words))
out = []
tl = []
for gi, g in enumerate(groups):
    g0 = max(0.12, g[0]['start'] - 0.05)
    nxt = groups[gi+1][0]['start'] - 0.05 if gi+1 < len(groups) else 38.6
    gend = min(nxt, max(g[-1]['end'] + 0.35, g0 + 0.6))
    if gi == len(groups) - 1: gend = 38.9
    spans = []
    for w in g:
        txt = clean(w['text'])
        bare = re.sub(r"[^a-z']", '', txt.lower())
        cls = 'w k' if bare in KEY else 'w'
        spans.append(f'<span id="cap-{w["id"]}" class="{cls}">{html.escape(txt)}</span>')
        tl.append(f'tl.fromTo("#cap-{w["id"]}", {{ opacity: 0.18, filter: "blur(6px)" }}, {{ opacity: 1, filter: "blur(0px)", duration: 0.13, ease: "power2.out" }}, {max(g0, w["start"] - 0.03):.3f});')
    gid = f'cap-g{gi}'
    out.append(f'    <div id="{gid}" class="clip cap" data-start="{g0:.3f}" data-duration="{gend - g0:.3f}" data-track-index="1"><div class="line">{" ".join(spans)}</div></div>')
    tl.append(f'tl.to("#{gid} .line", {{ opacity: 0, duration: 0.1, ease: "power2.in" }}, {gend - 0.1:.3f}); tl.set("#{gid} .line", {{ opacity: 0, visibility: "hidden" }}, {gend:.3f});')
doc = f'''<template>
  <style>
    #root {{ position: absolute; inset: 0; pointer-events: none; }}
    .cap {{ position: absolute; left: 0; top: 1200px; width: 1080px; height: 130px; overflow: visible; }}
    .cap .line {{ width: 100%; text-align: center; font-family: Inter; font-weight: 900; font-size: 82px; line-height: 110px;
      letter-spacing: -1px; color: #1E1F24;
      text-shadow: 0 0 0 #FFFFFF, 4px 0 0 #FFFFFF, -4px 0 0 #FFFFFF, 0 4px 0 #FFFFFF, 0 -4px 0 #FFFFFF, 3px 3px 0 #FFFFFF, -3px 3px 0 #FFFFFF, 3px -3px 0 #FFFFFF, -3px -3px 0 #FFFFFF, 6px 0 0 #FFFFFF, -6px 0 0 #FFFFFF, 0 6px 0 #FFFFFF, 0 -6px 0 #FFFFFF; }}
    .cap .w {{ display: inline-block; }}
    .cap .k {{ color: #1F4FE0; }}
  </style>
  <div id="root" data-composition-id="captions" data-width="1080" data-height="1920" data-start="0" data-duration="39">
{chr(10).join(out)}
  </div>
  <script>
    const tl = gsap.timeline({{ paused: true }});
    {chr(10).join("    " + l for l in tl)}
    window.__timelines["captions"] = tl;
  </script>
</template>
'''
open('compositions/captions.html', 'w').write(doc)
print(len(groups), 'caption groups'); print(' | '.join(' '.join(w['text'] for w in g) for g in groups))
