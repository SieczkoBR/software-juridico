import os
from supabase import create_client, Client

# --- 1. CONFIGURAÇÃO ---
# Copie estas chaves do seu arquivo 'supabase-config.js' ou do painel do Supabase
# (Em um projeto real, usaríamos variáveis de ambiente, mas aqui vamos direto ao ponto)

SUPABASE_URL = "https://kwuncdbjoeowfqcdkomc.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt3dW5jZGJqb2Vvd2ZxY2Rrb21jIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI2MzAwOTQsImV4cCI6MjA3ODIwNjA5NH0.IG1PUa-Yx99SzjM_pifxwY135p_3azEqHty98KNNakM"

def iniciar_robo():
    print("--- INICIANDO ROBÔ JURÍDICO (SUPABASE) ---")
    print("Conectando ao banco de dados...")

    try:
        # 1. Cria a conexão
        supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
        print("Conexão estabelecida!\n")

        # --- 2. LER CLIENTES ---
        print(">>> Buscando Clientes...")
        # Equivalente a: SELECT * FROM clientes ORDER BY nome
        response_clientes = supabase.table('clientes').select("*").order('nome').execute()
        lista_clientes = response_clientes.data

        print(f"Encontrados {len(lista_clientes)} clientes:")
        for cli in lista_clientes:
            print(f"  - [ID: {cli['id']}] {cli['nome']} | Email: {cli.get('email', 'N/A')}")

        print("-" * 30)

        # --- 3. LER PROCESSOS (COM RELACIONAMENTO) ---
        print("\n>>> Buscando Processos...")
        
        # A MÁGICA DO SQL: 
        # Pedimos os dados do processo E os dados do cliente associado (Join)
        # Sintaxe: select('*, tabela_estrangeira(campos)')
        response_processos = supabase.table('processos').select("*, clientes(nome)").execute()
        lista_processos = response_processos.data

        print(f"Encontrados {len(lista_processos)} processos:")
        for proc in lista_processos:
            # O Supabase traz o cliente aninhado dentro de um dicionário
            nome_cliente = proc['clientes']['nome'] if proc['clientes'] else "Desconhecido"
            
            print(f"  - [ID: {proc['id']}] Processo: {proc['numero_processo']}")
            print(f"    Status: {proc['status']}")
            print(f"    Cliente: {nome_cliente}")
            print("    ---")

    except Exception as e:
        print(f"\nERRO CRÍTICO: {e}")
        print("Verifique se suas chaves (URL e KEY) estão corretas no script.")

if __name__ == "__main__":
    iniciar_robo()
