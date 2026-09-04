# Escala dos Coroinhas

Os cadastros são mantidos manualmente em `dados_coroinhas.json`. Não é necessário
usar banco de dados nem cadastrar pelo formulário.

## Como cadastrar

Edite o arquivo `dados_coroinhas.json` como uma lista de objetos. Exemplo:

```json
[
	{
		"id": 1,
		"nome_completo": "João da Silva",
		"nome_escala": "João S.",
		"status_ativo": true,
		"bloqueios": {
			"dias_semana": ["Sabado"],
			"datas_especificas": [12, 25],
			"semana_especifica": []
		},
		"fixos": [],
		"vinculo_id": null
	}
]
```

Depois de salvar o JSON, inicie o servidor:

```text
python app.py
```

Acesse `http://localhost:5000`. Os registros do arquivo são usados internamente
para montar a escala e não são exibidos aos usuários públicos.

## Sorteio da escala

O padrão mensal já está configurado no sistema:

- Quarta-feira às 06:00: 4 coroinhas;
- Quinta-feira às 19:30: 8 coroinhas;
- Sábado às 19:00: 10 coroinhas;
- Domingo às 19:00: 10 coroinhas.

O sorteio considera disponibilidade, dias fixos, vínculos, equilíbrio de
participações e evita escalar a mesma pessoa em dias consecutivos. A escala
publicada fica em `escala_mensal.json`.

Para proteger a área administrativa, a senha configurada é exatamente:

```text
CFojp-1992!
```

A confirmação é sensível a maiúsculas, minúsculas, hífen e exclamação. Portanto,
somente a sequência idêntica será aceita.

Para iniciar o servidor:

```text
python app.py
```

Somente quem tiver essa senha consegue gerar e substituir a escala; os demais
usuários apenas visualizam a escala publicada.

