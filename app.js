// --- ETAPA 1: Importações ---
// Importa o "cliente" (nosso driver de conexão) do supabase-config.js
import { supabaseClient } from './supabase-config.js';

// --- ETAPA 2: Variáveis Globais ---
// Colocamos o cliente em 'window' para acesso global fácil
window.supabase = supabaseClient;
// Um cache local para guardar a lista de clientes (para o dropdown)
let clientesCache = [];

// --- ETAPA 3: Ponto de Entrada (Inicialização) ---
// Esta é a primeira função que roda.
async function iniciarApp() {
    console.log("SJG-IA (Supabase) iniciado.");
    
    // Anexa os "ouvintes" (listeners) aos nossos formulários
    anexarListeners();

    // Carrega os dados das tabelas
    // É importante carregar clientes PRIMEIRO
    await carregarClientes();
    await carregarProcessos();

    // Mostra o aplicativo
    document.getElementById('loading-screen').classList.add('hidden');
    document.getElementById('app-shell').classList.remove('hidden');
}

// --- ETAPA 4: Anexar Listeners ---
// Agrupa toda a lógica de "setup" dos formulários
function anexarListeners() {
    // Listener do Formulário de Cliente
    const formCliente = document.getElementById('form-cliente');
    formCliente.addEventListener('submit', salvarCliente);

    // Listener do Formulário de Processo
    const formProcesso = document.getElementById('form-processo');
    formProcesso.addEventListener('submit', salvarProcesso);
}

// --- ETAPA 5: Lógica de Navegação e UI (Helpers) ---
// (Esta parte é 99% igual à do Firebase, pois é só manipulação de tela)

window.showPage = (pageId) => {
    document.querySelectorAll('.page-content').forEach(page => {
        page.classList.add('hidden');
    });
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active-nav');
    });
    const pageToShow = document.getElementById(`page-${pageId}`);
    if (pageToShow) {
        pageToShow.classList.remove('hidden');
    }
    const navItemToActivate = document.getElementById(`nav-${pageId}`);
    if (navItemToActivate) {
        navItemToActivate.classList.add('active-nav');
    }
}

window.toggleModal = (modalId, show) => {
    const modal = document.getElementById(modalId);
    if (!modal) return; 

    if (show) {
        modal.classList.remove('hidden');
    } else {
        modal.classList.add('hidden');
        if (modalId === 'modal-processo') {
            limparFormProcesso();
        } else if (modalId === 'modal-cliente') {
            limparFormCliente();
        }
    }
}

window.limparFormProcesso = () => {
    document.getElementById('form-processo').reset(); 
    document.getElementById('processo-id').value = ''; 
    document.getElementById('modal-processo-titulo').innerText = 'Novo Processo';
}

window.limparFormCliente = () => {
    document.getElementById('form-cliente').reset(); 
    document.getElementById('cliente-id').value = ''; 
    document.getElementById('modal-cliente-titulo').innerText = 'Novo Cliente';
}

window.showNotificacao = (mensagem, tipo = "sucesso") => {
    const notificacao = document.getElementById('notificacao');
    const texto = document.getElementById('notificacao-texto');

    texto.innerText = mensagem;
    if (tipo === "sucesso") {
        notificacao.classList.replace('bg-red-500', 'bg-green-500');
        notificacao.classList.replace('bg-red-600', 'bg-green-500');
        notificacao.classList.add('bg-green-500');
    } else {
        notificacao.classList.replace('bg-green-500', 'bg-red-600');
        notificacao.classList.add('bg-red-600');
    }
    notificacao.classList.remove('hidden');
    setTimeout(() => {
        notificacao.classList.add('hidden');
    }, 3000);
}

// ------------------------------------
// --- MÓDULO DE CLIENTES (Etapa 6) ---
// ------------------------------------

async function carregarClientes() {
    console.log("Carregando clientes...");
    // 1. SELECT * FROM clientes ORDER BY nome
    const { data, error } = await supabase
        .from('clientes')
        .select('*')
        .order('nome', { ascending: true });

    if (error) {
        console.error("Erro ao carregar clientes:", error.message);
        showNotificacao(error.message, "erro");
    } else {
        // 2. Salva os dados no cache e renderiza
        clientesCache = data; // Guarda a lista para o dropdown
        renderTabelaClientes(data);
        popularDropdownClientes(data); // <-- Novo!
    }
}

