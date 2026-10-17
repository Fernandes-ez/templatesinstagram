"""Gera as instâncias estáticas da Anybody usadas nos templates (camada de texto do Photoshop não usa eixo variável).

    python prepare-fonts.py            # gera só as que faltam
    python prepare-fonts.py --force    # refaz todas

Precisa de fonttools (pip install fonttools). Sem Python na máquina, rode pelo Docker:
    docker run --rm -v "%cd%/../..:/w" -w /w/marketing/instagram python:3.12-slim \
        sh -c "pip install -q fonttools && python prepare-fonts.py"
"""

import sys
from pathlib import Path

from fontTools.ttLib import TTFont
from fontTools.varLib import instancer

PASTA = Path(__file__).resolve().parents[2] / "tabua-marca" / "tabua-marca" / "fonts" / "ttf"
VARIAVEL = PASTA / "Anybody-VariableFont_wdth,wght.ttf"

# nome do arquivo = nome PostScript; (peso, largura)
INSTANCIAS = {
    "Anybody-Black-W75": (900, 75),  # display e títulos
    "Anybody-ExtraBold-W75": (800, 75),  # subtítulos
    "Anybody-ExtraBold-W60": (800, 60),  # etiquetas em caixa alta
    "Anybody-Black-W80": (900, 80),  # números e preços
}


def gerar(nome: str, peso: int, largura: int) -> None:
    fonte = instancer.instantiateVariableFont(TTFont(VARIAVEL), {"wght": peso, "wdth": largura})
    # Nome próprio por instância: o Photoshop acha a fonte pelo nome PostScript gravado no .psd
    familia = nome.replace("-", " ")
    tabela = fonte["name"]
    for rec_id, valor in {1: familia, 2: "Regular", 4: familia, 6: nome, 16: familia, 17: "Regular"}.items():
        tabela.setName(valor, rec_id, 3, 1, 0x409)
    fonte.save(PASTA / f"{nome}.ttf")
    print(f"gerada   {nome}.ttf  (wght {peso}, wdth {largura})")


def main() -> None:
    if not VARIAVEL.exists():
        sys.exit(f"Fonte variável não encontrada: {VARIAVEL}")
    forcar = "--force" in sys.argv
    for nome, (peso, largura) in INSTANCIAS.items():
        if (PASTA / f"{nome}.ttf").exists() and not forcar:
            print(f"já existe {nome}.ttf")
            continue
        gerar(nome, peso, largura)


if __name__ == "__main__":
    main()
