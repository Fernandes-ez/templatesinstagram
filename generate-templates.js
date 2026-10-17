/**
 * EZF & Puka Render Runner (pukacrm.com.br)
 * Executa a geração dos posts autorais da Puka.
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { renderizarPostPuka } from "./templates.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

(async () => {
  const outDir = path.join(__dirname, "output-puka");
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

  const exemplos = [
    {
      arquivo: "puka-post-01-manifesto.jpg",
      dados: {
        modelo: 1,
        etiqueta: "Posicionamento",
        titulo: "A IA dá a {deixa}. Seu time {fecha} a venda.",
        apoio:
          "O robô resolve o triplo de chamados em segundos e transfere a negociação quente com todo o histórico pronto.",
        cta: "Teste 14 dias grátis: pukacrm.com.br",
      },
    },
    {
      arquivo: "puka-post-02-chat.jpg",
      dados: {
        modelo: 2,
        cta: "pukacrm.com.br",
      },
    },
    {
      arquivo: "puka-post-03-quebra-obn.jpg",
      dados: {
        modelo: 3,
        etiqueta: "Eficiência de Equipe",
        titulo: "Ninguém repetindo o mesmo {preço} 50 vezes no dia.",
        apoio:
          "Liberte seus vendedores para o que importa: fechar matrículas e contratos.",
        cta: "pukacrm.com.br",
      },
    },
    {
      arquivo: "puka-post-04-impacto.jpg",
      dados: {
        modelo: 4,
        numero: "14 dias",
        titulo: "De {teste} a rotina automatizada sem dor de cabeça.",
        apoio:
          "Configuração guiada e suporte direto para colocar sua operação para rodar.",
        cta: "pukacrm.com.br",
      },
    },
    {
      arquivo: "puka-post-05-checklist.jpg",
      dados: {
        modelo: 5,
        etiqueta: "Método Operacional",
        itens: [
          "Cliente manda mensagem e espera 2 horas",
          "Vendedor perde o lead esquecido no WhatsApp",
          "Equipe sem histórico unificado de atendimento",
        ],
        cta: "pukacrm.com.br",
      },
    },
  ];

  for (const ex of exemplos) {
    const buf = await renderizarPostPuka(ex.dados);
    const dest = path.join(outDir, ex.arquivo);
    fs.writeFileSync(dest, buf);
    console.log(`🎭 Puka gerada com sucesso: ${dest}`);
  }

  console.log(
    "✨ Todos os 5 posts estáticos da Puka foram gerados na pasta output-puka/!",
  );
})();
