document.getElementById('formCadastro').addEventListener('submit', function (event) {
    // Impede o comportamento padrão de recarregar a página ao enviar o formulário
    event.preventDefault();

    // 1. Identificação Básica
    const nomeCompleto = document.getElementById('nomeCompleto').value;
    const nomeEscala = document.getElementById('nomeEscala').value;
    const statusAtivo = document.getElementById('statusAtivo').checked;

    // 2. Bloqueios de Dias da Semana
    // Seleciona todos os checkboxes marcados dentro da div .dias-semana
    const diasSemanaBloqueados = [];
    const checkboxesDias = document.querySelectorAll('.dias-semana input[type="checkbox"]:checked');
    checkboxesDias.forEach(function (checkbox) {
        diasSemanaBloqueados.push(checkbox.value);
    });

    // 3. Datas Específicas Bloqueadas
    // Pega a string "12, 15, 20", separa pela vírgula, remove espaços e transforma em número inteiro
    const stringDatas = document.getElementById('datasBloqueadas').value;
    const datasBloqueadas = stringDatas
        ? stringDatas.split(',').map(num => parseInt(num.trim())).filter(num => !isNaN(num))
        : [];

    // 4. Bloqueio de Semana Específica
    const bloqueioSemana = document.getElementById('bloqueioSemana').value;
    const bloqueioDiaSemana = document.getElementById('bloqueioDiaSemana').value;
    const semanaEspecifica = [];

    if (bloqueioSemana && bloqueioDiaSemana) {
        semanaEspecifica.push({
            semana: parseInt(bloqueioSemana),
            dia: bloqueioDiaSemana
        });
    }

    // 5. Dias Fixos
    const fixoSemana = document.getElementById('fixoSemana').value;
    const fixoDiaSemana = document.getElementById('fixoDiaSemana').value;
    const fixos = [];

    if (fixoSemana && fixoDiaSemana) {
        fixos.push({
            semana: parseInt(fixoSemana),
            dia: fixoDiaSemana
        });
    }

    // 6. Vínculos
    const vinculoValor = document.getElementById('vinculoIrmao').value;
    const vinculoId = vinculoValor ? parseInt(vinculoValor) : null;

    // 7. Montagem do Objeto JSON
    const dadosCoroinha = {
        nome_completo: nomeCompleto,
        nome_escala: nomeEscala,
        status_ativo: statusAtivo,
        bloqueios: {
            dias_semana: diasSemanaBloqueados,
            datas_especificas: datasBloqueadas,
            semana_especifica: semanaEspecifica
        },
        fixos: fixos,
        vinculo_id: vinculoId
    };

    // Exibe o JSON final no console do navegador (F12)
    console.log("JSON gerado com sucesso:");
    console.log(JSON.stringify(dadosCoroinha, null, 2));

    const listaCoroinhas = document.getElementById('listaCoroinhas');

    function criarItemCoroinha(coroinha) {
        const item = document.createElement('li');
        const nome = coroinha.nome_escala || coroinha.nome_completo || 'Sem nome';
        const status = coroinha.status_ativo === false ? 'Inativo' : 'Ativo';

        item.innerHTML = `<strong>${nome}</strong><span>${status}</span>`;
        return item;
    }

    fetch('/api/coroinhas')
        .then(response => {
            if (!response.ok) {
                throw new Error('Não foi possível carregar os cadastros.');
            }
            return response.json();
        })
        .then(coroinhas => {
            listaCoroinhas.replaceChildren();

            if (!coroinhas.length) {
                listaCoroinhas.innerHTML = '<li class="empty-state">Nenhum coroinha cadastrado no JSON.</li>';
                return;
            }

            coroinhas.forEach(coroinha => {
                listaCoroinhas.appendChild(criarItemCoroinha(coroinha));
            });
        })
        .catch(error => {
            listaCoroinhas.innerHTML = `<li class="error-state">${error.message}</li>`;
        });
});