// --- ETAPA 1: Importações ---
import { supabaseClient } from './supabase-config.js';

// --- ETAPA 2: Variáveis Globais ---
window.supabase = supabaseClient;
let clientesCache = [];

// --- ETAPA 3: Ponto de Entrada ---
async function iniciarApp() {
    console.log("SJG-IA (Supabase) iniciado.");
    anexarListeners();
    await carregarClientes();
    await carregarProcessos();
    document.getElementById('loading-screen').classList.add('hidden');
    document.getElementById('app-shell').classList.remove('hidden');
}

// --- ETAPA 4: Anexar Listeners ---
function anexarListeners() {
    document.getElementById('form-cliente').addEventListener('submit', salvarCliente);
    document.getElementById('form-processo').addEventListener('submit', salvarProcesso);
    
    // --- NOVO: Listener de Upload ---
    document.getElementById('form-upload').addEventListener('submit', salvarDocumento);
    
    // Mostra o nome do arquivo ao selecionar
    document.getElementById('file-upload').addEventListener('change', function(e) {
        const fileName = e.target.files[0]?.name || 'Nenhum arquivo selecionado';
        document.getElementById('nome-arquivo-selecionado').innerText = fileName;
    });
}

// --- ETAPA 5: Lógica de Navegação e UI ---
window.showPage = (pageId) => {
    document.querySelectorAll('.page-content').forEach(page => page.classList.add('hidden'));
    document.querySelectorAll('.nav-item').forEach(item => item.classList.remove('active-nav'));
    
    const pageToShow = document.getElementById(`page-${pageId}`);
    if (pageToShow) pageToShow.classList.remove('hidden');
    
    const navItemToActivate = document.getElementById(`nav-${pageId}`);
    if (navItemToActivate) navItemToActivate.classList.add('active-nav');
}

