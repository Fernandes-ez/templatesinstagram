"""Gera ezf-manual.html a partir de manual.template.html, embutindo logos e imagens em base64.
Uso: python3 build.py"""
import re, base64
s = open('manual.template.html', encoding='utf-8').read()
def b64(path, mime): return f'data:{mime};base64,' + base64.b64encode(open(path, 'rb').read()).decode()
s = re.sub(r'\{\{logo:([a-z\-]+)\}\}', lambda m: b64(f'../logo/{m.group(1)}.png', 'image/png'), s)
s = re.sub(r'\{\{img:([a-z\-]+)\}\}', lambda m: b64(f'../exemplos/{m.group(1)}.jpg', 'image/jpeg'), s)
s = re.sub(r'\{\{ico:([a-z\-/]+)\}\}', lambda m: b64(f'../icones/{m.group(1)}.svg', 'image/svg+xml'), s)
open('ezf-manual.html', 'w', encoding='utf-8').write(s)
