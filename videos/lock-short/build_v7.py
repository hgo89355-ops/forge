"""Build the v7 composition (3D guide). usage: python3 build_v7.py <transcript.json> <voice.wav> <tag> from a voice file's word timings.
   python3 build_v6.py assets/transcript_v6.json assets/audio/voice_v6.wav"""
import json, re, sys, html
tr, voice, TAG = sys.argv[1], sys.argv[2], sys.argv[3]
words = json.load(open(tr))
# merge number fragments ("80", ",000") into one caption token
merged = []
for w in words:
    if merged and re.match(r'^[,.]?\d', w['text']) and re.search(r'\d$', merged[-1]['text']):
        merged[-1] = dict(merged[-1], text=merged[-1]['text'] + w['text'].lstrip(), end=w['end'])
    else: merged.append(dict(w))
json.dump([{'text': w['text'], 'start': w['start'], 'end': w['end']} for w in words], open(f'assets/words-{TAG}.json', 'w'))
open(f'assets/words-{TAG}.js', 'w').write('window.FILM_WORDS = ' + json.dumps([{'text': w['text'], 'start': w['start'], 'end': w['end']} for w in words]) + ';\n')
norm = lambda s: re.sub(r'[^a-z]', '', s.lower())
why = [w for w in words if norm(w['text']) == 'why'][-1]
DUR = round((why['end'] + 0.3) * 30) / 30
KEY = {'wrong', 'turn', 'inside', 'pins', 'pin', 'pairs', 'springs', 'block', 'right', 'height', 'gap', 'line', 'click', 'turns', 'millimetre', 'out'}
# caption groups: max 2 words (3 if short), break after punctuation
groups, cur = [], []
for i, w in enumerate(merged):
    cur.append(w)
    nxt = merged[i + 1] if i + 1 < len(merged) else None
    chars = sum(len(x['text']) for x in cur)
    if re.search(r'[.,?!:]$', w['text']) or nxt is None or len(cur) >= 3 or (len(cur) == 2 and chars > 9) or (nxt and nxt['start'] - w['end'] > 0.15):
        groups.append(cur); cur = []
divs, tl = [], []
for gi, g in enumerate(groups):
    g0 = max(0.0, g[0]['start'] - 0.04)
    gend = groups[gi + 1][0]['start'] - 0.04 if gi + 1 < len(groups) else DUR
    spans = []
    for k, w in enumerate(g):
        txt = w['text'].replace('millimeter', 'millimetre')
        if txt == '10': txt = '10'
        cls = 'w k' if norm(txt) in KEY else 'w'
        wid = f'c7-g{gi}-w{k}'
        spans.append(f'<span id="{wid}" class="{cls}">{html.escape(txt)}</span>')
        tl.append(f'tl.fromTo("#{wid}", {{ opacity: 0, scale: 0.7 }}, {{ opacity: 1, scale: 1, duration: 0.12, ease: "back.out(2.2)" }}, {max(g0, w["start"] - 0.02):.3f});')
    divs.append(f'    <div id="c7-g{gi}" class="clip cap" data-start="{g0:.3f}" data-duration="{max(0.1, gend - g0):.3f}" data-track-index="1"><div class="line">{" ".join(spans)}</div></div>')
    tl.append(f'tl.set("#c7-g{gi} .line", {{ opacity: 0, visibility: "hidden" }}, {gend:.3f});')
cap = f'''<template>
  <style>
    #root {{ position: absolute; inset: 0; pointer-events: none; }}
    .cap {{ position: absolute; left: 0; top: 1150px; width: 1080px; height: 170px; overflow: visible; }}
    .cap .line {{ width: 100%; text-align: center; font-family: Inter; font-weight: 900; font-size: 116px; line-height: 150px; letter-spacing: -2px; color: #FFFFFF;
      -webkit-text-stroke: 16px #0B0C0F; paint-order: stroke fill; filter: drop-shadow(0 8px 10px rgba(0,0,0,0.35)); }}
    .cap .w {{ display: inline-block; }}
    .cap .k {{ color: #FFD21F; }}
  </style>
  <div id="root" data-composition-id="captions7" data-width="1080" data-height="1920" data-start="0" data-duration="{DUR}">
{chr(10).join(divs)}
  </div>
  <script>
    const tl = gsap.timeline({{ paused: true }});
    {chr(10).join("    " + l for l in tl)}
    window.__timelines["captions7"] = tl;
  </script>
</template>
'''
open('compositions/captions7.html', 'w').write(cap)
film = open('compositions/film.html').read()
film = film.replace('data-composition-id="film"', 'data-composition-id="film7"').replace('const DUR = 39;', f'const DUR = {DUR};')
film = film.replace('data-duration="39"', f'data-duration="{DUR}"').replace('Film3D.mount', 'Film7.mount').replace("window.__timelines['film']", "window.__timelines['film7']")
film = film.replace('window.__filmSeek', 'window.__film7Seek')
open('compositions/film7.html', 'w').write(film)
idx = open('versions/index-v4.html.txt').read()
idx = idx.replace('<script src="assets/film3d.js"></script>', f'<script src="assets/components/hero3d.js"></script>\n    <script src="assets/components/guide2d.js"></script>\n    <script src="assets/components/door2d.js"></script>\n    <script src="assets/words-{TAG}.js"></script>\n    <script src="assets/film7.js"></script>')
idx = idx.replace('data-duration="39"', f'data-duration="{DUR}"')
idx = idx.replace('id="film" data-composition-id="film" data-composition-src="compositions/film.html"', 'id="film7" data-composition-id="film7" data-composition-src="compositions/film7.html"')
idx = idx.replace('id="captions" data-composition-id="captions" data-composition-src="compositions/captions.html"', 'id="captions7" data-composition-id="captions7" data-composition-src="compositions/captions7.html"')
idx = re.sub(r'<audio id="vo"[^>]*></audio>', f'<audio id="vo" class="clip" src="{voice}" data-start="0" data-duration="{DUR}" data-track-index="2" data-volume="1"></audio>', idx)
idx = re.sub(r'<audio id="sfx"[^>]*></audio>', f'<audio id="sfx" class="clip" src="assets/audio/sfx_v7_{TAG}.wav" data-start="0" data-duration="{DUR}" data-track-index="3" data-volume="0.55"></audio>', idx)
open('index.html', 'w').write(idx)
print('DUR', DUR, 'groups', len(groups))
