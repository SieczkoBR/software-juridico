// --- ETAPA 1: Importações ---
import { firebaseConfig } from './firebase-config.js';

import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getAuth, signInAnonymously, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { 
    getFirestore, 
    setLogLevel,
    addDoc,
    collection,
    serverTimestamp,
    onSnapshot,
    query,
    doc,
    getDoc,
    updateDoc,
    deleteDoc
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";
// --- FIM IMPORTAÇÕES ---

// --- ETAPA 2: Variáveis Globais ---
window.db = null;
window.auth = null;
window.userId = null;
window.appId = firebaseConfig.appId || 'default-app-id';
// --- NOVO: Caminhos das Coleções ---
let processosCollectionPath = '';
let clientesCollectionPath = ''; // <-- NOVO

// --- ETAPA 3: Inicialização do Firebase ---
try {
    const app = initializeApp(firebaseConfig);
    window.auth = getAuth(app);
    window.db = getFirestore(app);
    setLogLevel('debug');
    console.log("Firebase inicializado com sucesso.");

    signInAnonymously(window.auth).catch((error) => {
        console.error("Erro no login anônimo:", error);
    });

} catch (error) {
    console.error("Erro fatal ao inicializar o Firebase:", error);
    document.body.innerHTML = `<div class="p-4 bg-red-100 text-red-700 rounded m-4">Erro crítico ao carregar o Firebase. Verifique seu 'firebase-config.js'.</div>`;
}

// --- ETAPA 4: Monitor de Autenticação ---
onAuthStateChanged(window.auth, (user) => {
    if (user) {
        window.userId = user.uid;
        console.log("Usuário autenticado:", window.userId);

        // --- NOVO: Define AMBOS os caminhos ---
        processosCollectionPath = `artifacts/${window.appId}/users/${window.userId}/processos`;
        clientesCollectionPath = `artifacts/${window.appId}/users/${window.userId}/clientes`; // <-- NOVO
        
        document.getElementById('loading-screen').classList.add('hidden');
        document.getElementById('app-shell').classList.remove('hidden');

        iniciarApp();
        
    } else {
        window.userId = null;
        console.log("Nenhum usuário logado.");
    }
});

// --- ETAPA 5: Lógica de Navegação ---
// (Sem alterações)
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

// --- ETAPA 6: Lógica do Modal ---
// --- ALTERADO: Agora limpa o formulário correto ---
window.toggleModal = (modalId, show) => {
    const modal = document.getElementById(modalId);
    if (!modal) return; 

    if (show) {
        modal.classList.remove('hidden');
    } else {
        modal.classList.add('hidden');
        // Limpa o formulário específico que foi fechado
        if (modalId === 'modal-processo') {
            limparFormProcesso();
        } else if (modalId === 'modal-cliente') {
            limparFormCliente();
        }
    }
}

// Helper para Processos (sem alteração)
window.limparFormProcesso = () => {
    document.getElementById('form-processo').reset(); 
    document.getElementById('processo-id').value = ''; 
    document.getElementById('modal-processo-titulo').innerText = 'Novo Processo';
}

// --- NOVO: Helper para Clientes ---
window.limparFormCliente = () => {
    document.getElementById('form-cliente').reset(); 
    document.getElementById('cliente-id').value = ''; 
    document.getElementById('modal-cliente-titulo').innerText = 'Novo Cliente';
}


// --- ETAPA 7: Lógica Principal da Aplicação ---
function iniciarApp() {
    console.log("Aplicativo iniciado. Anexando 'listeners'...");

    // --- MÓDULO PROCESSOS ---
    const formProcesso = document.getElementById('form-processo');
    formProcesso.addEventListener('submit', async (e) => {
        e.preventDefault(); 
        
        const numero = document.getElementById('processo-numero').value;
        const cliente = document.getElementById('processo-cliente').value;
        const status = document.getElementById('processo-status').value;
        const id = document.getElementById('processo-id').value;

        if (!numero || !cliente) {
            showNotificacao("Por favor, preencha o Nº do Processo e o Cliente.", "erro");
            return;
        }

        try {
            if (id) {
                // UPDATE
                const docRef = doc(window.db, processosCollectionPath, id);
                await updateDoc(docRef, {
                    numeroProcesso: numero,
                    nomeCliente: cliente,
                    status: status,
                });
                showNotificacao("Processo atualizado com sucesso!", "sucesso");
            } else {
                // CREATE
                await addDoc(collection(window.db, processosCollectionPath), {
                    numeroProcesso: numero,
                    nomeCliente: cliente,
                    status: status,
                    criadoEm: serverTimestamp(),
                    criadoPor: window.userId
                });
                showNotificacao("Processo salvo com sucesso!", "sucesso");
            }
            toggleModal('modal-processo', false);
        } catch (error) {
            console.error("Erro ao salvar processo: ", error);
            showNotificacao("Erro ao salvar: " + error.message, "erro");
        }
    });

    // Carrega os processos
    carregarProcessos();

    // --- NOVO: MÓDULO CLIENTES ---
    const formCliente = document.getElementById('form-cliente');
    formCliente.addEventListener('submit', async (e) => {
        e.preventDefault();

        const nome = document.getElementById('cliente-nome').value;
        const email = document.getElementById('cliente-email').value;
        const telefone = document.getElementById('cliente-telefone').value;
        const cpf = document.getElementById('cliente-cpf').value;
        const id = document.getElementById('cliente-id').value;

        if (!nome) {
            showNotificacao("Por favor, preencha o Nome Completo.", "erro");
            return;
        }

        try {
            const data = {
                nome: nome,
                email: email,
                telefone: telefone,
                cpf: cpf
            };

            if (id) {
                // UPDATE
                const docRef = doc(window.db, clientesCollectionPath, id);
                await updateDoc(docRef, data);
                showNotificacao("Cliente atualizado com sucesso!", "sucesso");
            } else {
                // CREATE
                data.criadoEm = serverTimestamp(); // Adiciona data só na criação
                data.criadoPor = window.userId;
                await addDoc(collection(window.db, clientesCollectionPath), data);
                showNotificacao("Cliente salvo com sucesso!", "sucesso");
            }
            toggleModal('modal-cliente', false);
        } catch (error) {
            console.error("Erro ao salvar cliente: ", error);
            showNotificacao("Erro ao salvar: " + error.message, "erro");
        }
    });

    // Carrega os clientes
    carregarClientes();
}

// --- ETAPA 8: Lógica de Notificação ---
// (Sem alterações)
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
// --- MÓDULO DE PROCESSOS (Etapa 9-12) ---
// ------------------------------------

// ETAPA 9: Carregar Processos
function carregarProcessos() {
    const q = query(collection(window.db, processosCollectionPath));
    onSnapshot(q, (querySnapshot) => {
        const processos = []; 
        querySnapshot.forEach((doc) => {
            processos.push({ id: doc.id, ...doc.data() });
        });
        renderTabelaProcessos(processos);
    }, (error) => {
        console.error("Erro ao carregar processos: ", error);
    });
}

// ETAPA 10: Renderizar Tabela Processos
function renderTabelaProcessos(processos) {
    const tabelaBody = document.getElementById('tabela-processos');
    tabelaBody.innerHTML = '';
    if (processos.length === 0) {
        tabelaBody.innerHTML = `<tr><td colspan="4" class="px-6 py-4 text-center text-gray-500">Nenhum processo cadastrado.</td></tr>`;
        return;
    }
    processos.forEach(proc => {
        const data = proc.criadoEm ? proc.criadoEm.toDate().toLocaleDateString('pt-BR') : 'N/A';
        let statusClass = 'bg-gray-100 text-gray-800';
        if (proc.status === 'ativo') statusClass = 'bg-green-100 text-green-800';
        else if (proc.status === 'suspenso') statusClass = 'bg-yellow-100 text-yellow-800';
        else if (proc.status === 'arquivado' || proc.status === 'encerrado') statusClass = 'bg-red-100 text-red-800';
        const linha = `
            <tr class="hover:bg-gray-50">
                <td class="px-6 py-4 whitespace-nowrap"><div class="text-sm font-medium text-gray-900">${proc.numeroProcesso}</div><div class="text-xs text-gray-500">Criado em: ${data}</div></td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-700">${proc.nomeCliente}</td>
                <td class="px-6 py-4 whitespace-nowrap"><span class="px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${statusClass}">${proc.status.charAt(0).toUpperCase() + proc.status.slice(1)}</span></td>
                <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <a href="#" onclick="prepararEdicaoProcesso('${proc.id}')" class="text-indigo-600 hover:text-indigo-900">Editar</a>
                    <a href="#" onclick="excluirProcesso('${proc.id}')" class="text-red-600 hover:text-red-900 ml-4">Excluir</a>
                </td>
            </tr>`;
        tabelaBody.innerHTML += linha;
    });
}

// ETAPA 11: Preparar Edição Processo
// --- ALTERADO: Renomeei para 'prepararEdicaoProcesso' para ser específico ---
window.prepararEdicaoProcesso = async (id) => {
    try {
        const docRef = doc(window.db, processosCollectionPath, id);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
            const data = docSnap.data();
            document.getElementById('processo-id').value = id;
            document.getElementById('processo-numero').value = data.numeroProcesso;
            document.getElementById('processo-cliente').value = data.nomeCliente;
            document.getElementById('processo-status').value = data.status;
            document.getElementById('modal-processo-titulo').innerText = 'Editar Processo';
            toggleModal('modal-processo', true);
        } else { showNotificacao("Erro: Processo não encontrado.", "erro"); }
    } catch (error) { showNotificacao("Erro ao carregar dados: " + error.message, "erro"); }
}

