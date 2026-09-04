# Escala dos Coroinhas

Programa de terminal feito somente com Python e JSON. Não usa site, Flask,
banco de dados ou internet.

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

Depois de salvar o JSON, execute:

```text
python app.py
```

## Sorteio da escala

Ao iniciar, o programa pergunta o ano, o mês, qual foi a escala do mês anterior,
quantas semanas o mês terá, quantos coroinhas serão escalados em cada quarta,
quinta, sábado e domingo, e o mínimo mensal de cada coroinha. As missas são
criadas automaticamente nesses quatro dias da semana. Para a escala anterior,
informe o caminho de um JSON, deixe vazio para procurar automaticamente o
arquivo exato do mês anterior em `escalas/` ou digite `nao` no primeiro mês.

O sorteio considera dias da semana bloqueados, datas específicas bloqueadas,
dias fixos, vínculos por `id`, prioridade para quem ainda não atingiu o mínimo,
equilíbrio de participações, recompensa quem serviu menos na escala anterior e
aplica a regra de não escalar a mesma pessoa em dias consecutivos. Quando as
regras forem incompatíveis, o programa salva a melhor escala possível e registra
um aviso no JSON.

Cada escala é salva em `escalas/escala_ANO_MES.json`. O cadastro continua sendo
mantido manualmente em `dados_coroinhas.json`; os campos `dias_semana`,
`datas_especificas`, `fixos` e `vinculo_id` controlam as regras do sorteio.

