import os
import io
import requests
import base64
import fitz  # Biblioteca PyMuPDF (para converter PDF em imagem)
from supabase import create_client, Client
from PIL import Image

# ==============================================================================
# 1. CONFIGURAÇÃO (SUBSTITUA AS CHAVES AQUI)
# ==============================================================================

# Cole a URL do seu projeto Supabase
SUPABASE_URL = "https://kwuncdbjoeowfqcdkomc.supabase.co"

# Cole a chave 'anon public' do seu projeto Supabase
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt3dW5jZGJqb2Vvd2ZxY2Rrb21jIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI2MzAwOTQsImV4cCI6MjA3ODIwNjA5NH0.IG1PUa-Yx99SzjM_pifxwY135p_3azEqHty98KNNakM"

# Nome do Bucket de Arquivos
BUCKET_NAME = "documentos" 

# Configuração do Ollama (IA Local)
OLLAMA_URL = "http://localhost:11434/api/generate"
OLLAMA_MODEL = "llava"

# ==============================================================================
# 2. LÓGICA DO ROBÔ
# ==============================================================================

def iniciar_robo():
    print("\n--- ROBÔ JURÍDICO (VISÃO REAL / PyMuPDF) ---")
    
    # A. Testar Ollama
    try:
        requests.get("http://localhost:11434")
        print("[OK] Ollama detectado.")
    except:
        print("[ERRO] O Ollama não está rodando. Abra o aplicativo.")
        return

    # B. Conectar ao Supabase
    try:
        supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
        print("[OK] Conectado ao Supabase.")

        # C. Buscar documentos
        # Pegamos o ÚLTIMO arquivo enviado para garantir que vamos re-analisar o seu cartão
        print(">>> Buscando o documento mais recente...")
        
        response = supabase.table('documentos').select("*").order('created_at', desc=True).limit(1).execute()
        documentos = response.data

        if not documentos:
            print(">>> Nenhum documento encontrado.")
            return

        doc = documentos[0] 
        print(f">>> Processando: {doc['nome_arquivo']}")
        
        processar_documento(supabase, doc)

    except Exception as e:
        print(f"\n[ERRO GERAL]: {e}")


def processar_documento(supabase, doc):
    doc_id = doc['id']
    caminho_storage = doc['caminho_storage']
    
    try:
        # 1. Baixar o PDF
        print("  - Baixando PDF da nuvem...")
        res_bytes = supabase.storage.from_(BUCKET_NAME).download(caminho_storage)
        
        # 2. Converter PDF para Imagem (A MÁGICA)
        print("  - Convertendo PDF em Imagem (Tirando foto)...")
        imagem_base64 = converter_pdf_para_imagem(res_bytes)
        
        # 3. Enviar para IA
        print("  - Enviando imagem real para o LLaVA analisar...")
        resumo = analisar_com_ollama(imagem_base64)
        
        # 4. Salvar
        print("  - Salvando análise correta no banco...")
        supabase.table('documentos').update({'resumo_ia': resumo}).eq('id', doc_id).execute()
        
        print(f"  - [SUCESSO] Análise atualizada!")

    except Exception as e:
        print(f"  - [ERRO] {e}")


def converter_pdf_para_imagem(pdf_bytes):
    """Usa PyMuPDF para renderizar a primeira página como imagem."""
    # Abre o PDF da memória
    doc_pdf = fitz.open(stream=pdf_bytes, filetype="pdf")
    
    # Pega a página 1
    pagina = doc_pdf[0]
    
    # Tira a "foto" (Pixmap). Matrix(2,2) dobra a resolução para a IA ler melhor.
    pix = pagina.get_pixmap(matrix=fitz.Matrix(2, 2))
    
    # Converte para bytes PNG
    imagem_bytes = pix.tobytes("png")
    
    # Retorna em Base64 (formato que a IA aceita)
    return base64.b64encode(imagem_bytes).decode('utf-8')


def analisar_com_ollama(imagem_base64):
    prompt = """
    Você é um assistente jurídico inteligente.
    Analise a imagem deste documento real. Leia todo o texto visível.
    
    Responda EXATAMENTE neste formato:
    TIPO: [Identifique o documento. Ex: Cartão de Embarque, RG, Fatura]
    RESUMO: [Descreva o que é. Ex: Voo da Azul de Recife para SP]
    PARTES: [Nomes das pessoas e empresas]
    DATA: [Data e Hora do evento, se houver]
    """
    
    payload = {
        "model": OLLAMA_MODEL,
        "prompt": prompt,
        "images": [imagem_base64], 
        "stream": False 
    }

    try:
        response = requests.post(OLLAMA_URL, json=payload)
        response.raise_for_status()
        resultado = response.json()['response'].strip()
        
        print("  > Resposta da IA:")
        print(resultado)
        return resultado
        
    except Exception as e:
        return f"Erro na IA: {str(e)}"

if __name__ == "__main__":
    iniciar_robo()