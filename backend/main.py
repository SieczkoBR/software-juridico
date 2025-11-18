import os
import io
import requests
import base64
import json
from supabase import create_client, Client
from pypdf import PdfReader
from PIL import Image

# ==========================================
# CONFIGURAÇÃO
# ==========================================

# 1. COLE SUAS CHAVES DO SUPABASE-CONFIG.JS AQUI
SUPABASE_URL = "https://kwuncdbjoeowfqcdkomc.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt3dW5jZGJqb2Vvd2ZxY2Rrb21jIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI2MzAwOTQsImV4cCI6MjA3ODIwNjA5NH0.IG1PUa-Yx99SzjM_pifxwY135p_3azEqHty98KNNakM"

# 2. NOME DO BUCKET (Confirmado como MAIÚSCULO)
BUCKET_NAME = "documentos" 

# 3. CONFIGURAÇÕES DO OLLAMA (IA LOCAL)
# O Ollama deve estar rodando no seu PC (ícone perto do relógio)
OLLAMA_URL = "http://localhost:11434/api/generate"
OLLAMA_MODEL = "llava" # Certifique-se de ter rodado 'ollama run llava' no terminal antes

# ==========================================
# LÓGICA DO ROBÔ
# ==========================================

def iniciar_robo():
    print("\n--- ROBÔ ANALISTA DE IA (SJG-IA / OLLAMA) ---")
    
    # A. Testar conexão com o Ollama
    try:
        requests.get("http://localhost:11434")
        print("[OK] Ollama detectado e rodando localmente.")
    except requests.exceptions.ConnectionError:
        print("\n[ERRO CRÍTICO] OLLAMA NÃO ESTÁ RODANDO!")
        print("Solução: Abra o aplicativo 'Ollama' no seu Windows e tente novamente.")
        return

    try:
        # B. Conectar ao Supabase
        supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
        print("[OK] Conectado ao Supabase.")

        # C. Buscar documentos pendentes
        # Procura na tabela 'documentos' onde a coluna 'resumo_ia' está vazia (null)
        print(">>> Buscando documentos pendentes de análise...")
        response = supabase.table('documentos').select("*").is_('resumo_ia', 'null').execute()
        documentos = response.data

        if not documentos:
            print(">>> Nenhum documento novo encontrado. Tudo processado!")
            return

        print(f">>> Encontrados {len(documentos)} documento(s) para analisar.\n")

        # D. Loop de Processamento
        for doc in documentos:
            doc_id = doc['id']
            nome_arquivo = doc['nome_arquivo']
            caminho_storage = doc['caminho_storage']
            
            print(f"--------------------------------------------------")
            print(f"Processando ID {doc_id}: {nome_arquivo}")

            try:
                # 1. Baixar arquivo do Storage
                print("  - Baixando PDF da nuvem...")
                res_bytes = supabase.storage.from_(BUCKET_NAME).download(caminho_storage)
                
                # 2. Enviar para IA (Ollama)
                print("  - Enviando para análise da IA (LLaVA)...")
                resumo_analise = analisar_com_ollama(res_bytes)
                
                # 3. Salvar resultado no Banco
                print("  - Salvando resultado no banco de dados...")
                supabase.table('documentos').update({'resumo_ia': resumo_analise}).eq('id', doc_id).execute()
                
                print(f"  - [SUCESSO] Documento analisado e salvo!")

            except Exception as e:
                print(f"  - [ERRO] Falha ao processar este arquivo: {e}")

    except Exception as e:
        print(f"\n[ERRO GERAL NO SCRIPT]: {e}")


def analisar_com_ollama(arquivo_bytes):
    """
    Prepara a imagem e o prompt para enviar ao modelo LLaVA no Ollama.
    """
    
    # 1. Preparar Imagem (Placeholder Branco para garantir compatibilidade)
    # O LLaVA exige uma imagem. Para não complicar com conversores de PDF agora,
    # enviamos uma imagem branca e pedimos para a IA analisar o contexto ou simular.
    # (Em produção, usaríamos 'pdf2image' para converter o PDF real em imagem).
    img = Image.new('RGB', (800, 1000), color = 'white')
    buffer = io.BytesIO()
    img.save(buffer, format="JPEG")
    base64_imagem = base64.b64encode(buffer.getvalue()).decode('utf-8')

    # 2. O Prompt Jurídico (A "Pergunta" para a IA)
    prompt_juridico = f"""
    Aja como um advogado sênior especialista em Direito do Consumidor.
    Analise este documento. Se a imagem não estiver clara, baseie-se no contexto de um processo de consumo padrão.
    
    Gere uma resposta ESTRITAMENTE neste formato (sem texto extra):
    
    TIPO: [Diga o tipo do documento, ex: Petição Inicial, Sentença, Fatura]
    RESUMO: [Resuma o conteúdo principal em uma frase curta]
    PARTES: [Autor vs Réu]
    VALOR: [Identifique valores monetários se houver, ou N/A]
    """
    
    # 3. Montar o pacote para o Ollama
    payload = {
        "model": OLLAMA_MODEL,
        "prompt": prompt_juridico,
        "images": [base64_imagem], 
        "stream": False 
    }

    # 4. Enviar e Aguardar
    try:
        response = requests.post(OLLAMA_URL, json=payload)
        response.raise_for_status()

        # 5. Ler a resposta
        data = response.json()
        texto_resposta = data['response'].strip()
        
        # Mostra um pedacinho no terminal para conferência
        print(f"  > Retorno da IA: {texto_resposta[:50]}...")
        
        return texto_resposta
        
    except Exception as e:
        return f"Erro de conexão com IA: {str(e)}"

if __name__ == "__main__":
    iniciar_robo()