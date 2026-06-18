const ANTHROPIC_KEY = process.env.ANTHROPIC_KEY || '';

async function buscarTJSP(numero) {
  const url = `https://esaj.tjsp.jus.br/cpopg/show.do?processo.codigo=&processo.foro=&processo.numero=${encodeURIComponent(numero)}&uuidCaptcha=`;

  const res = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      'Accept': 'text/html,application/xhtml+xml',
      'Accept-Language': 'pt-BR,pt;q=0.9',
    }
  });

  if (!res.ok) throw new Error(`TJSP retornou erro ${res.status}`);

  const html = await res.text();

  if (html.includes('Não existem informações') || html.includes('nenhum processo')) {
    throw new Error('Processo não encontrado no TJSP. Verifique o número.');
  }

  return extrairDadosTJSP(html, numero);
}

function extrairTexto(html, inicio, fim) {
  const i = html.indexOf(inicio);
  if (i === -1) return '';
  const j = html.indexOf(fim, i + inicio.length);
  if (j === -1) return '';
  return html.slice(i + inicio.length, j).replace(/<[^>]+>/g, '').trim();
}

function extrairDadosTJSP(html, numero) {
  const classe = extrairTexto(html, 'id="classeProcesso">', '</span>') ||
                 extrairTexto(html, 'class="classeNegrito">', '</span>') ||
                 'Processo Judicial';

  const assunto = extrairTexto(html, 'id="assuntoProcesso">', '</span>') || '';
  const dataDistribuicao = extrairTexto(html, 'id="dataHoraDistribuicaoProcesso">', '</span>') || '—';
  const juiz = extrairTexto(html, 'id="juizProcesso">', '</span>') || '';
  const vara = extrairTexto(html, 'id="varaProcesso">', '</span>') || '';
  const movimentos = extrairMovimentosTJSP(html);

  return {
    numero,
    tribunal: 'TJSP – Tribunal de Justiça de São Paulo',
    tribunalSigla: 'TJSP',
    classe,
    assunto,
    vara,
    juiz,
    dataAjuizamento: dataDistribuicao.split(' ')[0] || '—',
    ultimaAtividade: movimentos[0]?.data || '—',
    movimentos,
  };
}

function extrairMovimentosTJSP(html) {
  const movimentos = [];
  const inicio = html.indexOf('id="tabelaTodasMovimentacoes"') !== -1
    ? html.indexOf('id="tabelaTodasMovimentacoes"')
    : html.indexOf('id="tabelaUltimasMovimentacoes"');

  if (inicio === -1) return movimentos;

  const fim = html.indexOf('</table>', inicio);
  const tabela = html.slice(inicio, fim);
  const linhas = tabela.split('<tr>').slice(1);

  for (const linha of linhas.slice(0, 15)) {
    const colunas = linha.split('<td');
    if (colunas.length < 3) continue;
    const data = colunas[1]?.replace(/<[^>]+>/g, '').trim().slice(0, 10) || '';
    const titulo = colunas[2]?.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 200) || '';
    if (data && titulo && data.match(/\d{2}\/\d{2}\/\d{4}/)) {
      movimentos.push({ data, nome: titulo, desc: '' });
    }
  }

  return movimentos;
}

async function traduzirComIA(dados) {
  if (!ANTHROPIC_KEY) return gerarResumoAutomatico(dados);

  const movStr = dados.movimentos.slice(0, 6).map(m => `${m.data}: ${m.nome}`).join('\n');

  const prompt = `Você é o assistente jurídico do escritório André Cavichio Advogados (direito do consumidor).
Explique para um cliente leigo o andamento atual do processo abaixo.
Use linguagem simples, acolhedora e clara. Máximo 3 frases curtas.
Informe o que está acontecendo agora e qual é o próximo passo esperado.
Se houver sentença ou decisão importante, destaque isso.
Responda em HTML simples (apenas <strong> quando necessário).

Processo: ${dados.numero}
Tribunal: ${dados.tribunal}
Classe: ${dados.classe}
Assunto: ${dados.assunto}
Vara: ${dados.vara}
Última atividade: ${dados.ultimaAtividade}

Movimentos recentes:
${movStr}`;

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': ANTHROPIC_KEY,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-6',
      max_tokens: 300,
      messages: [{ role: 'user', content: prompt }]
    }),
  });

  if (!res.ok) return gerarResumoAutomatico(dados);
  const aiData = await res.json();
  return aiData.content[0].text;
}

function gerarResumoAutomatico(dados) {
  const ultimo = dados.movimentos[0]?.nome?.toLowerCase() || '';
  let status = 'em andamento';
  let proximo = 'Aguarde novas movimentações.';

  if (ultimo.includes('senten')) { status = 'com sentença proferida'; proximo = 'O juiz já proferiu sentença. Aguarde orientação do escritório.'; }
  else if (ultimo.includes('conclus')) { status = 'com o juiz para decisão'; proximo = 'Uma decisão deve ser publicada em breve.'; }
  else if (ultimo.includes('cit')) { status = 'aguardando resposta da parte contrária'; proximo = 'A parte contrária foi notificada e deve apresentar sua resposta.'; }
  else if (ultimo.includes('recurso') || ultimo.includes('apela')) { status = 'em fase recursal'; proximo = 'O processo está sendo analisado em segunda instância.'; }

  return `Seu processo de <strong>${dados.classe}</strong> está <strong>${status}</strong>. A última movimentação ocorreu em <strong>${dados.ultimaAtividade}</strong>. ${proximo}`;
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { numero } = req.query;
  if (!numero) return res.status(400).json({ erro: 'Número do processo não informado.' });

  try {
    const dados = await buscarTJSP(numero);
    const resumo = await traduzirComIA(dados);
    return res.status(200).json({ ...dados, resumo });
  } catch (err) {
    return res.status(500).json({ erro: err.message });
  }
}
