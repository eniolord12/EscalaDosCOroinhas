from datetime import date, datetime, timedelta
import json
import random
import unicodedata
from pathlib import Path


BASE_DIR = Path(__file__).resolve().parent
ARQUIVO_DADOS = BASE_DIR / 'dados_coroinhas.json'
PASTA_ESCALAS = BASE_DIR / 'escalas'

DIAS_SEMANA = {
    0: 'Segunda-feira', 1: 'Terça-feira', 2: 'Quarta-feira',
    3: 'Quinta-feira', 4: 'Sexta-feira', 5: 'Sábado', 6: 'Domingo',
}
MESES = (
    'JANEIRO', 'FEVEREIRO', 'MARÇO', 'ABRIL', 'MAIO', 'JUNHO',
    'JULHO', 'AGOSTO', 'SETEMBRO', 'OUTUBRO', 'NOVEMBRO', 'DEZEMBRO',
)


def sem_acento(valor):
    texto = unicodedata.normalize('NFD', str(valor))
    return ''.join(char for char in texto if unicodedata.category(char) != 'Mn').lower()


def carregar_dados():
    try:
        with ARQUIVO_DADOS.open('r', encoding='utf-8') as arquivo:
            dados = json.load(arquivo)
    except (FileNotFoundError, json.JSONDecodeError) as erro:
        raise RuntimeError(f'Nao foi possivel ler {ARQUIVO_DADOS.name}: {erro}') from erro
    if not isinstance(dados, list):
        raise RuntimeError(f'{ARQUIVO_DADOS.name} deve conter uma lista de coroinhas.')
    return [item for item in dados if item.get('status_ativo', True)]


def esta_disponivel(coroinha, data_atual):
    bloqueios = coroinha.get('bloqueios') or {}
    dia = sem_acento(DIAS_SEMANA[data_atual.weekday()])
    dias_bloqueados = {sem_acento(item) for item in bloqueios.get('dias_semana', [])}
    datas_bloqueadas = {int(item) for item in bloqueios.get('datas_especificas', [])}
    return dia not in dias_bloqueados and data_atual.day not in datas_bloqueadas


def grupos_de_coroinhas(coroinhas):
    por_id = {item['id']: item for item in coroinhas}
    relacionados = {item['id']: set() for item in coroinhas}
    for item in coroinhas:
        vinculo_id = item.get('vinculo_id')
        if vinculo_id in por_id:
            relacionados[item['id']].add(vinculo_id)
            relacionados[vinculo_id].add(item['id'])

    grupos = []
    visitados = set()
    for item in coroinhas:
        if item['id'] in visitados:
            continue
        ids_grupo = set()
        fila = [item['id']]
        while fila:
            id_atual = fila.pop()
            if id_atual in ids_grupo:
                continue
            ids_grupo.add(id_atual)
            fila.extend(relacionados[id_atual] - ids_grupo)
        visitados.update(ids_grupo)
        grupos.append([por_id[id_grupo] for id_grupo in ids_grupo])
    return grupos


