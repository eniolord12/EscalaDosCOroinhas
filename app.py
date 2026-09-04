from datetime import date, datetime, timedelta
from flask import Flask, jsonify, request, send_from_directory, session
from flask_cors import CORS
import json
import os
import random

app = Flask(__name__)
# Libera o CORS para que o seu HTML (mesmo rodando num arquivo local) possa acessar a API
CORS(app) 
app.secret_key = os.environ.get('ESCALA_SECRET_KEY', 'chave-local-da-escala')

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
ARQUIVO_JSON = os.path.join(BASE_DIR, 'dados_coroinhas.json')
ARQUIVO_ESCALA = os.path.join(BASE_DIR, 'escala_mensal.json')
SENHA_ADMIN = 'CFojp-1992!'

CONFIGURACAO_MISSA = {
    2: {'dia': 'Quarta-feira', 'horario': '06:00', 'quantidade': 4},
    3: {'dia': 'Quinta-feira', 'horario': '19:30', 'quantidade': 8},
    5: {'dia': 'Sábado', 'horario': '19:00', 'quantidade': 10},
    6: {'dia': 'Domingo', 'horario': '19:00', 'quantidade': 10},
}

DIA_JSON_POR_WEEKDAY = {
    0: 'Domingo', 1: 'Segunda', 2: 'Quarta', 3: 'Quinta',
    4: 'Sexta', 5: 'Sabado', 6: 'Domingo',
}

def carregar_dados():
    """Lê o arquivo JSON existente ou retorna uma lista vazia se não existir."""
    if os.path.exists(ARQUIVO_JSON):
        with open(ARQUIVO_JSON, 'r', encoding='utf-8') as f:
            try:
                return json.load(f)
            except json.JSONDecodeError:
                return []
    return []

def carregar_escala():
    if not os.path.exists(ARQUIVO_ESCALA):
        return None
    try:
        with open(ARQUIVO_ESCALA, 'r', encoding='utf-8') as arquivo:
            return json.load(arquivo)
    except json.JSONDecodeError:
        return None


def salvar_escala(escala):
    with open(ARQUIVO_ESCALA, 'w', encoding='utf-8') as arquivo:
        json.dump(escala, arquivo, ensure_ascii=False, indent=4)


def esta_disponivel(coroinha, data):
    bloqueios = coroinha.get('bloqueios') or {}
    dia = DIA_JSON_POR_WEEKDAY[data.weekday()]
    if dia in bloqueios.get('dias_semana', []):
        return False
    if data.day in bloqueios.get('datas_especificas', []):
        return False
    return True


def grupos_de_coroinhas(coroinhas):
    por_id = {coroinha['id']: coroinha for coroinha in coroinhas}
    relacionados = {coroinha['id']: set() for coroinha in coroinhas}
    for coroinha in coroinhas:
        vinculo_id = coroinha.get('vinculo_id')
        if vinculo_id in por_id:
            relacionados[coroinha['id']].add(vinculo_id)
            relacionados[vinculo_id].add(coroinha['id'])
    grupos = []
    visitados = set()

    for coroinha in coroinhas:
        if coroinha['id'] in visitados:
            continue
        ids_grupo = set()
        fila = [coroinha['id']]
        while fila:
            id_atual = fila.pop()
            if id_atual in ids_grupo:
                continue
            ids_grupo.add(id_atual)
            fila.extend(relacionados[id_atual] - ids_grupo)
        visitados.update(ids_grupo)
        grupos.append([por_id[id_grupo] for id_grupo in ids_grupo])
    return grupos


