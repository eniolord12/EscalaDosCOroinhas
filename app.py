from flask import Flask, jsonify
from flask_cors import CORS
import json
import os

app = Flask(__name__)
# Libera o CORS para que o seu HTML (mesmo rodando num arquivo local) possa acessar a API
CORS(app) 

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
ARQUIVO_JSON = os.path.join(BASE_DIR, 'dados_coroinhas.json')

def carregar_dados():
    """Lê o arquivo JSON existente ou retorna uma lista vazia se não existir."""
    if os.path.exists(ARQUIVO_JSON):
        with open(ARQUIVO_JSON, 'r', encoding='utf-8') as f:
            try:
                return json.load(f)
            except json.JSONDecodeError:
                return []
    return []

@app.route('/api/coroinhas', methods=['GET'])
def listar_coroinhas():
    """Retorna os cadastros feitos manualmente em dados_coroinhas.json."""
    return jsonify(carregar_dados())

if __name__ == '__main__':
    # Inicia o servidor na porta 5000
    print("Servidor rodando em http://localhost:5000")
    app.run(debug=True, port=5000)