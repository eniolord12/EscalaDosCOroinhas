const calendario = document.getElementById('calendario');
const resumoCoroinhas = document.getElementById('resumoCoroinhas');
const nomesDias = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const nomesMeses = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
const anoEscala = 2026;
const mesEscala = 9;

function criarCelulaDia(data) {
    const celula = document.createElement('article');
    const diaSemana = data.getDay();
    const numeroDia = data.getDate();

    celula.className = `day-cell${diaSemana === 0 || diaSemana === 6 ? ' weekend' : ''}`;
    celula.innerHTML = `
        <div class="day-label">
            <span>${nomesDias[diaSemana]}</span>
            <strong>${numeroDia}</strong>
        </div>
        <div class="service-slot">
            <span class="slot-marker"></span>
            <span>Aguardando escala</span>
        </div>
    `;

    celula.setAttribute('aria-label', `${numeroDia} de ${nomesMeses[mesEscala]}: escala não definida`);
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

function carregarResumo() {
    fetch('/api/coroinhas')
        .then(response => {
            if (!response.ok) {
                throw new Error('Cadastros indisponíveis');
            }
            return response.json();
        })
        .then(coroinhas => {
            resumoCoroinhas.textContent = `${coroinhas.length} coroinhas disponíveis`;
        })
        .catch(() => {
            resumoCoroinhas.textContent = 'Disponibilidade não carregada';
        });
}

document.getElementById('imprimirButton').addEventListener('click', () => window.print());
document.getElementById('hojeButton').addEventListener('click', () => {
    const hoje = new Date();
    const estaNoMes = hoje.getFullYear() === anoEscala && hoje.getMonth() === mesEscala;
    const diaAtual = estaNoMes ? document.querySelectorAll('.day-cell:not(.empty-day)')[hoje.getDate() - 1] : null;

    if (diaAtual) {
        diaAtual.scrollIntoView({ behavior: 'smooth', block: 'center' });
        diaAtual.classList.add('today-focus');
        window.setTimeout(() => diaAtual.classList.remove('today-focus'), 1400);
    }
});

montarCalendario();
carregarResumo();
