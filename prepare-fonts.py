"""Baixa as fontes variáveis do Google Fonts e gera as instâncias estáticas usadas nos PSDs.

Uso: py prepare-fonts.py   (requer: py -m pip install fonttools)
Saída: fonts/*.ttf + fonts/fonts.json (chave -> arquivo + nome PostScript usado nas camadas de texto)
"""
import json
import pathlib
import urllib.request

from fontTools.ttLib import TTFont
from fontTools.varLib import instancer

ROOT = pathlib.Path(__file__).parent / "fonts"
SRC = ROOT / "src"
BASE = "https://raw.githubusercontent.com/google/fonts/main/ofl/"

SOURCES = {
    "unbounded": ("unbounded/Unbounded%5Bwght%5D.ttf", "Unbounded[wght].ttf"),
    "instrument": ("instrumentsans/InstrumentSans%5Bwdth,wght%5D.ttf", "InstrumentSans[wdth,wght].ttf"),
    "jetbrains": ("jetbrainsmono/JetBrainsMono%5Bwght%5D.ttf", "JetBrainsMono[wght].ttf"),
}

# chave usada no brand.config.js -> (fonte, eixos, família, estilo)
INSTANCES = {
    "displayLight": ("unbounded", {"wght": 300}, "Unbounded", "Light"),
    "display": ("unbounded", {"wght": 400}, "Unbounded", "Regular"),
    "displayMedium": ("unbounded", {"wght": 500}, "Unbounded", "Medium"),
    "body": ("instrument", {"wght": 400, "wdth": 100}, "Instrument Sans", "Regular"),
    "bodySemi": ("instrument", {"wght": 600, "wdth": 100}, "Instrument Sans", "SemiBold"),
    "mono": ("jetbrains", {"wght": 400}, "JetBrains Mono", "Regular"),
}


def set_names(font, family, style):
    ps = f"{family.replace(' ', '')}-{style}"
    legacy_family = family if style in ("Regular",) else f"{family} {style}"
    table = font["name"]
    for plat, enc, lang in ((3, 1, 0x409), (1, 0, 0)):
        table.setName(legacy_family, 1, plat, enc, lang)
        table.setName("Regular", 2, plat, enc, lang)
        table.setName(f"{family} {style}", 4, plat, enc, lang)
        table.setName(ps, 6, plat, enc, lang)
        table.setName(family, 16, plat, enc, lang)
        table.setName(style, 17, plat, enc, lang)
    table.names = [n for n in table.names if n.nameID < 256]
    return ps


def main():
    SRC.mkdir(parents=True, exist_ok=True)
    for url, name in SOURCES.values():
        target = SRC / name
        if not target.exists():
            print("baixando", name)
            urllib.request.urlretrieve(BASE + url, target)

    manifest = {}
    for key, (src, axes, family, style) in INSTANCES.items():
        font = TTFont(SRC / SOURCES[src][1])
        static = instancer.instantiateVariableFont(font, axes)
        ps = set_names(static, family, style)
        out = ROOT / f"{ps}.ttf"
        static.save(out)
        manifest[key] = {"file": out.name, "ps": ps}
        print(f"{key:14} -> {out.name}")

    (ROOT / "fonts.json").write_text(json.dumps(manifest, indent=2), encoding="utf-8")


if __name__ == "__main__":
    main()
