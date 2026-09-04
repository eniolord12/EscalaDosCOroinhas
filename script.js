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
