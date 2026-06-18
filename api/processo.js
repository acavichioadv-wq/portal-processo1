const DATAJUD_KEY = process.env.DATAJUD_KEY || 'cDZHYzlZa0JadVREZDJCendQbXY6SkJlTzNjLV9TRENyQk1RdnFKZGRQdw==';
const ANTHROPIC_KEY = process.env.ANTHROPIC_KEY || '';

// Mapa de tribunais baseado no número CNJ (segmento + tribunal)
const TRIBUNAIS = {
  '8_01': { sigla: 'tjsp', nome: 'TJSP – Tribunal de Justiça de São Paulo' },
  '8_02': { sigla: 'tjmg', nome: 'TJMG – Tribunal de Justiça de Minas Gerais' },
  '8_03': { sigla: 'tjrj', nome: 'TJRJ – Tribunal de Justiça do Rio de Janeiro' },
  '8_04': { sigla: 'tjrs', nome: 'TJRS – Tribunal de Justiça do Rio Grande do Sul' },
  '8_05': { sigla: 'tjba', nome: 'TJBA – Tribunal de Justiça da Bahia' },
  '8_06': { sigla: 'tjpr', nome: 'TJPR – Tribunal de Justiça do Paraná' },
  '8_07': { sigla: 'tjce', nome: 'TJCE – Tribunal de Justiça do Ceará' },
  '8_08': { sigla: 'tjpe', nome: 'TJPE – Tribunal de Justiça de Pernambuco' },
  '8_09': { sigla: 'tjsc', nome: 'TJSC – Tribunal de Justiça de Santa Catarina' },
  '8_10': { sigla: 'tjgo', nome: 'TJGO – Tribunal de Justiça de Goiás' },
  '8_11': { sigla: 'tjma', nome: 'TJMA – Tribunal de Justiça do Maranhão' },
  '8_12': { sigla: 'tjpa', nome: 'TJPA – Tribunal de Justiça do Pará' },
  '8_13': { sigla: 'tjto', nome: 'TJTO – Tribunal de Justiça do Tocantins' },
  '8_14': { sigla: 'tjal', nome: 'TJAL – Tribunal de Justiça de Alagoas' },
  '8_15': { sigla: 'tjrn', nome: 'TJRN – Tribunal de Justiça do Rio Grande do Norte' },
  '8_16': { sigla: 'tjms', nome: 'TJMS – Tribunal de Justiça do Mato Grosso do Sul' },
  '8_17': { sigla: 'tjmt', nome: 'TJMT – Tribunal de Justiça do Mato Grosso' },
  '8_18': { sigla: 'tjrr', nome: 'TJRR – Tribunal de Justiça de Roraima' },
  '8_19': { sigla: 'tjac', nome: 'TJAC – Tribunal de Justiça do Acre' },
  '8_20': { sigla: 'tjap', nome: 'TJAP – Tribunal de Justiça do Amapá' },
  '8_21': { sigla: 'tjro', nome: 'TJRO – Tribunal de Justiça de Rondônia' },
  '8_22': { sigla: 'tjam', nome: 'TJAM – Tribunal de Justiça do Amazonas' },
  '8_23': { sigla: 'tjse', nome: 'TJSE – Tribunal de Justiça de Sergipe' },
  '8_24': { sigla: 'tjes', nome: 'TJES – Tribunal de Justiça do Espírito Santo' },
  '8_25': { sigla: 'tjpi', nome: 'TJPI – Tribunal de Justiça do Piauí' },
  '8_26': { sigla: 'tjpb', nome: 'TJPB – Tribunal de Justiça da Paraíba' },
  '8_27': { sigla: 'tjdft', nome: 'TJDFT – Tribunal de Justiça do DF e Territórios' },
  '4_01': { sigla: 'trf1', nome: 'TRF1 – Tribunal Regional Federal da 1ª Região' },
  '4_02': { sigla: 'trf2', nome: 'TRF2 – Tribunal Regional Federal da 2ª Região' },
  '4_03': { sigla: 'trf3', nome: 'TRF3 – Tribunal Regional Federal da 3ª Região' },
  '4_04': { sigla: 'trf4', nome: 'TRF4 – Tribunal Regional Federal da 4ª Região' },
  '4_05': { sigla: 'trf5', nome: 'TRF5 – Tribunal Regional Federal da 5ª Região' },
  '3_00': { sigla: 'stj',  nome: 'STJ – Superior Tribunal de Justiça' },
  '2_00': { sigla: 'stf',  nome: 'STF – Supremo Tribunal Federal' },
};

