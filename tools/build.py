"""Build index.html (Vercel site) from the game source.

  python3 tools/build.py

tools/levels.json  stage maps and hints
tools/core.js      game rules (pure logic, also used by solve.js / gen.js)
tools/shell.html   graphics, sound, input, UI, leaderboard
"""
import json, os
here = os.path.dirname(os.path.abspath(__file__))
root = os.path.dirname(here)
levels = json.load(open(os.path.join(here, 'levels.json'), encoding='utf-8'))
engine = "const LEVELS = " + json.dumps(levels, ensure_ascii=False, indent=1) + ";\n" + open(os.path.join(here, 'core.js'), encoding='utf-8').read()
open(os.path.join(here, 'engine.js'), 'w', encoding='utf-8').write(engine)   # for node tools
s = open(os.path.join(here, 'shell.html'), encoding='utf-8').read().replace('/*ENGINE*/', engine)
head = '''<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="description" content="꼬마 탐험가가 숨은 돌을 밀고 부숴 아기 새를 구출하는 레트로 퍼즐 게임">
<meta property="og:title" content="꼬마 탐험가의 유적">
<meta property="og:description" content="돌을 밀고 부숴 아기 새를 구출하는 10스테이지 레트로 퍼즐. 친구들과 걸음 수 순위 경쟁!">
<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/dist/umd/supabase.min.js"></script>
<script src="config.js"></script>'''
s = s.replace('<!--SITE_HEAD-->', head)
reset = '<style>*,*::before,*::after{box-sizing:border-box}html{color-scheme:dark;padding-top:env(safe-area-inset-top,0px);padding-bottom:env(safe-area-inset-bottom,0px)}body{margin:0;font:14px/1.5 system-ui,sans-serif}img{max-width:100%}[hidden]{display:none!important}</style>'
i = s.index('<div class="wrap">')
out = '<!doctype html>\n<html lang="ko">\n<head>\n' + reset + '\n' + s[:i] + '</head>\n<body>\n' + s[i:] + '\n</body>\n</html>\n'
open(os.path.join(root, 'index.html'), 'w', encoding='utf-8').write(out)
print('built index.html', len(out), 'bytes')