def semana_do_mes(data):
    return ((data.day - 1) // 7) + 1


def grupo_tem_dia_fixo(grupo, data):
    dia = DIA_JSON_POR_WEEKDAY[data.weekday()]
    semana = semana_do_mes(data)
    return any(
        regra.get('semana') == semana and regra.get('dia') == dia
        for item in grupo
        for regra in item.get('fixos', [])
    )


def servicos_padrao(ano, mes):
    primeiro_dia = date(ano, mes, 1)
    ultimo_dia = date(ano + (mes == 12), 1 if mes == 12 else mes + 1, 1) - timedelta(days=1)
    servicos = []
    data_atual = primeiro_dia
    while data_atual <= ultimo_dia:
        configuracao = CONFIGURACAO_MISSA.get(data_atual.weekday())
        if configuracao:
            servicos.append({
                'data': data_atual.isoformat(),
                'dia': configuracao['dia'],
                'horario': configuracao['horario'],
                'quantidade': configuracao['quantidade'],
            })
        data_atual += timedelta(days=1)
    return servicos


def sortear_escala(ano, mes, servicos_configurados=None):
    coroinhas = [item for item in carregar_dados() if item.get('status_ativo', True)]
    grupos = grupos_de_coroinhas(coroinhas)
    quantidade_por_id = {item['id']: 0 for item in coroinhas}
    ultima_data_por_id = {}
    servicos = []
    avisos = []
    if servicos_configurados is None:
        servicos_configurados = servicos_padrao(ano, mes)
    for servico_configurado in sorted(servicos_configurados, key=lambda item: item['data']):
        data_atual = date.fromisoformat(servico_configurado['data'])
        configuracao = {
            'dia': servico_configurado.get('dia') or data_atual.strftime('%A'),
            'horario': servico_configurado.get('horario', ''),
            'quantidade': int(servico_configurado.get('quantidade', 0)),
        }
        if configuracao['quantidade'] > 0:
            candidatos = []
            fixos = []
            for grupo in grupos:
                if all(esta_disponivel(item, data_atual) for item in grupo):
                    if all(ultima_data_por_id.get(item['id']) != data_atual - timedelta(days=1) for item in grupo):
                        (fixos if grupo_tem_dia_fixo(grupo, data_atual) else candidatos).append(grupo)

            random.shuffle(fixos)
            random.shuffle(candidatos)
            candidatos = fixos + candidatos
            candidatos.sort(key=lambda grupo: sum(quantidade_por_id[item['id']] for item in grupo) / len(grupo))
            escolhidos = []
            total = 0
            for grupo in candidatos:
                tamanho = len(grupo)
                if total + tamanho <= configuracao['quantidade']:
                    escolhidos.append(grupo)
                    total += tamanho
                if total == configuracao['quantidade']:
                    break

            if total < configuracao['quantidade']:
                avisos.append(f'{data_atual.strftime("%d/%m/%Y")}: foram encontrados {total} de {configuracao["quantidade"]} coroinhas disponíveis.')

            nomes = []
            ids = []
            for grupo in escolhidos:
                for item in grupo:
                    ids.append(item['id'])
                    nomes.append(item.get('nome_escala') or item.get('nome_completo'))
                    quantidade_por_id[item['id']] += 1
                    ultima_data_por_id[item['id']] = data_atual
            servicos.append({
                'data': data_atual.isoformat(),
                'dia': configuracao['dia'],
                'horario': configuracao['horario'],
                'quantidade': configuracao['quantidade'],
                'coroinha_ids': ids,
                'coroinhas': nomes,
            })

    return {
        'ano': ano,
        'mes': mes,
        'gerada_em': datetime.now().isoformat(timespec='seconds'),
        'servicos': servicos,
        'participacoes': quantidade_por_id,
        'avisos': avisos,
    }


@app.route('/')
def pagina_inicial():
    return send_from_directory(BASE_DIR, 'index.html')


@app.route('/api/escala', methods=['GET'])
def visualizar_escala():
    return jsonify(carregar_escala() or {'servicos': [], 'avisos': []})


def administrador_exigido():
    return session.get('administrador')


@app.route('/api/admin/coroinhas', methods=['GET'])
def listar_coroinhas_admin():
    if not administrador_exigido():
        return jsonify({'erro': 'Faça login como administrador.'}), 401
    return jsonify([
        {'id': item['id'], 'nome': item.get('nome_escala') or item.get('nome_completo')}
        for item in carregar_dados()
        if item.get('status_ativo', True)
    ])


@app.route('/api/admin/login', methods=['POST'])
def login_admin():
    dados = request.get_json(silent=True) or {}
    if dados.get('senha') != SENHA_ADMIN:
        return jsonify({'erro': 'Senha inválida.'}), 401
    session['administrador'] = True
    return jsonify({'mensagem': 'Acesso administrativo liberado.'})


@app.route('/api/admin/sortear', methods=['POST'])
def gerar_escala():
    if not administrador_exigido():
        return jsonify({'erro': 'Faça login como administrador para sortear a escala.'}), 401
    dados = request.get_json(silent=True) or {}
    ano = int(dados.get('ano', 2026))
    mes = int(dados.get('mes', 10))
    servicos = dados.get('servicos')
    if servicos is not None:
        try:
            for servico in servicos:
                date.fromisoformat(servico['data'])
                if int(servico.get('quantidade', 0)) < 0:
                    raise ValueError
        except (KeyError, TypeError, ValueError):
            return jsonify({'erro': 'A configuração dos serviços é inválida.'}), 400
    escala = sortear_escala(ano, mes, servicos)
    salvar_escala(escala)
    return jsonify(escala)


@app.route('/api/admin/escala', methods=['PUT'])
def editar_escala():
    if not administrador_exigido():
        return jsonify({'erro': 'Faça login como administrador.'}), 401
    dados = request.get_json(silent=True) or {}
    escala = carregar_escala() or {'servicos': [], 'avisos': []}
    servico = next((item for item in escala['servicos'] if item['data'] == dados.get('data')), None)
    if not servico:
        return jsonify({'erro': 'Serviço não encontrado.'}), 404

    coroinhas = {item['id']: item for item in carregar_dados()}
    ids = [int(item) for item in dados.get('coroinha_ids', [])]
    if len(ids) != len(set(ids)) or any(item_id not in coroinhas for item_id in ids):
        return jsonify({'erro': 'A lista de coroinhas contém IDs inválidos ou repetidos.'}), 400
    servico['coroinha_ids'] = ids
    servico['coroinhas'] = [coroinhas[item_id].get('nome_escala') or coroinhas[item_id].get('nome_completo') for item_id in ids]
    escala['gerada_em'] = datetime.now().isoformat(timespec='seconds')
    escala['participacoes'] = {str(item['id']): 0 for item in coroinhas.values() if item.get('status_ativo', True)}
    for item in escala['servicos']:
        for item_id in item.get('coroinha_ids', []):
            escala['participacoes'][str(item_id)] = escala['participacoes'].get(str(item_id), 0) + 1
    salvar_escala(escala)
    return jsonify(escala)

if __name__ == '__main__':
    # Inicia o servidor na porta 5000
    print("Servidor rodando em http://localhost:5000")
    app.run(debug=True, port=5000)