function resolverTribunal(numeroLimpo) {
  const seg   = numeroLimpo.slice(13, 14);
  const trib  = numeroLimpo.slice(14, 16).replace(/^0+/, ''); // remove zeros à esquerda
  const key   = `${seg}_${String(trib).padStart(2,'0')}`;
  return TRIBUNAIS[key] || { sigla: 'tjsp', nome: 'Tribunal de Justiça' };
}

async function buscarDatajud(numero) {
  const numeroLimpo = numero.replace(/\D/g, '');
  const tribunal = resolverTribunal(numeroLimpo);

  const url = `https://api-publica.datajud.cnj.jus.br/api_publica_${tribunal.sigla}/_search`;

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `APIKey ${DATAJUD_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      query: { match: { numeroProcesso: numero } },
      size: 1
    }),
  });

  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`DataJud erro ${res.status}: ${txt.slice(0,200)}`);
  }

  const data = await res.json();
  const hits = data?.hits?.hits;
  if (!hits || hits.length === 0) {
    throw new Error('Processo não encontrado. Verifique o número e tente novamente.');
  }

  const p = hits[0]._source;
  const movimentos = (p.movimentos || [])
    .sort((a, b) => new Date(b.dataHora) - new Date(a.dataHora))
    .slice(0, 12)
    .map(m => ({
      data: m.dataHora ? new Date(m.dataHora).toLocaleDateString('pt-BR') : '—',
      nome: m.nome || m.complementosTabelados?.[0]?.nome || 'Movimentação',
      desc: m.complementosTabelados?.[0]?.descricao || ''
    }));

  return {
    numero: p.numeroProcesso || numero,
    tribunal: tribunal.nome,
    tribunalSigla: tribunal.sigla.toUpperCase(),
    classe: p.classe?.nome || 'Processo',
    assunto: p.assuntos?.[0]?.nome || '',
    dataAjuizamento: p.dataAjuizamento
      ? new Date(p.dataAjuizamento).toLocaleDateString('pt-BR') : '—',
    ultimaAtividade: movimentos[0]?.data || '—',
    movimentos,
  };
}

async function traduzirComIA(dados) {
  if (!ANTHROPIC_KEY) return gerarResumoAutomatico(dados);

  const movStr = dados.movimentos
    .slice(0, 6)
    .map(m => `${m.data}: ${m.nome}${m.desc ? ' – ' + m.desc : ''}`)
    .join('\n');

  const prompt = `Você é o assistente jurídico do escritório André Cavichio Advogados (direito do consumidor).
Explique para um cliente leigo o andamento atual do processo abaixo.
Use linguagem simples, acolhedora e clara. Máximo 3 frases curtas.
Informe o que está acontecendo agora e qual é o próximo passo esperado.
Não use jargão jurídico sem explicação.
Responda em HTML simples (apenas <strong> quando necessário, sem listas).

Processo: ${dados.numero}
Tribunal: ${dados.tribunal}
Classe: ${dados.classe}
Assunto: ${dados.assunto}
Ajuizamento: ${dados.dataAjuizamento}
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

  if (ultimo.includes('conclus')) {
    status = 'com o juiz para decisão';
    proximo = 'O próximo passo é a publicação de uma decisão ou sentença pelo magistrado.';
  } else if (ultimo.includes('cit')) {
    status = 'aguardando resposta do réu';
    proximo = 'O próximo passo é a apresentação de contestação pela parte contrária.';
  } else if (ultimo.includes('senten')) {
    status = 'com sentença proferida';
    proximo = 'Aguarde orientação do escritório sobre os próximos passos.';
  } else if (ultimo.includes('distrib')) {
    status = 'recém distribuído';
    proximo = 'O processo foi recebido pelo tribunal e aguarda as primeiras movimentações.';
  }

  return `Seu processo de <strong>${dados.classe}</strong> está <strong>${status}</strong>. ` +
    `A última movimentação ocorreu em ${dados.ultimaAtividade}. ${proximo}`;
}

// ── HANDLER VERCEL ───────────────────────────────────────────────────────────
export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { numero } = req.query;
  if (!numero) return res.status(400).json({ erro: 'Número do processo não informado.' });

  try {
    const dados = await buscarDatajud(numero);
    const resumo = await traduzirComIA(dados);
    return res.status(200).json({ ...dados, resumo });
  } catch (err) {
    return res.status(500).json({ erro: err.message });
  }
}
