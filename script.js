const calendario = document.getElementById('calendario');
const resumoCoroinhas = document.getElementById('resumoCoroinhas');
const statusEscala = document.getElementById('statusEscala');
const nomesDias = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const nomesMeses = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
const anoEscala = 2026;
const mesEscala = 9;
let escalaAtual = null;

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
    celula.innerHTML = `
        <div class="day-label">
            <span>${nomesDias[diaSemana]}</span>
            <strong>${numeroDia}</strong>
        </div>
        <div class="service-slot">
            <span class="slot-marker"></span>
            <span>${servico ? `${servico.horario} · ${nomes.length}/${servico.quantidade}` : 'Sem missa'}</span>
        </div>
        ${nomes.length ? `<ul class="assigned-list">${nomes.map(nome => `<li>${nome}</li>`).join('')}</ul>` : ''}
    `;
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
}

function carregarDados() {
    return fetch('/api/escala').then(response => response.json()).then(escala => {
        escalaAtual = escala;
        const totalCoroinhas = Object.keys(escala.participacoes || {}).length;
        resumoCoroinhas.textContent = totalCoroinhas ? `${totalCoroinhas} coroinhas na escala` : 'Escala ainda não sorteada';
        statusEscala.textContent = escala.servicos?.length ? `Gerada em ${escala.gerada_em.replace('T', ' ')}` : 'Escala ainda não sorteada';
        montarCalendario();
    });
}

const adminPanel = document.getElementById('adminPanel');
document.getElementById('adminButton').addEventListener('click', () => {
    adminPanel.hidden = !adminPanel.hidden;
});
document.getElementById('loginButton').addEventListener('click', () => {
    fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ senha: document.getElementById('senhaAdmin').value }),
    }).then(response => response.json().then(data => ({ ok: response.ok, data })))
        .then(({ ok, data }) => {
            document.getElementById('adminMensagem').textContent = data.mensagem || data.erro;
            if (ok) {
                document.getElementById('senhaAdmin').hidden = true;
                document.getElementById('loginButton').hidden = true;
                document.getElementById('sortearButton').hidden = false;
            }
        });
});
document.getElementById('sortearButton').addEventListener('click', () => {
    const botao = document.getElementById('sortearButton');
    botao.disabled = true;
    fetch('/api/admin/sortear', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ano: anoEscala, mes: mesEscala + 1 }),
    }).then(response => response.json().then(data => ({ ok: response.ok, data })))
        .then(({ ok, data }) => {
            document.getElementById('adminMensagem').textContent = ok ? 'Escala sorteada e publicada.' : data.erro;
            if (ok) {
                escalaAtual = data;
                statusEscala.textContent = `Gerada em ${data.gerada_em.replace('T', ' ')}`;
                montarCalendario();
            }
        }).finally(() => { botao.disabled = false; });
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

carregarDados().catch(() => {
    resumoCoroinhas.textContent = 'Dados indisponíveis';
    montarCalendario();
});
