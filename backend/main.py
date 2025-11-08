# main.py - O Cérebro do Nosso Robô (v1.3 - Usando CollectionGroup)
import firebase_admin
from firebase_admin import credentials, firestore
import os

# --- 1. CONFIGURAÇÃO ---
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
SERVICE_ACCOUNT_KEY_PATH = os.path.join(BASE_DIR, 'serviceAccountKey.json')

# --- 2. INICIALIZAÇÃO DO FIREBASE ADMIN ---
try:
    cred = credentials.Certificate(SERVICE_ACCOUNT_KEY_PATH)
    project_id = cred.project_id 
    
    firebase_admin.initialize_app(cred, {
        'projectId': project_id
    })
    
    db = firestore.client()
    
    print(f"Sucesso! Conectado ao Firebase (Projeto: {project_id})\n")

except Exception as e:
    print(f"--- ERRO DE CONEXÃO ---")
    print(f"Verifique se o 'serviceAccountKey.json' está na pasta 'backend'.")
    print(f"Erro: {e}")
    exit()

# --- 3. LÓGICA DO ROBÔ (Ler Processos e Clientes) ---

def ler_dados_do_banco():
    """
    Função principal do robô:
    Usa 'collectionGroup' para encontrar *todos* os processos e clientes.
    """
    print("Iniciando robô... Lendo dados do Firestore...")
    
    try:
        # --- ALTERADO: Lógica de Leitura com CollectionGroup ---
        
        # 1. Busca TODOS os documentos em QUALQUER coleção chamada 'processos'
        print("\n--- Lendo TODOS os Processos ---")
        processos_ref = db.collection_group('processos')
        processos = processos_ref.stream()
        
        total_processos = 0
        for proc in processos:
            proc_data = proc.to_dict() 
            print(f"  [Processo Encontrado] ID: {proc.id}")
            print(f"    Nº: {proc_data.get('numeroProcesso')}")
            print(f"    Cliente: {proc_data.get('nomeCliente')}")
            print(f"    Status: {proc_data.get('status')}")
            # O 'parent.parent' nos mostra "quem é o dono"
            print(f"    Proprietário (Usuário): {proc.reference.parent.parent.id}") 
            total_processos += 1

        if total_processos == 0:
            print("  (Nenhum processo encontrado no banco de dados)")
        
        # 2. Busca TODOS os documentos em QUALQUER coleção chamada 'clientes'
        print("\n--- Lendo TODOS os Clientes ---")
        clientes_ref = db.collection_group('clientes')
        clientes = clientes_ref.stream()
        
        total_clientes = 0
        for cli in clientes:
            cli_data = cli.to_dict()
            print(f"  [Cliente Encontrado] ID: {cli.id}")
            print(f"    Nome: {cli_data.get('nome')}")
            print(f"    Email: {cli_data.get('email')}")
            print(f"    Proprietário (Usuário): {cli.reference.parent.parent.id}")
            total_clientes += 1
            
        if total_clientes == 0:
            print("  (Nenhum cliente encontrado no banco de dados)")
        
        # --- FIM DA ALTERAÇÃO ---

        print("\n--- Robô finalizado ---")
        print(f"Total de processos encontrados: {total_processos}")
        print(f"Total de clientes encontrados: {total_clientes}")

    except Exception as e:
        print(f"Erro ao ler dados: {e}")

# --- 4. EXECUTAR O ROBÔ ---
if __name__ == "__main__":
    ler_dados_do_banco()