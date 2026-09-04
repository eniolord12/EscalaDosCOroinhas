const calendario = document.getElementById('calendario');
const resumoCoroinhas = document.getElementById('resumoCoroinhas');
const statusEscala = document.getElementById('statusEscala');
const adminMensagem = document.getElementById('adminMensagem');
const nomesDias = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const nomesMeses = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
let anoEscala = 2026;
let mesEscala = 9;
let escalaAtual = null;
let coroinhasAdmin = [];
let adminLogado = false;

function dataLocal(ano, mes, dia) {
    return new Date(ano, mes, dia).toISOString().slice(0, 10);
}

function servicoPorData(data) {
    return escalaAtual?.servicos?.find(servico => servico.data === data.toISOString().slice(0, 10));
}

function criarCelulaDia(data) {
    const celula = document.createElement('article');
    const diaSemana = data.getDay();
    const numeroDia = data.getDate();
    const servico = servicoPorData(data);
    const nomes = servico?.coroinhas || [];
    celula.className = `day-cell${diaSemana === 0 || diaSemana === 6 ? ' weekend' : ''}`;
    celula.innerHTML = `<div class="day-label"><span>${nomesDias[diaSemana]}</span><strong>${numeroDia}</strong></div>
        <div class="service-slot"><span class="slot-marker"></span><span>${servico ? `${servico.horario} · ${nomes.length}/${servico.quantidade}` : 'Sem missa'}</span></div>
        ${nomes.length ? `<ul class="assigned-list">${nomes.map(nome => `<li>${nome}</li>`).join('')}</ul>` : ''}`;
    celula.setAttribute('aria-label', `${numeroDia} de ${nomesMeses[mesEscala]}${servico ? `, ${nomes.length} coroinhas escalados` : ', sem missa'}`);
    return celula;
}

function montarCalendario() {
    calendario.replaceChildren();
    nomesDias.forEach(dia => {
        const cabecalho = document.createElement('div');
        cabecalho.className = 'weekday';
        cabecalho.textContent = dia;
        calendario.appendChild(cabecalho);
    });
    const primeiroDia = new Date(anoEscala, mesEscala, 1);
    const ultimoDia = new Date(anoEscala, mesEscala + 1, 0);
    for (let espaco = 0; espaco < primeiroDia.getDay(); espaco += 1) {
        const vazio = document.createElement('div');
        vazio.className = 'day-cell empty-day';
        calendario.appendChild(vazio);
    }
    for (let dia = 1; dia <= ultimoDia.getDate(); dia += 1) {
        calendario.appendChild(criarCelulaDia(new Date(anoEscala, mesEscala, dia)));
    }
    document.getElementById('mesAtual').textContent = nomesMeses[mesEscala];
    document.getElementById('anoAtual').textContent = anoEscala;
    document.getElementById('tituloCalendario').textContent = `Serviços de ${nomesMeses[mesEscala].toLowerCase()}`;
    document.title = `Escala dos Coroinhas | ${nomesMeses[mesEscala]} ${anoEscala}`;
}

function carregarEscala() {
    return fetch(`/api/escala?ano=${anoEscala}&mes=${mesEscala + 1}`).then(response => response.json()).then(escala => {
        escalaAtual = escala;
        const total = Object.keys(escala.participacoes || {}).length;
        resumoCoroinhas.textContent = total ? `${total} coroinhas na escala` : 'Escala ainda não sorteada';
        statusEscala.textContent = escala.servicos?.length ? `Gerada em ${escala.gerada_em.replace('T', ' ')}` : 'Escala ainda não sorteada';
        montarCalendario();
        if (adminLogado) {
            montarConfiguracao();
            montarEditorManual();
        }
    });
}

