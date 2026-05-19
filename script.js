/* ============================================================
   CONFIGURAÇÕES
============================================================ */

const API_PAGAMENTOS = '/api/pagamentos';
const WHATSAPP_NUMERO = '5554991568322';
const WHATSAPP_MENSAGEM_PAGAMENTO = 'Ola! Pagamento aprovado no site. Quero confirmar minha inscricao no treinamento GEN Z & ALPHA.';

let mercadoPagoPublicKey = '';
let formasPagamentoCarregadas = false;

/* ============================================================
   ESTRELAS ANIMADAS
============================================================ */

window.addEventListener('DOMContentLoaded', () => {

  verificarRetornoPagamento();

  const starsEl = document.getElementById('stars');

  if (starsEl) {

    for (let i = 0; i < 80; i++) {

      const s = document.createElement('span');

      const size = Math.random() * 2.5 + 0.5;

      s.style.cssText = `
        width:${size}px;
        height:${size}px;
        left:${Math.random() * 100}%;
        top:${Math.random() * 100}%;
        --d:${(Math.random() * 4 + 2).toFixed(1)}s;
        --delay:${(Math.random() * 5).toFixed(1)}s;
        --op:${(Math.random() * 0.6 + 0.2).toFixed(2)};
      `;

      starsEl.appendChild(s);

    }

  }

});

function verificarRetornoPagamento() {

  const params = new URLSearchParams(window.location.search);
  const status = params.get('pagamento') || params.get('status') || params.get('collection_status');

  if (status === 'aprovado' || status === 'approved') {
    window.setTimeout(() => {
      abrirWhatsappPagamento();
    }, 600);
  }

}

window.abrirWhatsappPagamento = function () {

  const texto = encodeURIComponent(WHATSAPP_MENSAGEM_PAGAMENTO);
  window.location.href = `https://wa.me/${WHATSAPP_NUMERO}?text=${texto}`;

};

/* ============================================================
   SCROLL REVEAL
============================================================ */

window.addEventListener('DOMContentLoaded', () => {

  const observer = new IntersectionObserver((entries) => {

    entries.forEach((e) => {

      if (e.isIntersecting) {
        e.target.classList.add('visible');
      }

    });

  }, { threshold: 0.12 });

  document
    .querySelectorAll('.reveal, .preco-grid')
    .forEach((el) => observer.observe(el));

});

/* ============================================================
   VARIÁVEIS
============================================================ */

let loteAtual = '';
let precoAtual = '';
let compradorAtual = null;
let pagamentoTemplate = '';

window.addEventListener('DOMContentLoaded', () => {

  const paymentView = document.getElementById('modal-payment-view');

  if (paymentView) {
    pagamentoTemplate = paymentView.innerHTML;
  }

});

/* ============================================================
   ABRIR MODAL
============================================================ */

window.abrirModal = function (lote, preco) {
  loteAtual = lote;
  precoAtual = preco;

  const anuncio = document.getElementById('anuncio-overlay');
  if (anuncio) {
    anuncio.style.display = 'none';
    anuncio.style.pointerEvents = 'none';
  }

  const overlay = document.getElementById('modal-overlay');

  if (!overlay) {
    alert('Modal não encontrado no HTML.');
    return;
  }

  overlay.style.display = 'flex';
  overlay.style.opacity = '1';
  overlay.style.visibility = 'visible';
  overlay.style.pointerEvents = 'auto';
  overlay.style.zIndex = '999999';

  const modalBox = document.getElementById('modal-box');
  if (modalBox) {
    modalBox.style.pointerEvents = 'auto';
    modalBox.style.zIndex = '1000000';
  }

  document.body.style.overflow = 'hidden';

  const paymentView = document.getElementById('modal-payment-view');

  if (paymentView && pagamentoTemplate) {
    paymentView.innerHTML = pagamentoTemplate;
  }

  document.getElementById('modal-lote-label').innerText = lote;
  document.getElementById('modal-preco-label').innerText = preco;
  document.getElementById('payment-lote-label').innerText = lote;
  document.getElementById('payment-preco-label').innerText = preco;

  document.getElementById('modal-form-view').style.display = 'block';
  document.getElementById('modal-payment-view').style.display = 'none';

  document.getElementById('modal-error').innerText = '';
  document.getElementById('payment-error').innerText = '';
  compradorAtual = null;

  document.getElementById('f-nome').value = '';
  document.getElementById('f-email').value = '';
  document.getElementById('f-cpf').value = '';
  document.getElementById('f-tel').value = '';
};

