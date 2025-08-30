// ======================================

//         1. CLASSE PRINCIPAL

// ======================================



// Sistema de Cálculo de Dosagem - Lógica baseada em um backend

class SafeDoseSystem {

    constructor() {

        // Mapeamento de unidades para conversão em miligramas

        this.conversoes = {

            'g': 1000,

            'mg': 1,

            'mcg': 0.001,

            'ml': 1,

            'ui': 1,

        };

        // Carrega o histórico do armazenamento local, se existir

        this.historico = JSON.parse(localStorage.getItem('dosageHistory')) || [];



        // Limites de segurança para medicamentos específicos

        this.limitesSeguranca = {

            'dipirona': { 'max_dose': 4000, 'min_dose': 500, 'unidade': 'mg' },

            'paracetamol': { 'max_dose': 4000, 'min_dose': 500, 'unidade': 'mg' },

            'morfina': { 'max_dose': 30, 'unidade': 'mg' },

        };

    }



    // Converte uma dosagem para miligramas

    converterParaMg(valor, unidade) {

        return valor * (this.conversoes[unidade.toLowerCase()] || 1);

    }



    // Executa o cálculo da dosagem

    calcularDosagem(prescricaoValor, prescricaoUnidade, disponivelValor, forma, medicamento) {

        try {

            const prescricaoMg = this.converterParaMg(prescricaoValor, prescricaoUnidade);



            if (disponivelValor <= 0) {

                return { resultado: "Erro: Concentração disponível não pode ser zero.", sucesso: false };

            }



            let quantidade = prescricaoMg / disponivelValor;

            let resultadoTexto;



            const formaLowerCase = forma.toLowerCase();



            if (formaLowerCase === 'comprimido' || formaLowerCase === 'capsula') {

                resultadoTexto = `Administrar ${quantidade.toFixed(2)} ${forma}(s) de ${medicamento}`;

            } else if (formaLowerCase === 'líquido' || formaLowerCase === 'injeção' || formaLowerCase === 'solução') {

                resultadoTexto = `Administrar ${quantidade.toFixed(2)} ml de ${medicamento}`;

            } else {

                return { resultado: "Erro: Forma farmacêutica não reconhecida.", sucesso: false };

            }



            return { resultado: resultadoTexto, sucesso: true, quantidade, prescricaoMg };

        } catch (e) {

            return { resultado: `Erro no cálculo: ${e.message}`, sucesso: false };

        }

    }



    // Verifica se a dosagem prescrita está dentro dos limites de segurança

    verificarSeguranca(prescricaoMg, medicamento) {

        const limite = this.limitesSeguranca[medicamento.toLowerCase()];

        if (limite) {

            if (prescricaoMg > limite.max_dose) {

                return {

                    mensagem: `ALERTA: A dosagem prescrita excede o limite seguro de ${limite.max_dose} ${limite.unidade}.`,

                    tipo: 'warning'

                };

            }

            if (limite.min_dose && prescricaoMg < limite.min_dose) {

                return {

                    mensagem: `ATENÇÃO: A dosagem prescrita está abaixo do limite mínimo de ${limite.min_dose} ${limite.unidade}.`,

                    tipo: 'warning'

                };

            }

        }

        return { mensagem: "Dosagem dentro dos limites seguros.", tipo: 'success' };

    }



    // Adiciona um novo cálculo ao histórico

    adicionarHistorico(medicamento, prescricaoValor, prescricaoUnidade, disponivelValor, disponivelUnidade, forma, resultado, alerta) {

        this.historico.unshift({

            id: Date.now(),

            medicamento: medicamento,

            prescricaoValor: prescricaoValor,

            prescricaoUnidade: prescricaoUnidade,

            disponivelValor: disponivelValor,

            disponivelUnidade: disponivelUnidade,

            forma: forma,

            resultado: resultado,

            alerta: alerta,

        });

        this.salvarHistorico();

    }



    // Remove um item do histórico pelo ID

    removerHistorico(id) {

        this.historico = this.historico.filter(item => item.id !== id);

        this.salvarHistorico();

    }



    // Salva o histórico no armazenamento local

    salvarHistorico() {

        localStorage.setItem('dosageHistory', JSON.stringify(this.historico));

    }



    // Retorna a lista completa do histórico

    obterHistorico() {

        return this.historico;

    }

}