function configuracaoPadrao() {
    const padrao = { 3: ['06:00', 4], 4: ['19:30', 8], 6: ['19:00', 10], 0: ['19:00', 10] };
    const ultimoDia = new Date(anoEscala, mesEscala + 1, 0).getDate();
    const configuracoes = [];
    for (let dia = 1; dia <= ultimoDia; dia += 1) {
        const data = new Date(anoEscala, mesEscala, dia);
        const regra = padrao[data.getDay()];
        configuracoes.push({ data: dataLocal(anoEscala, mesEscala, dia), dia: `${nomesDias[data.getDay()]} ${dia}`, horario: regra?.[0] || '', quantidade: regra?.[1] || 0, ativo: Boolean(regra) });
    }
    return configuracoes;
}

function montarConfiguracao() {
    const container = document.getElementById('configuracaoMissas');
    container.replaceChildren();
    const existentes = new Map((escalaAtual?.servicos || []).map(servico => [servico.data, servico]));
    configuracaoPadrao().forEach(config => {
        const existente = existentes.get(config.data);
        const linha = document.createElement('label');
        linha.className = 'mass-row';
        linha.innerHTML = `<input type="checkbox" class="mass-enabled" ${existente || config.ativo ? 'checked' : ''}>
            <span class="mass-date">${config.dia}</span>
            <input type="time" class="mass-time" value="${existente?.horario || config.horario}" aria-label="Horário de ${config.dia}">
            <input type="number" class="mass-quantity" min="1" max="55" value="${existente?.quantidade || config.quantidade || 1}" aria-label="Quantidade de ${config.dia}">
            <span class="mass-unit">coroinhas</span>`;
        linha.dataset.data = config.data;
        container.appendChild(linha);
    });
}

function configuracaoInformada() {
    return [...document.querySelectorAll('.mass-row')].filter(linha => linha.querySelector('.mass-enabled').checked).map(linha => ({
        data: linha.dataset.data,
        dia: linha.querySelector('.mass-date').textContent.split(' ')[0],
        horario: linha.querySelector('.mass-time').value,
        quantidade: Number(linha.querySelector('.mass-quantity').value),
    }));
}

function carregarListaAdmin() {
    return fetch('/api/admin/coroinhas').then(response => response.json()).then(coroinhas => {
        coroinhasAdmin = coroinhas;
        const lista = document.getElementById('listaAdminCoroinhas');
        lista.replaceChildren();
        coroinhas.forEach(coroinha => {
            const item = document.createElement('li');
            item.textContent = coroinha.nome;
            lista.appendChild(item);
        });
        montarEditorManual();
    });
}

function montarEditorManual() {
    const seletorServico = document.getElementById('servicoParaEditar');
    seletorServico.replaceChildren();
    (escalaAtual?.servicos || []).forEach(servico => {
        const opcao = document.createElement('option');
        opcao.value = servico.data;
        opcao.textContent = `${servico.data.split('-').reverse().join('/')} · ${servico.horario}`;
        seletorServico.appendChild(opcao);
    });
    seletorServico.onchange = atualizarCoroinhasDoServico;
    atualizarCoroinhasDoServico();
}

function atualizarCoroinhasDoServico() {
    const servico = escalaAtual?.servicos?.find(item => item.data === document.getElementById('servicoParaEditar').value);
    const selecionados = new Set(servico?.coroinha_ids || []);
    const lista = document.getElementById('coroinhasDoServico');
    lista.replaceChildren();
    coroinhasAdmin.forEach(coroinha => {
        const opcao = document.createElement('option');
        opcao.value = coroinha.id;
        opcao.textContent = coroinha.nome;
        opcao.selected = selecionados.has(coroinha.id);
        lista.appendChild(opcao);
    });
}

function ativarAreaAdmin() {
    adminLogado = true;
    document.getElementById('welcomeScreen').hidden = true;
    document.getElementById('appShell').hidden = false;
    document.getElementById('adminPanel').hidden = false;
    document.getElementById('senhaAdmin').hidden = true;
    document.getElementById('loginButton').hidden = true;
    document.getElementById('sortearButton').hidden = false;
    document.getElementById('adminWorkspace').hidden = false;
    montarConfiguracao();
    carregarListaAdmin().catch(() => { adminMensagem.textContent = 'Não foi possível carregar os dados administrativos.'; });
}