/* ============================================================
   FECHAR MODAL
============================================================ */

window.fecharModal = function () {

  const overlay = document.getElementById('modal-overlay');

  if (overlay) {

    overlay.style.display = 'none';
    overlay.style.opacity = '0';
    overlay.style.visibility = 'hidden';

  }

  document.body.style.overflow = '';

};

/* ============================================================
   VOLTAR FORMULÁRIO
============================================================ */

window.voltarFormulario = function () {

  const paymentView = document.getElementById('modal-payment-view');
  const formView = document.getElementById('modal-form-view');

  if (paymentView) {
    paymentView.style.display = 'none';
  }

  if (formView) {
    formView.style.display = 'block';
  }

};

/* ============================================================
   FECHAR AO CLICAR FORA
============================================================ */

window.addEventListener('DOMContentLoaded', () => {

  const overlay = document.getElementById('modal-overlay');

  if (!overlay) return;

  overlay.addEventListener('click', function (e) {

    if (e.target === overlay) {
      fecharModal();
    }

  });

});

/* ============================================================
   CONFIRMAR
============================================================ */

window.confirmar = function () {

  const nome = document.getElementById('f-nome').value.trim();
  const email = document.getElementById('f-email').value.trim();
  const cpf = document.getElementById('f-cpf').value.trim();
  const tel = document.getElementById('f-tel').value.trim();

  const err = document.getElementById('modal-error');

  if (!nome) {
    err.innerText = 'Informe seu nome completo.';
    return;
  }

  if (!email || !email.includes('@')) {
    err.innerText = 'Informe um e-mail válido.';
    return;
  }

  if (cpf.replace(/\D/g, '').length < 11) {
    err.innerText = 'CPF inválido.';
    return;
  }

  if (tel.replace(/\D/g, '').length < 10) {
    err.innerText = 'Telefone inválido.';
    return;
  }

  err.innerText = '';

  compradorAtual = {
    lote: loteAtual,
    nome,
    email,
    cpf,
    telefone: tel
  };

  const formView = document.getElementById('modal-form-view');
  const paymentView = document.getElementById('modal-payment-view');

  if (formView) {
    formView.style.display = 'none';
  }

  if (paymentView) {
    paymentView.style.display = 'block';
  }

  atualizarFormasPagamentoDisponiveis();

};

/* ============================================================
   PAGAMENTO PIX
============================================================ */

function obterCompradorAtual() {

  const erro = document.getElementById('payment-error');

  if (!compradorAtual) {
    erro.innerText = 'Confirme seus dados antes de escolher o pagamento.';
    return null;
  }

  erro.innerText = '';
  return compradorAtual;

}