// ======================================

//        2. GERENCIAMENTO DO DOM

// ======================================



document.addEventListener('DOMContentLoaded', () => {

    const sistema = new SafeDoseSystem();



    // Seleção de elementos do DOM

    const form = document.getElementById('dosage-form');

    const resultBox = document.getElementById('result-content');

    const historyList = document.getElementById('history-list');



    // Elementos de mensagem de erro

    const medicationError = document.getElementById('medication-error-message');

    const prescribedDosageError = document.getElementById('prescribed-dosage-error-message');

    const availableConcentrationError = document.getElementById('available-concentration-error-message');

    const formError = document.getElementById('form-error-message');



    // Elementos da modal de confirmação

    const customConfirmModal = document.getElementById('custom-confirm-modal');

    const modalConfirmBtn = document.getElementById('modal-confirm-btn');

    const modalCancelBtn = document.getElementById('modal-cancel-btn');



    // Variável para armazenar o ID do item a ser excluído

    let itemIdToDelete = null;



    // Mapeamento para conversão de unidades de concentração

    const concentracaoParaUnidade = {

        'mg/ml': 'mg',

        'mcg/ml': 'mcg',

        'g/ml': 'g'

    };



    // Função para renderizar o histórico na interface

    function renderizarHistorico() {

        historyList.innerHTML = ''; // Limpa a lista antes de renderizar

        if (sistema.obterHistorico().length === 0) {

            historyList.innerHTML = '<div class="empty-history-message">Nenhum cálculo no histórico.</div>';

            return;

        }



        sistema.obterHistorico().forEach(item => {

            const historyItem = document.createElement('div');

            historyItem.className = 'history-item';

            historyItem.dataset.id = item.id;

            historyItem.innerHTML = `

                <div class="history-item-details">

                    <strong>Medicamento: ${item.medicamento}</strong>

                    <small>Dosagem Prescrita: ${item.prescricaoValor} ${item.prescricaoUnidade}</small>

                    <small>Concentração Disponível: ${item.disponivelValor} ${item.disponivelUnidade} (${item.forma})</small>

                    <span>${item.resultado}</span>

                </div>

                <i class="fas fa-trash-alt delete-btn" title="Excluir"></i>

            `;

            historyList.appendChild(historyItem);

        });

    }



    // Exibe o histórico ao carregar a página

    renderizarHistorico();



    // ======================================

    //       3. MANIPULADORES DE EVENTOS

    // ======================================



    // Limpa mensagens de erro ao interagir com os campos

    document.getElementById('medication-name').addEventListener('change', () => medicationError.textContent = '');

    document.getElementById('prescribed-dosage').addEventListener('input', () => prescribedDosageError.textContent = '');

    document.getElementById('available-concentration').addEventListener('input', () => availableConcentrationError.textContent = '');

    document.getElementById('pharmaceutical-form').addEventListener('change', () => formError.textContent = '');



    // Função para limpar os campos do formulário

    function limparCampos() {

        document.getElementById('medication-name').selectedIndex = 0;

        document.getElementById('prescribed-dosage').value = '';

        document.getElementById('available-concentration').value = '';

        document.getElementById('pharmaceutical-form').selectedIndex = 0;

    }



    // Evento de envio do formulário

    form.addEventListener('submit', (e) => {

        e.preventDefault();



        // Limpa mensagens de erro antes de validar

        medicationError.textContent = '';

        prescribedDosageError.textContent = '';

        availableConcentrationError.textContent = '';

        formError.textContent = '';



        const medicamento = document.getElementById('medication-name').value;

        const prescricaoValor = parseFloat(document.getElementById('prescribed-dosage').value);

        const disponivelValorStr = document.getElementById('available-concentration').value;

        const prescricaoUnidade = document.getElementById('prescribed-unit').value;

        const disponivelUnidadeConcentracao = document.getElementById('available-unit').value;

        const forma = document.getElementById('pharmaceutical-form').value;



        let temErro = false;



        // Validações básicas do formulário

        if (!medicamento) {

            medicationError.textContent = 'Selecione o medicamento.';

            temErro = true;

        }

        if (isNaN(prescricaoValor) || prescricaoValor <= 0) {

            prescribedDosageError.textContent = 'Insira um valor numérico válido (maior que 0).';

            temErro = true;

        }

        if (isNaN(parseFloat(disponivelValorStr)) || parseFloat(disponivelValorStr) <= 0) {

            availableConcentrationError.textContent = 'Insira um valor numérico válido (maior que 0).';

            temErro = true;

        }

        if (!forma) {

            formError.textContent = 'Selecione a forma farmacêutica.';

            temErro = true;

        }



        if (temErro) {

            return;

        }



        const disponivelValor = parseFloat(disponivelValorStr);

        const disponivelUnidade = concentracaoParaUnidade[disponivelUnidadeConcentracao];



        const { resultado, sucesso, prescricaoMg } = sistema.calcularDosagem(

            prescricaoValor,

            prescricaoUnidade,

            disponivelValor,

            forma,

            medicamento

        );



        exibirResultado(resultado, sucesso);



        if (sucesso) {

            const alerta = sistema.verificarSeguranca(prescricaoMg, medicamento);

            exibirAlerta(alerta.mensagem, alerta.tipo);

            sistema.adicionarHistorico(

                medicamento,

                prescricaoValor,

                prescricaoUnidade,

                disponivelValor,

                disponivelUnidadeConcentracao,

                forma,

                resultado,

                alerta.mensagem

            );

            renderizarHistorico();

            limparCampos(); // Limpa os campos após o cálculo bem-sucedido

        } else {

            exibirAlerta(resultado, 'error');

        }

    });



    // Evento de clique na lista de histórico

    historyList.addEventListener('click', (e) => {

        if (e.target.classList.contains('delete-btn')) {

            const itemElement = e.target.closest('.history-item');

            itemIdToDelete = parseInt(itemElement.dataset.id);



            // Exibe a modal de confirmação personalizada

            customConfirmModal.classList.remove('hidden');

        }

    });



    // Evento de clique no botão de confirmação da modal

    modalConfirmBtn.addEventListener('click', () => {

        if (itemIdToDelete) {

            sistema.removerHistorico(itemIdToDelete);

            renderizarHistorico();

            itemIdToDelete = null; // Reseta a variável

        }

        customConfirmModal.classList.add('hidden'); // Oculta a modal

    });



    // Evento de clique no botão de cancelamento da modal

    modalCancelBtn.addEventListener('click', () => {

        itemIdToDelete = null; // Reseta a variável

        customConfirmModal.classList.add('hidden'); // Oculta a modal

    });



    // Opcional: Fecha a modal ao clicar no fundo escurecido

    customConfirmModal.addEventListener('click', (e) => {

        if (e.target === customConfirmModal) {

            itemIdToDelete = null;

            customConfirmModal.classList.add('hidden');

        }

    });



    // ======================================

    //     4. FUNÇÕES DE INTERFACE (UI)

    // ======================================



    // Exibe o resultado do cálculo no painel de resultado

    function exibirResultado(texto, sucesso) {

        resultBox.innerHTML = '';



        const iconClass = sucesso ? 'fa-check-circle' : 'fa-exclamation-circle';

        const iconColor = sucesso ? 'var(--result-success)' : 'var(--alert-error)';

        const icon = `<i class="fas ${iconClass}" style="color: ${iconColor};"></i>`;



        let resultElement = document.createElement('div');

        if (sucesso) {

            resultElement.innerHTML = `

                ${icon}

                <div class="result-text">${texto}</div>

                <div class="safety-message">Verifique o alerta de segurança abaixo.</div>

            `;

        } else {

            resultElement.innerHTML = `

                ${icon}

                <div class="result-text">${texto}</div>

            `;

        }

        resultBox.appendChild(resultElement);

    }



    // Cria e exibe a caixa de alerta dinamicamente

    function exibirAlerta(mensagem, tipo) {

        // Remove a caixa de alerta anterior se existir

        const existingAlert = document.getElementById('safety-alert-box');

        if (existingAlert) {

            existingAlert.remove();

        }



        const alertBox = document.createElement('div');

        alertBox.id = 'safety-alert-box';

        alertBox.className = `safety-alert-box ${tipo}`;

        alertBox.innerHTML = `

            <i class="fas fa-exclamation-triangle"></i>

            <span id="safety-alert-message">${mensagem}</span>

        `;



        // Insere a caixa de alerta após o painel de resultado

        const resultPanel = document.querySelector('.panel.result');

        resultPanel.appendChild(alertBox);

    }

});