function abrirAreaCoroinha() {
    document.getElementById('welcomeScreen').hidden = true;
    document.getElementById('appShell').hidden = false;
}

document.getElementById('acessarCoroinhaButton').addEventListener('click', abrirAreaCoroinha);
document.getElementById('acessarAdminButton').addEventListener('click', () => {
    document.getElementById('welcomeLogin').hidden = false;
    document.getElementById('senhaInicial').focus();
});
document.getElementById('welcomeLogin').addEventListener('submit', event => {
    event.preventDefault();
    const senha = document.getElementById('senhaInicial').value;
    fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ senha }),
    }).then(response => response.json().then(data => ({ ok: response.ok, data })))
        .then(({ ok }) => {
            if (ok) {
                ativarAreaAdmin();
                return;
            }
            document.getElementById('loginErro').textContent = 'A senha está incorreta';
        });
});

document.getElementById('adminButton').addEventListener('click', () => {
    const painel = document.getElementById('adminPanel');
    painel.hidden = !painel.hidden;
});
document.getElementById('loginButton').addEventListener('click', () => {
    fetch('/api/admin/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ senha: document.getElementById('senhaAdmin').value }) })
        .then(response => response.json().then(data => ({ ok: response.ok, data })))
        .then(({ ok, data }) => {
            adminMensagem.textContent = ok ? data.mensagem : 'A senha está incorreta';
            if (ok) ativarAreaAdmin();
        });
});
document.getElementById('sortearButton').addEventListener('click', () => {
    const botao = document.getElementById('sortearButton');
    botao.disabled = true;
    fetch('/api/admin/sortear', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ano: anoEscala, mes: mesEscala + 1, servicos: configuracaoInformada() }) })
        .then(response => response.json().then(data => ({ ok: response.ok, data })))
        .then(({ ok, data }) => { adminMensagem.textContent = ok ? 'Escala sorteada e publicada.' : data.erro; if (ok) { escalaAtual = data; montarCalendario(); montarConfiguracao(); montarEditorManual(); statusEscala.textContent = `Gerada em ${data.gerada_em.replace('T', ' ')}`; } })
        .finally(() => { botao.disabled = false; });
});
document.getElementById('salvarEdicaoButton').addEventListener('click', () => {
    const data = document.getElementById('servicoParaEditar').value;
    const ids = [...document.getElementById('coroinhasDoServico').selectedOptions].map(opcao => Number(opcao.value));
    fetch('/api/admin/escala', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ano: anoEscala, mes: mesEscala + 1, data, coroinha_ids: ids }) })
        .then(response => response.json().then(resultado => ({ ok: response.ok, resultado })))
        .then(({ ok, resultado }) => { adminMensagem.textContent = ok ? 'Alteração salva na escala publicada.' : resultado.erro; if (ok) { escalaAtual = resultado; montarCalendario(); montarEditorManual(); } });
});
document.getElementById('imprimirButton').addEventListener('click', () => window.print());
document.getElementById('hojeButton').addEventListener('click', () => {
    const hoje = new Date();
    if (hoje.getFullYear() !== anoEscala || hoje.getMonth() !== mesEscala) return;
    const diaAtual = document.querySelectorAll('.day-cell:not(.empty-day)')[hoje.getDate() - 1];
    diaAtual?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    diaAtual?.classList.add('today-focus');
    window.setTimeout(() => diaAtual?.classList.remove('today-focus'), 1400);
});

function mudarMes(delta) {
    mesEscala += delta;
    if (mesEscala < 0) {
        mesEscala = 11;
        anoEscala -= 1;
    } else if (mesEscala > 11) {
        mesEscala = 0;
        anoEscala += 1;
    }
    carregarEscala().catch(() => {
        escalaAtual = { servicos: [], avisos: [] };
        montarCalendario();
    });
}

document.getElementById('mesAnteriorButton').addEventListener('click', () => mudarMes(-1));
document.getElementById('proximoMesButton').addEventListener('click', () => mudarMes(1));

carregarEscala().catch(() => { resumoCoroinhas.textContent = 'Dados indisponíveis'; montarCalendario(); });
