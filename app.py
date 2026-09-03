from flask import Flask, request, jsonify
from flask_cors import CORS
import json
import os

app = Flask(__name__)
# Libera o CORS para que o seu HTML (mesmo rodando num arquivo local) possa acessar a API
CORS(app) 

ARQUIVO_JSON = 'dados_coroinhas.json'

def carregar_dados():
    """Lê o arquivo JSON existente ou retorna uma lista vazia se não existir."""
    if os.path.exists(ARQUIVO_JSON):
        with open(ARQUIVO_JSON, 'r', encoding='utf-8') as f:
            try:
                return json.load(f)
            except json.JSONDecodeError:
                return []
    return []

def salvar_dados(dados):
    """Escreve a lista atualizada de volta no arquivo JSON."""
    with open(ARQUIVO_JSON, 'w', encoding='utf-8') as f:
        json.dump(dados, f, ensure_ascii=False, indent=4)

@app.route('/api/cadastrar_coroinha', methods=['POST'])
def cadastrar_coroinha():
    # 1. Recebe o JSON enviado pelo JavaScript
    novo_coroinha = request.get_json()
    
    # 2. Carrega a lista atual do sistema
    coroinhas_cadastrados = carregar_dados()
    
    # 3. Gera um ID sequencial baseado no tamanho da lista
    novo_id = len(coroinhas_cadastrados) + 1
    novo_coroinha['id'] = novo_id
    
    # 4. Adiciona o novo registro e salva no arquivo
    coroinhas_cadastrados.append(novo_coroinha)
    salvar_dados(coroinhas_cadastrados)
    
    # 5. Retorna uma mensagem de sucesso para o front-end
    return jsonify({"mensagem": "Coroinha salvo com sucesso!", "id": novo_id}), 201

if __name__ == '__main__':
    # Inicia o servidor na porta 5000
    print("Servidor rodando em http://localhost:5000")
    app.run(debug=True, port=5000)