def semana_do_mes(data_atual):
    return ((data_atual.day - 1) // 7) + 1


def grupo_tem_dia_fixo(grupo, data_atual):
    dia_atual = sem_acento(DIAS_SEMANA[data_atual.weekday()])
    semana_atual = semana_do_mes(data_atual)
    return any(
        int(regra.get('semana', -1)) == semana_atual
        and sem_acento(regra.get('dia', '')) == dia_atual
        for item in grupo
        for regra in item.get('fixos', [])
    )


def datas_das_missas(ano, mes, semanas, quantidades):
    ultimo_dia = (date(ano + (mes == 12), 1 if mes == 12 else mes + 1, 1)
                  - timedelta(days=1)).day
    datas = []
    for dia_do_mes in range(1, ultimo_dia + 1):
        data_atual = date(ano, mes, dia_do_mes)
        dia_semana = data_atual.weekday()
        semana = semana_do_mes(data_atual)
        if dia_semana in quantidades and semana <= semanas:
            datas.append(data_atual)
    return datas


def sortear_escala(
    ano, mes, semanas, quantidades, minimo_mensal, participacoes_anteriores=None,
):
    coroinhas = carregar_dados()
    grupos = grupos_de_coroinhas(coroinhas)
    participacoes_anteriores = participacoes_anteriores or {}
    participacoes = {str(item['id']): 0 for item in coroinhas}
    ultima_data_por_id = {}
    avisos = []
    servicos = []

    datas = datas_das_missas(ano, mes, semanas, quantidades)
    for data_atual in datas:
        quantidade_por_missa = quantidades[data_atual.weekday()]
        candidatos = []
        for grupo in grupos:
            ids = [str(item['id']) for item in grupo]
            if not all(esta_disponivel(item, data_atual) for item in grupo):
                continue
            if any(ultima_data_por_id.get(id_atual) == data_atual - timedelta(days=1) for id_atual in ids):
                continue
            candidatos.append({
                'grupo': grupo,
                'fixo': grupo_tem_dia_fixo(grupo, data_atual),
                'tamanho': len(grupo),
            })

        random.shuffle(candidatos)
        escolhidos = []
        total = 0
        candidatos.sort(key=lambda item: (
            not item['fixo'],
            sum(
                participacoes_anteriores.get(str(pessoa['id']), 0)
                for pessoa in item['grupo']
            ),
            -sum(
                participacoes[str(pessoa['id'])] < minimo_mensal
                for pessoa in item['grupo']
            ),
            min(participacoes[str(pessoa['id'])] for pessoa in item['grupo']),
        ))
        for candidato in candidatos:
            if total + candidato['tamanho'] <= quantidade_por_missa:
                escolhidos.append(candidato['grupo'])
                total += candidato['tamanho']
            if total == quantidade_por_missa:
                break

        if total < quantidade_por_missa:
            avisos.append(
                f'{data_atual:%d/%m/%Y}: foram encontradas {total} de '
                f'{quantidade_por_missa} vagas possiveis.'
            )

        ids_escolhidos = []
        nomes_escolhidos = []
        for grupo in escolhidos:
            for item in grupo:
                id_atual = str(item['id'])
                ids_escolhidos.append(item['id'])
                nomes_escolhidos.append(item.get('nome_escala') or item.get('nome_completo'))
                participacoes[id_atual] += 1
                ultima_data_por_id[id_atual] = data_atual

        servicos.append({
            'data': data_atual.isoformat(),
            'dia': DIAS_SEMANA[data_atual.weekday()],
            'quantidade': quantidades[data_atual.weekday()],
            'coroinha_ids': ids_escolhidos,
            'coroinhas': nomes_escolhidos,
        })

    abaixo_do_minimo = [
        item for item in coroinhas if participacoes[str(item['id'])] < minimo_mensal
    ]
    if abaixo_do_minimo:
        nomes = ', '.join(item.get('nome_escala') or item.get('nome_completo') for item in abaixo_do_minimo)
        avisos.append(f'Abaixo do minimo de {minimo_mensal}: {nomes}.')

    return {
        'ano': ano,
        'mes': mes,
        'semanas': semanas,
        'quantidades_por_dia': quantidades,
        'minimo_mensal': minimo_mensal,
        'participacoes_anteriores': participacoes_anteriores,
        'gerada_em': datetime.now().isoformat(timespec='seconds'),
        'servicos': servicos,
        'participacoes': participacoes,
        'avisos': avisos,
    }


def perguntar_inteiro(pergunta, minimo=None, maximo=None, padrao=None):
    while True:
        sufixo = f' [{padrao}]' if padrao is not None else ''
        resposta = input(f'{pergunta}{sufixo}: ').strip()
        if not resposta and padrao is not None:
            return padrao
        try:
            valor = int(resposta)
            if (minimo is not None and valor < minimo) or (maximo is not None and valor > maximo):
                raise ValueError
            return valor
        except ValueError:
            print(f'Informe um numero valido entre {minimo} e {maximo}.')


def ler_mes():
    nomes = {
        'janeiro': 1, 'fevereiro': 2, 'marco': 3, 'abril': 4, 'maio': 5, 'junho': 6,
        'julho': 7, 'agosto': 8, 'setembro': 9, 'outubro': 10, 'novembro': 11, 'dezembro': 12,
    }
    while True:
        resposta = sem_acento(input('Qual mes estamos? (numero ou nome): ').strip())
        if resposta.isdigit() and 1 <= int(resposta) <= 12:
            return int(resposta)
        if resposta in nomes:
            return nomes[resposta]
        print('Informe um mes de 1 a 12 ou o nome do mes.')


def ler_escala_anterior(ano, mes):
    resposta = input(
        'Qual foi a escala do mes anterior? '
        '(caminho do JSON ou Enter para procurar automaticamente): '
    ).strip()
    if resposta.lower() in {'nao', 'não', 'nenhuma'}:
        return {}, None

    if resposta:
        caminho = Path(resposta)
    else:
        mes_anterior = 12 if mes == 1 else mes - 1
        ano_anterior = ano - 1 if mes == 1 else ano
        caminho = PASTA_ESCALAS / f'escala_{ano_anterior}_{mes_anterior:02d}.json'

    if not caminho.exists():
        print(f'Arquivo nao encontrado: {caminho}. O sorteio continuara sem escala anterior.')
        return {}, None

    try:
        with caminho.open('r', encoding='utf-8') as arquivo:
            escala = json.load(arquivo)
    except (OSError, json.JSONDecodeError) as erro:
        print(f'Nao foi possivel ler a escala anterior: {erro}')
        return {}, None

    participacoes = {str(id_atual): int(quantidade) for id_atual, quantidade in (escala.get('participacoes') or {}).items()}
    if not participacoes:
        for servico in escala.get('servicos', []):
            for id_atual in servico.get('coroinha_ids', []):
                id_texto = str(id_atual)
                participacoes[id_texto] = participacoes.get(id_texto, 0) + 1
    return participacoes, caminho


def salvar_escala(escala):
    PASTA_ESCALAS.mkdir(exist_ok=True)
    destino = PASTA_ESCALAS / f'escala_{escala["ano"]}_{escala["mes"]:02d}.json'
    with destino.open('w', encoding='utf-8') as arquivo:
        json.dump(escala, arquivo, ensure_ascii=False, indent=4)
    return destino


def imprimir_escala(escala):
    print(f'\n{MESES[escala["mes"] - 1]}\n')
    for indice, servico in enumerate(escala['servicos']):
        data_servico = date.fromisoformat(servico['data'])
        dia_semana = DIAS_SEMANA[data_servico.weekday()].split('-')[0]
        print(dia_semana)
        print(data_servico.strftime('%d/%m'))
        print('\n'.join(servico['coroinhas']))
        if indice < len(escala['servicos']) - 1:
            print('\n')


def main():
    print('=== Sorteio da escala dos coroinhas ===')
    ano = perguntar_inteiro('Qual ano?', minimo=1, padrao=datetime.now().year)
    mes = ler_mes()
    participacoes_anteriores, arquivo_anterior = ler_escala_anterior(ano, mes)
    semanas = perguntar_inteiro('Quantas semanas tem esse mes?', minimo=1, maximo=5)
    quantidades = {}
    for numero_dia, nome_dia in ((2, 'quarta-feira'), (3, 'quinta-feira'), (5, 'sabado'), (6, 'domingo')):
        quantidades[numero_dia] = perguntar_inteiro(
            f'Quantos coroinhas serao escalados na {nome_dia}?', minimo=1
        )
    minimo = perguntar_inteiro('Quantas vezes por mes cada coroinha deve servir no minimo?', minimo=0)

    try:
        escala = sortear_escala(
            ano, mes, semanas, quantidades, minimo, participacoes_anteriores
        )
        destino = salvar_escala(escala)
    except (RuntimeError, ValueError) as erro:
        print(f'Erro: {erro}')
        return

    imprimir_escala(escala)
    if escala['avisos']:
        print('\nAvisos:')
        for aviso in escala['avisos']:
            print(f'- {aviso}')


if __name__ == '__main__':
    main()
