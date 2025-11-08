// --- ETAPA 1: Importações ---
import { firebaseConfig } from './firebase-config.js';

import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getAuth, signInAnonymously, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
// --- ALTERADO ---
// Importamos 'deleteDoc' para Exclusão
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
    deleteDoc           // <-- NOVO: Para excluir um documento
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";
// --- FIM ALTERADO ---

// --- ETAPA 2: Variáveis Globais ---
window.db = null;
window.auth = null;
window.userId = null;
window.appId = firebaseConfig.appId || 'default-app-id';
let processosCollectionPath = '';

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

        processosCollectionPath = `artifacts/${window.appId}/users/${window.userId}/processos`;
        
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
// (Sem alterações)
window.toggleModal = (modalId, show) => {
    const modal = document.getElementById(modalId);
    if (!modal) return; 

    if (show) {
        modal.classList.remove('hidden');
    } else {
        modal.classList.add('hidden');
        limparFormProcesso();
    }
}

window.limparFormProcesso = () => {
    document.getElementById('form-processo').reset(); 
    document.getElementById('processo-id').value = ''; 
    document.getElementById('modal-processo-titulo').innerText = 'Novo Processo';
}

// --- ETAPA 7: Lógica Principal da Aplicação ---
function iniciarApp() {
    console.log("Aplicativo iniciado. Anexando 'listeners'...");

    const formProcesso = document.getElementById('form-processo');

    // --- Listener de Salvar/Atualizar (Etapa 7) ---
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
                // --- LÓGICA DE ATUALIZAÇÃO (UPDATE) ---
                console.log("Atualizando documento ID:", id);
                const docRef = doc(window.db, processosCollectionPath, id);
                const dataToUpdate = {
                    numeroProcesso: numero,
                    nomeCliente: cliente,
                    status: status,
                };
                await updateDoc(docRef, dataToUpdate);
                showNotificacao("Processo atualizado com sucesso!", "sucesso");

            } else {
                // --- LÓGICA DE CRIAÇÃO (CREATE) ---
                console.log("Salvando novo documento...");
                const dataToSave = {
                    numeroProcesso: numero,
                    nomeCliente: cliente,
                    status: status,
                    criadoEm: serverTimestamp(),
                    criadoPor: window.userId
                };
                await addDoc(collection(window.db, processosCollectionPath), dataToSave);
                showNotificacao("Processo salvo com sucesso!", "sucesso");
            }
            
            toggleModal('modal-processo', false);

        } catch (error) {
            console.error("Erro ao salvar processo: ", error);
            showNotificacao("Erro ao salvar: " + error.message, "erro");
        }
    });

    // --- Listener de Leitura (Etapa 9) ---
    carregarProcessos();
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


// --- ETAPA 9: Carregar e Ouvir Processos ---
// (Sem alterações)
function carregarProcessos() {
    const q = query(collection(window.db, processosCollectionPath));
    console.log("Ouvindo processos em:", processosCollectionPath);

    onSnapshot(q, (querySnapshot) => {
        const processos = []; 
        querySnapshot.forEach((doc) => {
            processos.push({ id: doc.id, ...doc.data() });
        });
        console.log("Dados recebidos:", processos);
        renderTabelaProcessos(processos);
    }, (error) => {
        console.error("Erro ao carregar processos: ", error);
        showNotificacao("Erro ao carregar dados: " + error.message, "erro");
    });
}

// --- ALTERADO: ETAPA 10 - Renderizar Tabela ---
// (Agora com o botão "Excluir")
function renderTabelaProcessos(processos) {
    const tabelaBody = document.getElementById('tabela-processos');
    tabelaBody.innerHTML = '';

    if (processos.length === 0) {
        tabelaBody.innerHTML = `<tr><td colspan="4" class="px-6 py-4 text-center text-gray-500">Nenhum processo cadastrado.</td></tr>`;
        return;
    }

    processos.forEach(proc => {
        const data = proc.criadoEm ? proc.criadoEm.toDate().toLocaleDateString('pt-BR') : 'N/A';
        
        // Define a cor do status
        let statusClass = 'bg-gray-100 text-gray-800'; // Padrão
        if (proc.status === 'ativo') {
            statusClass = 'bg-green-100 text-green-800';
        } else if (proc.status === 'suspenso') {
            statusClass = 'bg-yellow-100 text-yellow-800';
        } else if (proc.status === 'arquivado' || proc.status === 'encerrado') {
            statusClass = 'bg-red-100 text-red-800';
        }

        // --- ALTERAÇÃO AQUI ---
        // Adicionamos o botão "Excluir"
        const linha = `
            <tr class="hover:bg-gray-50">
                <td class="px-6 py-4 whitespace-nowrap">
                    <div class="text-sm font-medium text-gray-900">${proc.numeroProcesso}</div>
                    <div class="text-xs text-gray-500">Criado em: ${data}</div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-700">${proc.nomeCliente}</td>
                <td class="px-6 py-4 whitespace-nowrap">
                    <span class="px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${statusClass}">
                        ${proc.status.charAt(0).toUpperCase() + proc.status.slice(1)}
                    </span>
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <a href="#" onclick="prepararEdicao('${proc.id}')" class="text-indigo-600 hover:text-indigo-900">Editar</a>
                    <a href="#" onclick="excluirProcesso('${proc.id}')" class="text-red-600 hover:text-red-900 ml-4">Excluir</a>
                </td>
            </tr>
        `;
        // --- FIM DA ALTERAÇÃO ---
        tabelaBody.innerHTML += linha;
    });
}

// --- ETAPA 11: Funções de Edição ---
// (Sem alterações)
window.prepararEdicao = async (id) => {
    console.log("Preparando edição para o ID:", id);
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
        } else {
            console.error("Documento não encontrado!");
            showNotificacao("Erro: Processo não encontrado.", "erro");
        }
    } catch (error) {
        console.error("Erro ao buscar processo para edição:", error);
        showNotificacao("Erro ao carregar dados: " + error.message, "erro");
    }
}

// --- NOVO: ETAPA 12 - Função de Exclusão ---

// Esta função é chamada pelo botão "Excluir" na tabela
window.excluirProcesso = async (id) => {
    console.log("Tentando excluir ID:", id);
    
    // --- IMPORTANTE: Confirmação ---
    // Em um app real, o 'confirm' nativo é ruim porque ele trava o navegador.
    // O ideal (V2.0) é criar um "modal de confirmação" customizado.
    // Por enquanto, usaremos o 'confirm' pela simplicidade.
    // NOTA: O 'confirm' PODE não funcionar no 'live-server' ou em iframes.
    // Se não funcionar, vamos remover e fazer a exclusão direta para testar.
    
    // const querExcluir = confirm("Tem certeza que deseja excluir este processo? Esta ação é irreversível.");
    // if (!querExcluir) {
    //    return; // Usuário cancelou
    // }

    // Vamos pular a confirmação por enquanto, pois 'confirm' é bloqueado em
    // muitos ambientes de desenvolvimento. Vamos excluir direto.

    try {
        // 1. Cria a referência ao documento
        const docRef = doc(window.db, processosCollectionPath, id);
        // 2. Exclui o documento
        await deleteDoc(docRef);
        // 3. Mostra o feedback
        showNotificacao("Processo excluído com sucesso!", "sucesso");
        // 4. O 'onSnapshot' (Etapa 9) vai ver a mudança e
        // remover a linha da tabela AUTOMATICAMENTE.

    } catch (error) {
        console.error("Erro ao excluir processo:", error);
        showNotificacao("Erro ao excluir: " + error.message, "erro");
    }
}