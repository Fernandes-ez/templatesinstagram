"""Gera os ícones ezf.tech (traço único, grade 48, um detalhe âmbar por ícone)."""
import os
A = "#F2B233"
# cada ícone: (corpo com stroke=base, detalhe âmbar)
I = {
"celular": ('<rect x="14" y="5" width="20" height="38" rx="4"/><path d="M21 38h6"/>', '<path d="M19 14h10M19 20h10M19 26h6"/>'),
"relogio": ('<circle cx="24" cy="24" r="18"/>', '<path d="M24 13v11l8 5"/>'),
"loja": ('<path d="M6 18l3-10h30l3 10M8 18v22h32V18M6 18c0 4 4 5 6 5s6-1 6-5c0 4 4 5 6 5s6-1 6-5c0 4 4 5 6 5s6-1 6-5"/>', '<path d="M19 40V29h10v11"/>'),
"pin": ('<path d="M24 43S9 30 9 19a15 15 0 0130 0c0 11-15 24-15 24z"/>', '<circle cx="24" cy="19" r="5"/>'),
"mensagem": ('<path d="M7 9h34v24H20l-9 8v-8H7z"/>', '<path d="M15 18h18M15 25h10"/>'),
"janela": ('<rect x="5" y="8" width="38" height="32" rx="3"/><path d="M5 16h38"/>', '<path d="M17 26l-4 4 4 4M31 26l4 4-4 4M26 24l-4 12"/>'),
"calendario": ('<rect x="6" y="9" width="36" height="33" rx="3"/><path d="M6 19h36M15 5v8M33 5v8"/>', '<path d="M17 30l5 5 9-10"/>'),
"lupa": ('<circle cx="21" cy="21" r="14"/>', '<path d="M31 31l12 12"/>'),
"cadeado": ('<rect x="8" y="21" width="32" height="22" rx="3"/><path d="M15 21v-6a9 9 0 0118 0v6"/>', '<path d="M24 29v6"/>'),
"grafico": ('<path d="M6 6v36h36"/>', '<path d="M13 33l9-9 6 6 12-14M33 16h7v7"/>'),
"preco": ('<path d="M5 24V7h17l21 21-17 15z"/>', '<circle cx="14" cy="16" r="2.5"/>'),
"sistema": ('<rect x="5" y="6" width="16" height="14" rx="2"/><rect x="27" y="28" width="16" height="14" rx="2"/>', '<path d="M21 13h8a6 6 0 016 6v9"/>'),
}
def svg(body, accent, base):
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" fill="none" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">'
            f'<g stroke="{base}">{body}</g><g stroke="{A}">{accent}</g></svg>\n')
for tema, base in (("sobre-tinta", "#EEEAF3"), ("sobre-nevoa", "#1B1026")):
    os.makedirs(tema, exist_ok=True)
    for n, (b, a) in I.items():
        open(f"{tema}/{n}.svg", "w").write(svg(b, a, base))
print(len(I), "ícones x 2 temas")