function renderTabelaClientes(clientes) {
    const tabelaBody = document.getElementById('tabela-clientes');
    tabelaBody.innerHTML = ''; // Limpa a tabela

    if (clientes.length === 0) {
        tabelaBody.innerHTML = `<tr><td colspan="4" class="px-6 py-4 text-center text-gray-500">Nenhum cliente cadastrado.</td></tr>`;
        return;
    }

    clientes.forEach(cli => {
        const linha = `
            <tr class="hover:bg-gray-50">
                <td class="px-6 py-4 whitespace-nowrap"><div class="text-sm font-medium text-gray-900">${cli.nome}</div><div class="text-xs text-gray-500">${cli.cpf || 'CPF/CNPJ não informado'}</div></td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-700">${cli.email || 'N/A'}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-700">${cli.telefone || 'N/A'}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <a href="#" onclick="prepararEdicaoCliente('${cli.id}')" class="text-indigo-600 hover:text-indigo-900">Editar</a>
                    <a href="#" onclick="excluirCliente('${cli.id}')" class="text-red-600 hover:text-red-900 ml-4">Excluir</a>
                </td>
            </tr>`;
        tabelaBody.innerHTML += linha;
    });
}

// Esta nova função popula o <select> no formulário de Processo
function popularDropdownClientes(clientes) {
    const select = document.getElementById('processo-cliente');
    select.innerHTML = '<option value="">Selecione um cliente</option>'; // Limpa
    
    clientes.forEach(cli => {
        select.innerHTML += `<option value="${cli.id}">${cli.nome}</option>`;
    });
}

async function salvarCliente(e) {
    e.preventDefault(); // Impede o recarregamento da página

    const id = document.getElementById('cliente-id').value;
    const dataObject = {
        nome: document.getElementById('cliente-nome').value,
        email: document.getElementById('cliente-email').value,
        telefone: document.getElementById('cliente-telefone').value,
        cpf: document.getElementById('cliente-cpf').value
    };

    if (!dataObject.nome) {
        showNotificacao("O campo Nome é obrigatório.", "erro");
        return;
    }

    let error;
    if (id) {
        // UPDATE
        // UPDATE clientes SET nome = ..., email = ... WHERE id = ...
        console.log("Atualizando cliente ID:", id);
        ({ error } = await supabase.from('clientes').update(dataObject).eq('id', id));
    } else {
        // CREATE
        // INSERT INTO clientes (nome, email, ...) VALUES (...)
        console.log("Inserindo novo cliente...");
        ({ error } = await supabase.from('clientes').insert(dataObject));
    }

    if (error) {
        console.error("Erro ao salvar cliente:", error.message);
        showNotificacao(error.message, "erro");
    } else {
        showNotificacao(id ? "Cliente atualizado com sucesso!" : "Cliente salvo com sucesso!", "sucesso");
        toggleModal('modal-cliente', false);
        await carregarClientes(); // Recarrega a tabela e o dropdown
    }
}

window.prepararEdicaoCliente = async (id) => {
    console.log("Preparando edição do cliente ID:", id);
    // SELECT * FROM clientes WHERE id = ... LIMIT 1
    const { data, error } = await supabase.from('clientes').select('*').eq('id', id).single();

    if (error) {
        showNotificacao(error.message, "erro");
    } else if (data) {
        document.getElementById('cliente-id').value = data.id;
        document.getElementById('cliente-nome').value = data.nome;
        document.getElementById('cliente-email').value = data.email || '';
        document.getElementById('cliente-telefone').value = data.telefone || '';
        document.getElementById('cliente-cpf').value = data.cpf || '';
        document.getElementById('modal-cliente-titulo').innerText = 'Editar Cliente';
        toggleModal('modal-cliente', true);
    }
}

window.excluirCliente = async (id) => {
    // (Idealmente, pediríamos confirmação)
    console.log("Excluindo cliente ID:", id);
    // DELETE FROM clientes WHERE id = ...
    const { error } = await supabase.from('clientes').delete().eq('id', id);

    if (error) {
        // O banco de dados vai falhar aqui se o cliente tiver processos (o que é BOM)
        console.error("Erro ao excluir cliente:", error.message);
        showNotificacao("Erro: " + error.message, "erro");
    } else {
        showNotificacao("Cliente excluído com sucesso!", "sucesso");
        await carregarClientes(); // Recarrega a tabela e o dropdown
    }
}

// ------------------------------------
// --- MÓDULO DE PROCESSOS (Etapa 7) ---
// ------------------------------------

async function carregarProcessos() {
    console.log("Carregando processos...");
    
    // A MÁGICA DO SQL (JOIN):
    // "Me traga tudo de 'processos', e da tabela 'clientes', traga 'id' e 'nome'"
    // SELECT *, clientes(id, nome) FROM processos
    const { data, error } = await supabase
        .from('processos')
        .select('*, clientes(id, nome)')
        .order('created_at', { ascending: false });

    if (error) {
        console.error("Erro ao carregar processos:", error.message);
        showNotificacao(error.message, "erro");
    } else {
        renderTabelaProcessos(data);
    }
}