async function enviarPagamento(endpoint, dados) {

  const response = await fetch(`${API_PAGAMENTOS}/${endpoint}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(dados)
  });

  const body = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(body.erro || 'Nao foi possivel iniciar o pagamento.');
  }

  return body;

}

async function carregarConfiguracaoMercadoPago() {

  const response = await fetch(`${API_PAGAMENTOS}/config`);
  const config = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(config.erro || 'Nao foi possivel carregar a configuracao do Mercado Pago.');
  }

  mercadoPagoPublicKey = config.publicKey || '';
  return config;

}

async function carregarFormasPagamento() {

  const response = await fetch(`${API_PAGAMENTOS}/metodos`);
  const body = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(body.erro || 'Nao foi possivel consultar as formas de pagamento.');
  }

  return Array.isArray(body.metodos) ? body.metodos : [];

}

function atualizarBotaoPagamento(selector, texto, habilitado) {

  const button = document.querySelector(selector);
  if (!button) return;

  const small = button.querySelector('small');
  if (small) {
    small.innerText = texto;
  }

  button.disabled = !habilitado;

}

async function atualizarFormasPagamentoDisponiveis() {

  if (formasPagamentoCarregadas) return;

  const erro = document.getElementById('payment-error');

  try {
    if (erro) {
      erro.innerText = 'Consultando formas de pagamento...';
    }

    const config = await carregarConfiguracaoMercadoPago();
    if (!config.possuiAccessToken) {
      throw new Error('Access Token do Mercado Pago nao configurado no servidor.');
    }

    const metodos = await carregarFormasPagamento();
    const temPix = metodos.some((metodo) => metodo.id === 'pix');
    const temCartaoCredito = metodos.some((metodo) => metodo.tipo === 'credit_card');

    atualizarBotaoPagamento('.payment-option-btn.pix', temPix ? 'Pagamento instantaneo' : 'Pix indisponivel', temPix);
    atualizarBotaoPagamento('.payment-option-btn.card', temCartaoCredito ? 'Cartao de credito' : 'Cartao indisponivel', temCartaoCredito);

    formasPagamentoCarregadas = true;

    if (erro) {
      erro.innerText = '';
    }
  } catch (e) {
    atualizarBotaoPagamento('.payment-option-btn.pix', 'Configure o Mercado Pago', false);
    atualizarBotaoPagamento('.payment-option-btn.card', 'Configure o Mercado Pago', false);

    if (erro) {
      erro.innerText = e.message;
    }
  }

}

function bloquearBotoesPagamento(bloquear) {

  document.querySelectorAll('.payment-option-btn').forEach((button) => {
    button.disabled = bloquear;
  });

}

function renderizarPix(resultado) {

  const paymentView = document.getElementById('modal-payment-view');

  paymentView.innerHTML = `
    <h3 class="modal-title">Pix gerado</h3>
    <p class="modal-lote">${loteAtual}</p>
    <p class="modal-preco">${precoAtual}</p>

    <div class="pix-result">
      <h4>Escaneie o QR Code</h4>
      <p class="pix-result-sub">Depois do pagamento, a confirmacao acontece pelo Mercado Pago.</p>
      <img class="pix-qrcode" src="data:image/png;base64,${resultado.qrCodeBase64}" alt="QR Code Pix">
      <label class="pix-copy-label" for="pix-copy-code">Codigo Pix copia e cola</label>
      <textarea id="pix-copy-code" readonly>${resultado.qrCode}</textarea>
      <button type="button" class="btn-copiar-pix" onclick="copiarPix()">Copiar codigo Pix</button>
      <p class="pix-amount">Valor: R$ ${Number(resultado.valor).toFixed(2).replace('.', ',')}</p>
      <p class="pix-result-sub" id="pix-status">Aguardando confirmacao do pagamento...</p>
    </div>

    <button type="button" class="btn-voltar-form" onclick="fecharModal()">Fechar</button>
  `;

}

async function consultarStatusPagamento(paymentId) {

  const response = await fetch(`${API_PAGAMENTOS}/status/${paymentId}`);
  const body = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(body.erro || 'Nao foi possivel consultar o status do pagamento.');
  }

  return body;

}

function aguardarPagamentoPix(paymentId) {

  const statusEl = document.getElementById('pix-status');
  let tentativas = 0;
  const maxTentativas = 60;

  const intervalId = window.setInterval(async () => {
    tentativas += 1;

    try {
      const resultado = await consultarStatusPagamento(paymentId);

      if (resultado.status === 'approved') {
        window.clearInterval(intervalId);

        if (statusEl) {
          statusEl.innerText = 'Pagamento aprovado. Abrindo WhatsApp...';
        }

        abrirWhatsappPagamento();
        return;
      }

      if (statusEl) {
        statusEl.innerText = 'Aguardando confirmacao do pagamento...';
      }
    } catch (e) {
      if (statusEl) {
        statusEl.innerText = e.message;
      }
    }

    if (tentativas >= maxTentativas) {
      window.clearInterval(intervalId);

      if (statusEl) {
        statusEl.innerText = 'Pagamento ainda nao confirmado. Se ja pagou, aguarde alguns instantes ou fale pelo WhatsApp.';
      }
    }
  }, 5000);

}

window.copiarPix = async function () {

  const campo = document.getElementById('pix-copy-code');

  if (!campo) return;

  await navigator.clipboard.writeText(campo.value);

};

window.pagarPix = async function () {

  const dados = obterCompradorAtual();
  if (!dados) return;

  const erro = document.getElementById('payment-error');

  try {
    bloquearBotoesPagamento(true);
    erro.innerText = 'Gerando Pix seguro...';

    const resultado = await enviarPagamento('pix', dados);
    renderizarPix(resultado);

    if (resultado.id) {
      aguardarPagamentoPix(resultado.id);
    }
  } catch (e) {
    erro.innerText = e.message;
  } finally {
    bloquearBotoesPagamento(false);
  }

};

/* ============================================================
   PAGAMENTO CARTÃO
============================================================ */

window.pagarCartao = async function () {

  const dados = obterCompradorAtual();
  if (!dados) return;

  const erro = document.getElementById('payment-error');

  try {
    bloquearBotoesPagamento(true);
    erro.innerText = 'Abrindo checkout seguro...';

    const resultado = await enviarPagamento('checkout', dados);

    if (!resultado.initPoint) {
      throw new Error('Checkout nao retornou link de pagamento.');
    }

    window.location.href = resultado.initPoint;
    erro.innerText = '';
  } catch (e) {
    erro.innerText = e.message;
  } finally {
    bloquearBotoesPagamento(false);
  }

};

/* ============================================================
   MÁSCARA CPF
============================================================ */

window.addEventListener('DOMContentLoaded', () => {

  const cpfInput = document.getElementById('f-cpf');

  if (!cpfInput) return;

  cpfInput.addEventListener('input', function () {

    let v = this.value
      .replace(/\D/g, '')
      .slice(0, 11);

    if (v.length > 9) {

      v = v.replace(
        /(\d{3})(\d{3})(\d{3})(\d{0,2})/,
        '$1.$2.$3-$4'
      );

    }

    else if (v.length > 6) {

      v = v.replace(
        /(\d{3})(\d{3})(\d{0,3})/,
        '$1.$2.$3'
      );

    }

    else if (v.length > 3) {

      v = v.replace(
        /(\d{3})(\d{0,3})/,
        '$1.$2'
      );

    }

    this.value = v;

  });

});

/* ============================================================
   MÁSCARA TELEFONE
============================================================ */

window.addEventListener('DOMContentLoaded', () => {

  const telInput = document.getElementById('f-tel');

  if (!telInput) return;

  telInput.addEventListener('input', function () {

    let v = this.value
      .replace(/\D/g, '')
      .slice(0, 11);

    if (v.length > 6) {

      v = v.replace(
        /(\d{2})(\d{5})(\d{0,4})/,
        '($1) $2-$3'
      );

    }

    else if (v.length > 2) {

      v = v.replace(
        /(\d{2})(\d{0,5})/,
        '($1) $2'
      );

    }

    this.value = v;

  });

});

/* ============================================================
   BOTÃO VER MAIS
============================================================ */

window.addEventListener('DOMContentLoaded', () => {

  document.querySelectorAll('.depo-quote').forEach((quote) => {

    const btn = document.createElement('button');

    btn.type = 'button';
    btn.className = 'btn-ver-mais';
    btn.textContent = 'Ver mais';

    quote.parentElement.insertBefore(
      btn,
      quote.nextElementSibling
    );

    btn.addEventListener('click', () => {

      quote.classList.toggle('depo-aberto');

      btn.textContent =
        quote.classList.contains('depo-aberto')
          ? 'Ver menos'
          : 'Ver mais';

    });

  });

});
