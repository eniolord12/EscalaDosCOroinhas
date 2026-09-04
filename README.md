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

Acesse `http://localhost:5000`. Ao atualizar a página, os registros do arquivo
serão carregados automaticamente.