window.toggleModal = (modalId, show) => {
    const modal = document.getElementById(modalId);
    if (!modal) return; 
    if (show) {
        modal.classList.remove('hidden');
    } else {
        modal.classList.add('hidden');
        // Limpa formulários
        if (modalId === 'modal-processo') limparFormProcesso();
        if (modalId === 'modal-cliente') limparFormCliente();
        if (modalId === 'modal-upload') limparFormUpload();
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
// --- NOVO: Limpar Upload ---
window.limparFormUpload = () => {
    document.getElementById('form-upload').reset();
    document.getElementById('upload-processo-id').value = '';
    document.getElementById('nome-arquivo-selecionado').innerText = 'Nenhum arquivo selecionado';
    document.getElementById('texto-btn-upload').innerText = 'Enviar';
}

window.showNotificacao = (mensagem, tipo = "sucesso") => {
    const notificacao = document.getElementById('notificacao');
    const texto = document.getElementById('notificacao-texto');
    texto.innerText = mensagem;
    
    if (tipo === "sucesso") {
        notificacao.className = "fixed bottom-5 right-5 bg-green-500 text-white py-2 px-4 rounded-lg shadow-lg z-50";
    } else {
        notificacao.className = "fixed bottom-5 right-5 bg-red-600 text-white py-2 px-4 rounded-lg shadow-lg z-50";
    }
    
    notificacao.classList.remove('hidden');
    setTimeout(() => notificacao.classList.add('hidden'), 3000);
}

// ------------------------------------
// --- MÓDULO DE CLIENTES ---
// ------------------------------------
async function carregarClientes() {
    const { data, error } = await supabase.from('clientes').select('*').order('nome', { ascending: true });
    if (error) return showNotificacao(error.message, "erro");
    clientesCache = data;
    renderTabelaClientes(data);
    popularDropdownClientes(data);
}

function renderTabelaClientes(clientes) {
    const tabelaBody = document.getElementById('tabela-clientes');
    tabelaBody.innerHTML = '';
    if (clientes.length === 0) {
        tabelaBody.innerHTML = `<tr><td colspan="4" class="px-6 py-4 text-center text-gray-500">Nenhum cliente cadastrado.</td></tr>`;
        return;
    }
    clientes.forEach(cli => {
        const linha = `
            <tr class="hover:bg-gray-50">
                <td class="px-6 py-4 whitespace-nowrap"><div class="text-sm font-medium text-gray-900">${cli.nome}</div><div class="text-xs text-gray-500">${cli.cpf || ''}</div></td>
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

function popularDropdownClientes(clientes) {
    const select = document.getElementById('processo-cliente');
    select.innerHTML = '<option value="">Selecione um cliente</option>';
    clientes.forEach(cli => select.innerHTML += `<option value="${cli.id}">${cli.nome}</option>`);
}

async function salvarCliente(e) {
    e.preventDefault();
    const id = document.getElementById('cliente-id').value;
    const dataObject = {
        nome: document.getElementById('cliente-nome').value,
        email: document.getElementById('cliente-email').value,
        telefone: document.getElementById('cliente-telefone').value,
        cpf: document.getElementById('cliente-cpf').value
    };
    if (!dataObject.nome) return showNotificacao("Nome é obrigatório.", "erro");

    let error;
    if (id) ({ error } = await supabase.from('clientes').update(dataObject).eq('id', id));
    else ({ error } = await supabase.from('clientes').insert(dataObject));

    if (error) showNotificacao(error.message, "erro");
    else {
        showNotificacao("Cliente salvo!", "sucesso");
        toggleModal('modal-cliente', false);
        await carregarClientes();
    }
}

window.prepararEdicaoCliente = async (id) => {
    const { data, error } = await supabase.from('clientes').select('*').eq('id', id).single();
    if (data) {
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
    if (!confirm("Tem certeza?")) return;
    const { error } = await supabase.from('clientes').delete().eq('id', id);
    if (error) showNotificacao("Erro: " + error.message, "erro");
    else { showNotificacao("Excluído!", "sucesso"); await carregarClientes(); }
}


// ------------------------------------
// --- MÓDULO DE PROCESSOS ---
// ------------------------------------
async function carregarProcessos() {
    // Carrega processos E conta quantos documentos cada um tem
    const { data, error } = await supabase
        .from('processos')
        .select('*, clientes(nome), documentos(id)')
        .order('created_at', { ascending: false });

    if (error) return showNotificacao(error.message, "erro");
    renderTabelaProcessos(data);
}

function renderTabelaProcessos(processos) {
    const tabelaBody = document.getElementById('tabela-processos');
    tabelaBody.innerHTML = '';

    if (processos.length === 0) {
        tabelaBody.innerHTML = `<tr><td colspan="4" class="px-6 py-4 text-center text-gray-500">Nenhum processo cadastrado.</td></tr>`;
        return;
    }

    processos.forEach(proc => {
        const nomeCliente = proc.clientes ? proc.clientes.nome : "(Excluído)";
        const data = new Date(proc.created_at).toLocaleDateString('pt-BR');
        const qtdDocs = proc.documentos ? proc.documentos.length : 0;
        
        let statusClass = 'bg-gray-100 text-gray-800';
        if (proc.status === 'ativo') statusClass = 'bg-green-100 text-green-800';
        else if (proc.status === 'suspenso') statusClass = 'bg-yellow-100 text-yellow-800';

        const linha = `
            <tr class="hover:bg-gray-50">
                <td class="px-6 py-4 whitespace-nowrap">
                    <div class="text-sm font-medium text-gray-900">${proc.numero_processo}</div>
                    <div class="text-xs text-gray-500">Criado: ${data}</div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-700">${nomeCliente}</td>
                <td class="px-6 py-4 whitespace-nowrap">
                    <span class="px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${statusClass}">
                        ${proc.status}
                    </span>
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm font-medium flex items-center space-x-3">
                    <!-- Botão de Anexar -->
                    <button onclick="prepararUpload('${proc.id}')" class="text-gray-500 hover:text-blue-600 relative" title="Anexar PDF">
                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"></path></svg>
                        ${qtdDocs > 0 ? `<span class="absolute -top-2 -right-2 bg-blue-500 text-white text-xs rounded-full h-4 w-4 flex items-center justify-center">${qtdDocs}</span>` : ''}
                    </button>
                    
                    <a href="#" onclick="prepararEdicaoProcesso('${proc.id}')" class="text-indigo-600 hover:text-indigo-900">Editar</a>
                    <a href="#" onclick="excluirProcesso('${proc.id}')" class="text-red-600 hover:text-red-900">Excluir</a>
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
        cliente_id: document.getElementById('processo-cliente').value
    };
    if (!dataObject.numero_processo || !dataObject.cliente_id) return showNotificacao("Campos obrigatórios.", "erro");

    let error;
    if (id) ({ error } = await supabase.from('processos').update(dataObject).eq('id', id));
    else ({ error } = await supabase.from('processos').insert(dataObject));

    if (error) showNotificacao(error.message, "erro");
    else {
        showNotificacao("Processo salvo!", "sucesso");
        toggleModal('modal-processo', false);
        await carregarProcessos();
    }
}

window.prepararEdicaoProcesso = async (id) => {
    const { data } = await supabase.from('processos').select('*').eq('id', id).single();
    if (data) {
        document.getElementById('processo-id').value = data.id;
        document.getElementById('processo-numero').value = data.numero_processo;
        document.getElementById('processo-status').value = data.status;
        document.getElementById('processo-cliente').value = data.cliente_id;
        document.getElementById('modal-processo-titulo').innerText = 'Editar Processo';
        toggleModal('modal-processo', true);
    }
}

window.excluirProcesso = async (id) => {
    if (!confirm("Tem certeza?")) return;
    const { error } = await supabase.from('processos').delete().eq('id', id);
    if (error) showNotificacao(error.message, "erro");
    else { showNotificacao("Excluído!", "sucesso"); await carregarProcessos(); }
}


// ------------------------------------
// --- MÓDULO DE DOCUMENTOS (Upload) ---
// ------------------------------------

// 1. Abrir Modal
window.prepararUpload = (processoId) => {
    document.getElementById('upload-processo-id').value = processoId;
    toggleModal('modal-upload', true);
}

// 2. Salvar Documento (Upload + Banco)
async function salvarDocumento(e) {
    e.preventDefault();
    
    const fileInput = document.getElementById('file-upload');
    const file = fileInput.files[0];
    const processoId = document.getElementById('upload-processo-id').value;

    if (!file) return showNotificacao("Selecione um arquivo.", "erro");

    const btnTexto = document.getElementById('texto-btn-upload');
    const originalTexto = btnTexto.innerText;
    btnTexto.innerText = "Enviando...";

    try {
        // --- CORREÇÃO AQUI ---
        // 1. Remove acentos (ex: ã -> a, ç -> c)
        // 2. Remove caracteres que não sejam letras, números, ponto, traço ou underline
        const nomeLimpo = file.name
            .normalize("NFD").replace(/[\u0300-\u036f]/g, "") // Remove acentos
            .replace(/[^a-zA-Z0-9._-]/g, "_"); // Substitui estranhos por _

        // Nome único
        const nomeUnico = `${Date.now()}_${nomeLimpo}`;
        // ---------------------
        
        console.log("Enviando para Storage...", nomeUnico);
        const { data: storageData, error: storageError } = await supabase
            .storage
            .from('documentos')
            .upload(nomeUnico, file);

        if (storageError) throw storageError;

        console.log("Salvando no Banco...");
        const { error: dbError } = await supabase
            .from('documentos')
            .insert({
                nome_arquivo: file.name, // No banco salvamos o nome original (com acento) para ficar bonito
                caminho_storage: storageData.path,
                processo_id: processoId
            });

        if (dbError) throw dbError;

        showNotificacao("Documento anexado!", "sucesso");
        toggleModal('modal-upload', false);
        
        await carregarProcessos();

    } catch (error) {
        console.error("Erro:", error);
        showNotificacao("Falha: " + error.message, "erro");
    } finally {
        btnTexto.innerText = originalTexto;
    }
}

// Inicia tudo
iniciarApp();