function renderTabelaProcessos(processos) {
    const tabelaBody = document.getElementById('tabela-processos');
    tabelaBody.innerHTML = ''; // Limpa

    if (processos.length === 0) {
        tabelaBody.innerHTML = `<tr><td colspan="4" class="px-6 py-4 text-center text-gray-500">Nenhum processo cadastrado.</td></tr>`;
        return;
    }

    processos.forEach(proc => {
        // Graças ao JOIN, podemos fazer 'proc.clientes.nome'
        const nomeCliente = proc.clientes ? proc.clientes.nome : "(Cliente excluído)";
        const data = new Date(proc.created_at).toLocaleDateString('pt-BR');
        
        let statusClass = 'bg-gray-100 text-gray-800';
        if (proc.status === 'ativo') statusClass = 'bg-green-100 text-green-800';
        else if (proc.status === 'suspenso') statusClass = 'bg-yellow-100 text-yellow-800';
        else if (proc.status === 'arquivado' || proc.status === 'encerrado') statusClass = 'bg-red-100 text-red-800';

        const linha = `
            <tr class="hover:bg-gray-50">
                <td class="px-6 py-4 whitespace-nowrap"><div class="text-sm font-medium text-gray-900">${proc.numero_processo}</div><div class="text-xs text-gray-500">Criado em: ${data}</div></td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-700">${nomeCliente}</td>
                <td class="px-6 py-4 whitespace-nowrap"><span class="px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${statusClass}">${proc.status.charAt(0).toUpperCase() + proc.status.slice(1)}</span></td>
                <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <a href="#" onclick="prepararEdicaoProcesso('${proc.id}')" class="text-indigo-600 hover:text-indigo-900">Editar</a>
                    <a href="#" onclick="excluirProcesso('${proc.id}')" class="text-red-600 hover:text-red-900 ml-4">Excluir</a>
                </td>
            </tr>`;
        tabelaBody.innerHTML += linha;
    });
}

async function salvarProcesso(e) {
    e.preventDefault();

    const id = document.getElementById('processo-id').value;
    const dataObject = {
        numero_processo: document.getElementById('processo-numero').value,
        status: document.getElementById('processo-status').value,
        cliente_id: document.getElementById('processo-cliente').value // <-- Salva o ID do cliente
    };

    if (!dataObject.numero_processo || !dataObject.cliente_id) {
        showNotificacao("Nº do Processo e Cliente são obrigatórios.", "erro");
        return;
    }

    let error;
    if (id) {
        // UPDATE
        console.log("Atualizando processo ID:", id);
        ({ error } = await supabase.from('processos').update(dataObject).eq('id', id));
    } else {
        // CREATE
        console.log("Inserindo novo processo...");
        ({ error } = await supabase.from('processos').insert(dataObject));
    }

    if (error) {
        console.error("Erro ao salvar processo:", error.message);
        showNotificacao(error.message, "erro");
    } else {
        showNotificacao(id ? "Processo atualizado com sucesso!" : "Processo salvo com sucesso!", "sucesso");
        toggleModal('modal-processo', false);
        await carregarProcessos(); // Recarrega a tabela
    }
}

window.prepararEdicaoProcesso = async (id) => {
    console.log("Preparando edição do processo ID:", id);
    // SELECT * FROM processos WHERE id = ... LIMIT 1
    const { data, error } = await supabase.from('processos').select('*').eq('id', id).single();

    if (error) {
        showNotificacao(error.message, "erro");
    } else if (data) {
        document.getElementById('processo-id').value = data.id;
        document.getElementById('processo-numero').value = data.numero_processo;
        document.getElementById('processo-status').value = data.status;
        document.getElementById('processo-cliente').value = data.cliente_id; // <-- Define o ID do cliente no dropdown
        document.getElementById('modal-processo-titulo').innerText = 'Editar Processo';
        toggleModal('modal-processo', true);
    }
}

window.excluirProcesso = async (id) => {
    console.log("Excluindo processo ID:", id);
    // DELETE FROM processos WHERE id = ...
    const { error } = await supabase.from('processos').delete().eq('id', id);

    if (error) {
        console.error("Erro ao excluir processo:", error.message);
        showNotificacao(error.message, "erro");
    } else {
        showNotificacao("Processo excluído com sucesso!", "sucesso");
        await carregarProcessos(); // Recarrega a tabela
    }
}

// --- ETAPA FINAL: Iniciar o aplicativo ---
iniciarApp();