// ETAPA 12: Excluir Processo
window.excluirProcesso = async (id) => {
    try {
        const docRef = doc(window.db, processosCollectionPath, id);
        await deleteDoc(docRef);
        showNotificacao("Processo excluído com sucesso!", "sucesso");
    } catch (error) { showNotificacao("Erro ao excluir: " + error.message, "erro"); }
}


// ------------------------------------
// --- NOVO: MÓDULO DE CLIENTES (Etapa 13-16) ---
// ------------------------------------

// --- NOVO: ETAPA 13 - Carregar Clientes ---
function carregarClientes() {
    const q = query(collection(window.db, clientesCollectionPath));
    onSnapshot(q, (querySnapshot) => {
        const clientes = [];
        querySnapshot.forEach((doc) => {
            clientes.push({ id: doc.id, ...doc.data() });
        });
        renderTabelaClientes(clientes);
    }, (error) => {
        console.error("Erro ao carregar clientes: ", error);
    });
}

// --- NOVO: ETAPA 14 - Renderizar Tabela Clientes ---
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

// --- NOVO: ETAPA 15 - Preparar Edição Cliente ---
window.prepararEdicaoCliente = async (id) => {
    try {
        const docRef = doc(window.db, clientesCollectionPath, id);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
            const data = docSnap.data();
            document.getElementById('cliente-id').value = id;
            document.getElementById('cliente-nome').value = data.nome;
            document.getElementById('cliente-email').value = data.email || '';
            document.getElementById('cliente-telefone').value = data.telefone || '';
            document.getElementById('cliente-cpf').value = data.cpf || '';
            document.getElementById('modal-cliente-titulo').innerText = 'Editar Cliente';
            toggleModal('modal-cliente', true);
        } else { showNotificacao("Erro: Cliente não encontrado.", "erro"); }
    } catch (error) { showNotificacao("Erro ao carregar dados: " + error.message, "erro"); }
}

// --- NOVO: ETAPA 16 - Excluir Cliente ---
window.excluirCliente = async (id) => {
    // (Poderíamos adicionar um 'confirm' aqui)
    try {
        const docRef = doc(window.db, clientesCollectionPath, id);
        await deleteDoc(docRef);
        showNotificacao("Cliente excluído com sucesso!", "sucesso");
    } catch (error) { showNotificacao("Erro ao excluir: " + error.message, "erro"); }
}