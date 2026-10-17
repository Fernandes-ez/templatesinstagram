"""Gera ezf-manual.html a partir de manual.template.html, embutindo os logos em base64.
Uso: python3 build.py"""
import re, base64
s = open('manual.template.html', encoding='utf-8').read()
def rep(m):
    return 'data:image/png;base64,' + base64.b64encode(open(f'../logo/{m.group(1)}.png', 'rb').read()).decode()
open('ezf-manual.html', 'w', encoding='utf-8').write(re.sub(r'\{\{logo:([a-z\-]+)\}\}', rep, s))
