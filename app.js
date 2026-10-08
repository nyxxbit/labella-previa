/* Labella Disk Pizza: combos, cardápio, comanda e o pedido no WhatsApp.
 *
 * Dinheiro é centavo inteiro do começo ao fim. O valor da comanda é sempre
 * recalculado a partir de dados.js, nunca lido do que ficou guardado no
 * navegador: se a Labella mudar um preço, quem voltou com a comanda cheia vê
 * o preço novo, e não o da semana passada.
 */
(function () {
  'use strict';

  var L = window.LABELLA;
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };

  var SABOR = {}, COMBO = {}, BEBIDA = {}, BORDA = {};
  L.sabores.forEach(function (s) { SABOR[s.id] = s; });
  L.combos.forEach(function (c) { COMBO[c.id] = c; });
  L.bebidas.forEach(function (b) { BEBIDA[b.id] = b; });
  L.bordas.forEach(function (b) { BORDA[b.id] = b; });

  /* Combo sem preço não existe no site (pendência 1: o combo 4). */
  function comboValido(c) { return !!c && typeof c.preco === 'number'; }
  /* Sabor que só existe dentro de combo não tem preço avulso. */
  function avulso(s) { return !!s && !s.soCombo && typeof s.preco === 'number'; }

  var reduz = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  var telaLarga = window.matchMedia('(min-width: 1100px)');

  /* ---------------------------------------------------------- utilidades */

  function esc(v) {
    return String(v == null ? '' : v).replace(/[&<>"']/g, function (m) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m];
    });
  }

  function semAcento(v) {
    return String(v || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  }

  function milhar(n) { return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, '.'); }

  function reais(c) {
    var cent = String(c % 100);
    if (cent.length < 2) cent = '0' + cent;
    return 'R$ ' + milhar(Math.floor(c / 100)) + ',' + cent;
  }

  /* "R$ 55" é como o preço aparece nos posts; centavo só quando existe. */
  function reaisCurto(c) { return c % 100 === 0 ? 'R$ ' + milhar(c / 100) : reais(c); }

  /* Tudo que o navegador guarda passa por aqui. Em aba anônima, com site
     bloqueado ou cota cheia, o acesso lança erro; a comanda continua
     funcionando, só não sobrevive a um recarregar. */
  var guarda = {
    ler: function (k) { try { return JSON.parse(localStorage.getItem(k)); } catch (e) { return null; } },
    gravar: function (k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* segue sem guardar */ } }
  };

  var avisoTimer;
  function aviso(txt) {
    var el = $('#aviso');
    el.textContent = txt;
    el.classList.add('on');
    clearTimeout(avisoTimer);
    avisoTimer = setTimeout(function () { el.classList.remove('on'); }, 2600);
  }

  function linkZap(texto) { return 'https://wa.me/' + L.whatsapp + '?text=' + encodeURIComponent(texto); }

  /* ---------------------------------------------------------- horário */

  /* O horário é o de Brasília, e não o do aparelho: quem abre o site com o
     celular em outro fuso não pode ver "aberto" com a Labella fechada. */
  var DIA = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  var NOME_DIA = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'];

  function agora() {
    try {
      var p = {};
      new Intl.DateTimeFormat('en-US', {
        timeZone: 'America/Sao_Paulo', weekday: 'short', hour: 'numeric', minute: 'numeric',
        day: '2-digit', month: '2-digit', hourCycle: 'h23'
      }).formatToParts(new Date()).forEach(function (x) { p[x.type] = x.value; });
      var h = (+p.hour) % 24, m = +p.minute;
      return { dia: DIA[p.weekday], min: h * 60 + m, data: p.day + '/' + p.month, hora: h + ':' + (m < 10 ? '0' : '') + m };
    } catch (e) {
      var d = new Date();
      return {
        dia: d.getDay(), min: d.getHours() * 60 + d.getMinutes(),
        data: ('0' + d.getDate()).slice(-2) + '/' + ('0' + (d.getMonth() + 1)).slice(-2),
        hora: d.getHours() + ':' + ('0' + d.getMinutes()).slice(-2)
      };
    }
  }

  function hora(min) { var h = Math.floor(min / 60), m = min % 60; return h + 'h' + (m ? ('0' + m).slice(-2) : ''); }

  function proximoDia(dia) {
    for (var i = 1; i <= 7; i++) {
      var d = (dia + i) % 7;
      if (L.horario.dias.indexOf(d) >= 0) return i === 1 ? 'amanhã' : NOME_DIA[d];
    }
    return '';
  }

  function situacao() {
    var a = agora(), H = L.horario;
    var abreHoje = H.dias.indexOf(a.dia) >= 0;
    if (abreHoje && a.min >= H.abre && a.min < H.fecha) {
      return { sim: true, curto: 'Aberto · até ' + hora(H.fecha), longo: 'Aberto agora. Fecha às ' + hora(H.fecha) + '.' };
    }
    if (abreHoje && a.min < H.abre) {
      return { sim: false, curto: 'Abre hoje às ' + hora(H.abre), longo: 'Abre hoje às ' + hora(H.abre) + '.' };
    }
    var volta = proximoDia(a.dia);
    return { sim: false, curto: 'Fechado · volta ' + volta, longo: 'Fechado agora. Volta ' + volta + ', às ' + hora(H.abre) + '.' };
  }

  /* Quarta em Dobro: o site avisa e, na mensagem, pergunta. Quem confirma o
     brinde é a Labella, no WhatsApp. */
  var hojeQuarta = false;

  function pintarSituacao() {
    var s = situacao();
    $$('[data-situacao]').forEach(function (el) { el.textContent = s.curto; el.classList.toggle('sim', s.sim); });
    $$('[data-situacao-longa]').forEach(function (el) { el.textContent = s.longo; el.classList.toggle('sim', s.sim); });
    var avisoHora = $('#avisoHora');
    avisoHora.hidden = s.sim;
    avisoHora.textContent = s.sim ? '' : s.longo + ' Dá pra mandar a comanda mesmo assim.';
    var a = agora();
    $$('[data-quando]').forEach(function (el) { el.textContent = a.data + ' · ' + a.hora; });
    var era = hojeQuarta;
    hojeQuarta = !!L.quartaEmDobro && a.dia === 3;
    var quarta = $('#quarta');
    quarta.hidden = !hojeQuarta;
    if (hojeQuarta) quarta.textContent = 'Hoje é Quarta em Dobro: comprou qualquer pizza, o broto de chocolate é por conta da Labella.';
    if (era !== hojeQuarta) pintarComanda();
  }

  /* ---------------------------------------------------------- combos */

  function bebidaTexto(c) {
    return c.bebidas.map(function (id) { return BEBIDA[id].curto.replace(/ 2 L$/, ''); }).join(' ou ') + ' 2 L';
  }

  function parcelas(c) {
    var p = [(c.grandes === 1 ? '1 grande' : c.grandes + ' grandes'), bebidaTexto(c)];
    if (c.brinde) p.push(c.brinde);
    return p;
  }

  /* Parcela na tela: o "+" anda grudado na palavra seguinte e o "2 L" não
     se separa. Sem isso o "+" ficava sozinho no fim da linha. */
  function parcelaHtml(x, i) {
    var t = esc(x).replace(/ (\d+) L\b/g, '&nbsp;$1&nbsp;L').replace(/^(\d+) /, '$1&nbsp;');
    return (i ? '<i>+</i>&nbsp;' : '') + t;
  }

  /* A via da abertura mostra o combo mais em conta, seja qual for. */
  function montarVia() {
    var via = $('#viaAbertura');
    var c = L.combos.filter(comboValido).sort(function (a, b) { return a.preco - b.preco; })[0];
    if (!c) { via.hidden = true; return; }
    via.setAttribute('data-combo', c.id);
    $('[data-parcelas]', via).innerHTML = parcelas(c).map(function (x, i) {
      return '<span class="via-l">' + parcelaHtml(x, i) + '</span>';
    }).join('');
    $('[data-preco-combo]', via).textContent = reaisCurto(c.preco);
  }

  function montarContas() {
    $('#contas').innerHTML = L.combos.filter(comboValido).map(function (c) {
      var nomes = c.sabores.map(function (id) { return SABOR[id] && SABOR[id].nome; }).filter(Boolean);
      var resto = nomes.length - 4;
      return '<li class="conta">' +
        '<h3 class="conta-nome">' + esc(c.nome) + '</h3>' +
        '<p class="conta-soma">' + parcelas(c).map(function (x, i) {
          return '<span>' + parcelaHtml(x, i) + '</span>';
        }).join(' ') + '</p>' +
        '<p class="conta-res"><i>=</i> ' + reaisCurto(c.preco) + '</p>' +
        '<p class="conta-sabores"><b>' + nomes.length + ' sabores pra escolher:</b> ' +
          esc(nomes.slice(0, 4).join(', ')) + (resto > 0 ? ' e mais ' + resto + '.' : '.') + '</p>' +
        '<button class="btn btn-molho" type="button" data-combo="' + c.id + '">Escolher o sabor</button>' +
      '</li>';
    }).join('');
  }

  /* ---------------------------------------------------------- cardápio */

  var GRUPOS = [
    { id: 'r50', chip: 'R$ 50', titulo: 'R$ 50', ePreco: true, nome: 'salgadas',
      itens: function () { return L.sabores.filter(function (s) { return avulso(s) && s.tipo === 'salgada' && s.preco === 5000; }); } },
    { id: 'r70', chip: 'R$ 70', titulo: 'R$ 70', ePreco: true, nome: 'salgadas',
      itens: function () { return L.sabores.filter(function (s) { return avulso(s) && s.tipo === 'salgada' && s.preco === 7000; }); } },
    { id: 'mignon', chip: 'Filé mignon', titulo: 'Filé mignon', comPreco: true,
      itens: function () { return L.sabores.filter(function (s) { return avulso(s) && s.tipo === 'salgada' && s.preco > 7000; }); } },
    { id: 'doces', chip: 'Doces', titulo: 'Doces', comPreco: true,
      itens: function () { return L.sabores.filter(function (s) { return avulso(s) && s.tipo === 'doce'; }); } },
    { id: 'bebidas', chip: 'Bebidas', titulo: 'Bebidas', comPreco: true, bebida: true,
      itens: function () { return L.bebidas; } }
  ];

  function destacar(texto, q) {
    if (!q) return esc(texto);
    var n = semAcento(texto), i = n.indexOf(q);
    if (i < 0) return esc(texto);
    return esc(texto.slice(0, i)) + '<mark>' + esc(texto.slice(i, i + q.length)) + '</mark>' + esc(texto.slice(i + q.length));
  }

  function linhaCardapio(it, g, q) {
    var acao = g.bebida
      ? '<button class="anotar" type="button" data-bebida="' + it.id + '" aria-label="Anotar ' + esc(it.nome) + '">+</button>'
      : '<button class="anotar" type="button" data-pizza="' + it.id + '" aria-label="Escolher ' + esc(it.nome) + '">+</button>';
    return '<li class="sabor' + (g.comPreco ? ' com-preco' : '') + '">' +
      '<div class="sabor-txt"><h4>' + destacar(it.nome, q) + '</h4>' +
        (it.ing ? '<p>' + destacar(it.ing, q) + '</p>' : '') + '</div>' +
      (g.comPreco ? '<span class="preco">' + reaisCurto(it.preco) + '</span>' : '') +
      acao +
    '</li>';
  }

  function pintarCardapio() {
    var bruto = $('#busca').value.trim();
    var q = semAcento(bruto);
    var achados = 0, visiveis = [], html = '';

    GRUPOS.forEach(function (g) {
      var itens = g.itens().filter(function (it) { return !q || semAcento(it.nome + ' ' + (it.ing || '')).indexOf(q) >= 0; });
      if (!itens.length) return;
      achados += itens.length;
      visiveis.push(g);
      var conta = g.bebida ? itens.length + (itens.length === 1 ? ' bebida' : ' bebidas') : itens.length + (itens.length === 1 ? ' sabor' : ' sabores');
      /* O preço do broto aparece no cabeçalho da faixa: R$ 25, ou de R$ 25 a
         R$ 35 quando a faixa mistura preços (os doces). */
      var brotos = itens.map(precoBroto).filter(Boolean).sort(function (a, b) { return a - b; });
      if (brotos.length) {
        var menor = brotos[0], maior = brotos[brotos.length - 1];
        conta += ' · broto ' + (menor === maior ? reaisCurto(menor) : 'de ' + reaisCurto(menor) + ' a ' + reaisCurto(maior));
      }
      html += '<section class="faixa" id="faixa-' + g.id + '" aria-labelledby="hf-' + g.id + '">' +
        '<header class="faixa-cab"><h3 id="hf-' + g.id + '">' +
          '<span class="faixa-titulo' + (g.ePreco ? ' grande' : '') + '">' + esc(g.titulo) + '</span>' +
          (g.nome ? '<span class="faixa-nome">' + esc(g.nome) + '</span>' : '') + '</h3>' +
          '<p class="faixa-conta">' + conta + '</p></header>' +
        '<ul class="sabores">' + itens.map(function (it) { return linhaCardapio(it, g, q); }).join('') + '</ul>' +
      '</section>';
    });

    if (!achados) {
      html = '<div class="nada"><p>Nada com “' + esc(bruto) + '” no cardápio.</p>' +
        '<a class="btn btn-molho" href="' + esc(linkZap('Oi, Labella! Vim pelo site. Vocês fazem pizza com ' + bruto + '?')) +
        '" target="_blank" rel="noopener">Perguntar pra Labella</a></div>';
    }
    $('#lista').innerHTML = html;
    $('#contagem').textContent = q ? achados + (achados === 1 ? ' resultado' : ' resultados') + ' pra “' + bruto + '”' : '';
    $('#faixas').innerHTML = visiveis.map(function (g, i) {
      return '<a href="#faixa-' + g.id + '"' + (i === 0 ? ' class="on"' : '') + '>' + esc(g.chip) + '</a>';
    }).join('');
    vigiarFaixas();
  }

  /* O botão aceso segue a parte do cardápio que está na tela. */
  var observador = null;
  function vigiarFaixas() {
    if (!('IntersectionObserver' in window)) return;
    if (observador) observador.disconnect();
    observador = new IntersectionObserver(function (entradas) {
      entradas.forEach(function (en) {
        if (!en.isIntersecting) return;
        var id = en.target.id.replace('faixa-', '');
        $$('#faixas a').forEach(function (a) {
          var on = a.getAttribute('href') === '#faixa-' + id;
          a.classList.toggle('on', on);
          if (on) a.parentNode.scrollTo({ left: a.offsetLeft - 16, behavior: reduz ? 'auto' : 'smooth' });
        });
      });
    }, { rootMargin: '-140px 0px -60% 0px' });
    $$('.faixa').forEach(function (s) { observador.observe(s); });
  }

  /* ---------------------------------------------------------- preço e descrição */

  function nomeSabor(id) { return SABOR[id] ? SABOR[id].nome : ''; }

  function textoMetades(fatia) {
    return fatia.length > 1 ? 'meio ' + nomeSabor(fatia[0]) + ', meio ' + nomeSabor(fatia[1]) : nomeSabor(fatia[0]);
  }

  /* Broto: preço provisório por faixa (ver dados.js). Sem preço, sem broto. */
  function precoBroto(s) { return s && L.broto ? L.broto[s.preco] || 0 : 0; }

  /* Pizza grande: vale o sabor mais caro (regra do MenuDino). Broto: um
     sabor só, sem borda. Combo: o preço é o do combo, qualquer que seja o
     sabor da lista. */
  function precoUnidade(l) {
    if (l.tipo === 'bebida') return BEBIDA[l.id].preco;
    var borda = l.borda && BORDA[l.borda] ? BORDA[l.borda].preco : 0;
    if (l.tipo === 'combo') return COMBO[l.id].preco + borda * COMBO[l.id].grandes;
    if (l.tamanho === 'broto') return precoBroto(SABOR[l.fatias[0][0]]);
    var maior = 0;
    l.fatias[0].forEach(function (id) { if (SABOR[id] && SABOR[id].preco > maior) maior = SABOR[id].preco; });
    return maior + borda;
  }

  /* Uma descrição pra comanda na tela e outra, mais completa, pra mensagem. */
  function descricao(l) {
    var borda = l.borda && BORDA[l.borda] ? BORDA[l.borda].nome : null;
    if (l.tipo === 'bebida') return { nome: BEBIDA[l.id].nome, det: [], msg: BEBIDA[l.id].nome, msgDet: [] };
    if (l.tipo === 'combo') {
      var c = COMBO[l.id];
      /* Na tela só o sabor; na mensagem, "Grande de Bacon" ou "Grande meio
         X, meio Y" (e não "Grande de meio X"). */
      var sabores = l.fatias.map(function (f, i) {
        return (c.grandes > 1 ? (i + 1) + 'ª: ' : '') + textoMetades(f);
      });
      var grandes = l.fatias.map(function (f, i) {
        return 'Grande ' + (c.grandes > 1 ? (i + 1) + ' ' : '') + (f.length > 1 ? textoMetades(f) : 'de ' + nomeSabor(f[0]));
      });
      var resto = [BEBIDA[l.bebida].curto];
      if (c.brinde) resto.push(c.brinde);
      if (borda) resto.push(borda.toLowerCase());
      return {
        nome: c.nome,
        det: [sabores.join(' · '), resto.join(' · ')],
        msg: c.nome,
        msgDet: grandes.concat(resto.map(function (x) { return x.charAt(0).toUpperCase() + x.slice(1); }))
      };
    }
    var f = l.fatias[0];
    if (l.tamanho === 'broto') {
      return { nome: nomeSabor(f[0]), det: ['Broto'], msg: 'Pizza broto de ' + nomeSabor(f[0]), msgDet: [] };
    }
    var nome = f.length > 1 ? '½ ' + nomeSabor(f[0]) + ' · ½ ' + nomeSabor(f[1]) : nomeSabor(f[0]);
    return {
      nome: nome,
      det: ['Pizza grande' + (borda ? ' · ' + borda.toLowerCase() : '')],
      msg: 'Pizza grande ' + (f.length > 1 ? textoMetades(f) : 'de ' + nomeSabor(f[0])),
      msgDet: borda ? [borda] : []
    };
  }

  /* ---------------------------------------------------------- folha de opções */

  var escolha = null;   // { tipo, id, fatias: [[id, id?]], meio: [bool], bebida, borda, obs, qtd }
  var quemAbriu = null;

  function chip(nome, valor, rotulo, marcado, extra) {
    return '<label class="chip"><input type="radio" name="' + nome + '" value="' + esc(valor) + '"' + (marcado ? ' checked' : '') + '>' +
      '<span>' + esc(rotulo) + (extra ? ' <small>' + esc(extra) + '</small>' : '') + '</span></label>';
  }

  function grupoChips(rotulo, nome, opcoes, marcado) {
    return '<fieldset class="op"><legend class="op-rot">' + esc(rotulo) + '</legend><div class="opcoes">' +
      opcoes.map(function (o) { return chip(nome, o.valor, o.rot, o.valor === marcado, o.extra); }).join('') +
    '</div></fieldset>';
  }

  function grupoSabores(rotulo, ids, nome, mostrarPreco, marcado) {
    var lista = ids.map(function (id) { return SABOR[id]; }).filter(Boolean);
    var busca = lista.length > 10
      ? '<input class="op-busca" type="search" placeholder="Procurar sabor ou ingrediente" aria-label="Procurar sabor ou ingrediente" data-busca-op>'
      : '';
    return '<fieldset class="op" data-grupo="' + nome + '"><legend class="op-rot">' + esc(rotulo) +
        ' <span>' + lista.length + ' sabores</span></legend>' + busca +
      '<div class="escolhas">' + lista.map(function (s) {
        return '<label class="escolha" data-busca="' + esc(semAcento(s.nome + ' ' + (s.ing || ''))) + '">' +
          '<input type="radio" name="' + nome + '" value="' + s.id + '"' + (s.id === marcado ? ' checked' : '') + '>' +
          '<span><b>' + esc(s.nome) + '</b>' + (s.ing ? '<small>' + esc(s.ing) + '</small>' : '') + '</span>' +
          (mostrarPreco ? '<span class="preco">' + reaisCurto(s.preco) + '</span>' : '<span></span>') +
        '</label>';
      }).join('') + '</div>' +
      '<p class="op-falta" data-falta="' + nome + '" hidden>Escolha o sabor.</p></fieldset>';
  }

  /* Borda: a primeira da lista já vem marcada (a de catupiry, que não é
     cobrada). Não existe "sem borda" (pedido do cliente, 08/10). O valor vai
     com centavos, como ele pediu: R$ 0,00 e +R$ 7,00. */
  function bordaPadrao() { return L.bordas.length ? L.bordas[0].id : null; }

  function grupoBorda() {
    if (!L.bordas.length) return '';
    return grupoChips('Borda', 'borda', L.bordas.map(function (b) {
      var rot = b.nome.replace(/^Borda de /, '');
      return { valor: b.id, rot: rot.charAt(0).toUpperCase() + rot.slice(1), extra: b.preco ? '+' + reais(b.preco) : reais(0) };
    }), bordaPadrao());
  }

  function grupoObs() {
    return '<div class="op"><label class="op-rot" for="opObs">Observação <span>se quiser</span></label>' +
      '<textarea class="op-obs" id="opObs" rows="2" placeholder="Ex.: sem cebola, bem assada" data-obs></textarea></div>';
  }

  /* A outra metade sai da mesma lista: salgada com salgada, doce com doce. */
  function grupoMeio(g, ids, mostrarPreco, rotulo) {
    return grupoChips(rotulo || 'Inteira ou meio a meio', 'meio-' + g, [
      { valor: 'inteira', rot: 'Inteira' }, { valor: 'meio', rot: 'Meio a meio' }
    ], 'inteira') +
    '<div data-metade="' + g + '" hidden>' +
      grupoSabores('Outra metade', ids, 's' + g + '-1', mostrarPreco) +
      (mostrarPreco ? '<p class="op-nota">No meio a meio vale o preço do sabor mais caro.</p>' : '') +
    '</div>';
  }

  function abrirCombo(id, botao) {
    var c = COMBO[id];
    if (!comboValido(c)) return;
    quemAbriu = botao || null;
    escolha = { tipo: 'combo', id: id, fatias: [], meio: [], bebida: c.bebidas[0], borda: bordaPadrao(), obs: '', qtd: 1 };
    for (var g = 0; g < c.grandes; g++) { escolha.fatias.push([]); escolha.meio.push(false); }

    $('#folhaSobre').textContent = 'Combo · ' + reaisCurto(c.preco);
    $('#folhaTitulo').textContent = c.nome;
    $('#folhaDesc').textContent = parcelas(c).join(' + ') + '.';

    var h = '';
    for (g = 0; g < c.grandes; g++) {
      h += grupoSabores(c.grandes > 1 ? 'Sabor da ' + (g + 1) + 'ª grande' : 'Sabor da grande', c.sabores, 's' + g + '-0', false);
      if (L.meioAMeio.combo) h += grupoMeio(g, c.sabores, false);
    }
    if (c.bebidas.length > 1) {
      h += grupoChips('Refrigerante 2 L', 'bebida', c.bebidas.map(function (b) { return { valor: b, rot: BEBIDA[b].curto }; }), escolha.bebida);
    }
    h += grupoBorda() + grupoObs();
    $('#folhaCorpo').innerHTML = h;
    abrirFolha();
  }

  function abrirPizza(id, botao) {
    var s = SABOR[id];
    if (!avulso(s)) return;
    quemAbriu = botao || null;
    escolha = { tipo: 'pizza', id: id, tamanho: 'grande', fatias: [[id]], meio: [false], bebida: null, borda: s.tipo === 'salgada' ? bordaPadrao() : null, obs: '', qtd: 1 };
    var broto = precoBroto(s);

    $('#folhaSobre').textContent = 'Grande ' + reaisCurto(s.preco) + (broto ? ' · broto ' + reaisCurto(broto) : '');
    $('#folhaTitulo').textContent = s.nome;
    $('#folhaDesc').textContent = s.ing || '';

    var h = '';
    if (broto) {
      h += grupoChips('Tamanho', 'tamanho', [
        { valor: 'grande', rot: 'Grande', extra: reaisCurto(s.preco) },
        { valor: 'broto', rot: 'Broto', extra: reaisCurto(broto) }
      ], 'grande');
    }
    /* Meio a meio e borda são só da grande: no broto, somem. */
    h += '<div data-so-grande>';
    if (L.meioAMeio.avulsa) {
      var outros = L.sabores.filter(function (x) { return avulso(x) && x.tipo === s.tipo && x.id !== s.id; }).map(function (x) { return x.id; });
      h += grupoMeio(0, outros, true);
    }
    if (s.tipo === 'salgada') h += grupoBorda();
    h += '</div>' + grupoObs();
    $('#folhaCorpo').innerHTML = h;
    abrirFolha();
  }

  function abrirFolha() {
    $('#qtd').textContent = '1';
    atualizarAnotar();
    abrirPainel('#folha', function () { $('#folha .fechar').focus(); });
    $('#folhaRolagem').scrollTop = 0;
  }

  function atualizarAnotar() {
    $('#anotar').textContent = 'Anotar · ' + reais(precoUnidade(escolha) * escolha.qtd);
    $('#menos').disabled = escolha.qtd <= 1;
    $('#mais').disabled = escolha.qtd >= 20;
  }

  $('#folhaCorpo').addEventListener('change', function (e) {
    var t = e.target;
    if (!escolha || t.type !== 'radio') return;
    var m = /^s(\d+)-(\d+)$/.exec(t.name);
    if (m) {
      escolha.fatias[+m[1]][+m[2]] = t.value;
      var falta = $('[data-falta="' + t.name + '"]');
      if (falta) falta.hidden = true;
    } else if (/^meio-\d+$/.test(t.name)) {
      var g = +t.name.split('-')[1];
      escolha.meio[g] = t.value === 'meio';
      $('[data-metade="' + g + '"]').hidden = !escolha.meio[g];
      if (!escolha.meio[g]) escolha.fatias[g].length = 1;
      else {
        var marcada = $('input[name="s' + g + '-1"]:checked');
        if (marcada) escolha.fatias[g][1] = marcada.value;
      }
    } else if (t.name === 'tamanho') {
      escolha.tamanho = t.value;
      var soGrande = $('[data-so-grande]');
      soGrande.hidden = t.value === 'broto';
      if (t.value === 'broto') {
        /* Broto não tem meio a meio nem borda: volta a tela pro inteira e
           tira a borda da escolha. */
        escolha.meio[0] = false; escolha.fatias[0].length = 1; escolha.borda = null;
        $$('input[value="inteira"]', soGrande).forEach(function (x) { x.checked = true; });
        var metade = $('[data-metade="0"]', soGrande);
        if (metade) metade.hidden = true;
      } else {
        /* De volta pra grande, a borda que está marcada volta a valer. */
        var bordaMarcada = $('input[name="borda"]:checked', soGrande);
        escolha.borda = bordaMarcada ? bordaMarcada.value : null;
      }
    } else if (t.name === 'bebida') {
      escolha.bebida = t.value;
    } else if (t.name === 'borda') {
      escolha.borda = t.value;
    }
    atualizarAnotar();
  });

  $('#folhaCorpo').addEventListener('input', function (e) {
    var t = e.target;
    if (t.hasAttribute('data-obs') && escolha) escolha.obs = t.value;
    if (t.hasAttribute('data-busca-op')) {
      var q = semAcento(t.value.trim());
      $$('.escolha', t.closest('.op')).forEach(function (el) {
        el.hidden = !!q && el.getAttribute('data-busca').indexOf(q) < 0;
      });
    }
  });

  $('#menos').addEventListener('click', function () { if (escolha.qtd > 1) { escolha.qtd--; $('#qtd').textContent = escolha.qtd; atualizarAnotar(); } });
  $('#mais').addEventListener('click', function () { if (escolha.qtd < 20) { escolha.qtd++; $('#qtd').textContent = escolha.qtd; atualizarAnotar(); } });

  /* Antes de anotar, confere se cada grande tem sabor (e a outra metade, no
     meio a meio). Avisa no lugar que falta em vez de escolher pela pessoa. */
  $('#anotar').addEventListener('click', function () {
    var falta = null;
    escolha.fatias.forEach(function (f, g) {
      if (falta) return;
      if (!f[0]) falta = 's' + g + '-0';
      else if (escolha.meio[g] && !f[1]) falta = 's' + g + '-1';
    });
    if (falta) {
      var aviso0 = $('[data-falta="' + falta + '"]');
      if (aviso0) {
        aviso0.hidden = false;
        aviso0.closest('.op').scrollIntoView({ block: 'start', behavior: reduz ? 'auto' : 'smooth' });
      }
      return;
    }
    var nome = descricao(escolha).nome;
    var indice = colocar(escolha);
    fecharPainel();
    anunciar(nome, indice);
  });

  /* ---------------------------------------------------------- comanda */

  var CHAVE = 'labella-comanda-v1';

  /* O que voltou do navegador só fica se ainda existir no cardápio de hoje. */
  function linhaValida(l) {
    if (!l || !(l.qtd > 0)) return false;
    if (l.borda && !BORDA[l.borda]) return false;
    if (l.tipo === 'bebida') return !!BEBIDA[l.id];
    if (!Array.isArray(l.fatias) || !l.fatias.length) return false;
    if (l.tipo === 'combo') {
      var c = COMBO[l.id];
      if (!comboValido(c) || l.fatias.length !== c.grandes || !BEBIDA[l.bebida] || c.bebidas.indexOf(l.bebida) < 0) return false;
      return l.fatias.every(function (f) {
        return f.length && f.length <= 2 && (f.length === 1 || L.meioAMeio.combo) &&
          f.every(function (id) { return c.sabores.indexOf(id) >= 0 && SABOR[id]; });
      });
    }
    if (l.tipo === 'pizza') {
      var f = l.fatias[0];
      if (l.tamanho === 'broto') {
        return l.fatias.length === 1 && f.length === 1 && !l.borda && avulso(SABOR[f[0]]) && precoBroto(SABOR[f[0]]) > 0;
      }
      if (l.tamanho && l.tamanho !== 'grande') return false;
      return l.fatias.length === 1 && f.length >= 1 && f.length <= 2 && (f.length === 1 || L.meioAMeio.avulsa) &&
        f.every(function (id) { return avulso(SABOR[id]); });
    }
    return false;
  }

  var comanda = (guarda.ler(CHAVE) || []).filter(linhaValida);

  /* Meio a meio na ordem que for é a mesma pizza. */
  function chaveDaLinha(l) {
    return [l.tipo, l.id, l.tipo === 'pizza' ? (l.tamanho || 'grande') : '', (l.fatias || []).map(function (f) { return f.slice().sort().join('+'); }).join('/'),
      l.bebida || '', l.borda || '', (l.obs || '').trim()].join('|');
  }

  function colocar(e) {
    var nova = {
      tipo: e.tipo, id: e.id, tamanho: e.tipo === 'pizza' ? (e.tamanho || 'grande') : null,
      fatias: e.fatias ? e.fatias.map(function (f) { return f.slice(); }) : null,
      bebida: e.bebida || null, borda: e.borda || null,
      obs: (e.obs || '').trim(), qtd: e.qtd || 1
    };
    var k = chaveDaLinha(nova), achou = -1;
    comanda.forEach(function (l, i) { if (chaveDaLinha(l) === k) achou = i; });
    if (achou >= 0) comanda[achou].qtd = Math.min(20, comanda[achou].qtd + nova.qtd);
    else { comanda.push(nova); achou = comanda.length - 1; }
    salvar(achou);
    return achou;
  }

  function salvar(destaque) {
    guarda.gravar(CHAVE, comanda);
    pintarComanda(destaque);
  }

  function total() { return comanda.reduce(function (t, l) { return t + precoUnidade(l) * l.qtd; }, 0); }
  function temPizza() { return comanda.some(function (l) { return l.tipo !== 'bebida'; }); }

  /* O total sobe contando até o valor novo: a soma acontecendo na frente da
     pessoa. Por tempo e por quadro: com a aba escondida o quadro não vem,
     e o valor certo entra do mesmo jeito. */
  var totalMostrado = null, rafTotal = 0, fimTotal = 0;
  function mostrarTotal(alvo) {
    var el = $('#total');
    cancelAnimationFrame(rafTotal);
    clearTimeout(fimTotal);
    if (reduz || totalMostrado === null || totalMostrado === alvo) {
      el.textContent = reais(alvo); totalMostrado = alvo; return;
    }
    var de = totalMostrado, t0 = 0, dur = 420;
    function passo(t) {
      if (!t0) t0 = t;
      var k = Math.min(1, (t - t0) / dur), ease = 1 - Math.pow(1 - k, 3);
      el.textContent = reais(k < 1 ? Math.round((de + (alvo - de) * ease) / 100) * 100 : alvo);
      if (k < 1) rafTotal = requestAnimationFrame(passo);
    }
    rafTotal = requestAnimationFrame(passo);
    fimTotal = setTimeout(function () { cancelAnimationFrame(rafTotal); el.textContent = reais(alvo); }, dur + 120);
    totalMostrado = alvo;
  }

  function pintarComanda(destaque) {
    var t = total();

    $('#linhas').innerHTML = comanda.map(function (l, i) {
      var d = descricao(l);
      return '<li class="linha' + (i === destaque ? ' nova' : '') + '">' +
        '<span class="linha-qtd">' + l.qtd + '×</span>' +
        '<span class="linha-nome">' + esc(d.nome) + '</span>' +
        '<span class="linha-valor">' + reais(precoUnidade(l) * l.qtd).replace('R$ ', '') + '</span>' +
        d.det.map(function (x) { return '<span class="linha-det">' + esc(x) + '</span>'; }).join('') +
        (l.obs ? '<span class="linha-obs">“' + esc(l.obs) + '”</span>' : '') +
        '<span class="linha-ctrl">' +
          '<button type="button" data-menos="' + i + '" aria-label="Um a menos de ' + esc(d.nome) + '">−</button>' +
          '<button type="button" data-mais="' + i + '" aria-label="Um a mais de ' + esc(d.nome) + '">+</button>' +
          '<button type="button" class="tirar" data-tirar="' + i + '" aria-label="Tirar ' + esc(d.nome) + ' da comanda">Tirar</button>' +
        '</span>' +
      '</li>';
    }).join('');

    var vazia = comanda.length === 0;
    $('#vazia').hidden = !vazia;
    $('#comandaResto').hidden = vazia;
    $('#quartaNota').hidden = !(hojeQuarta && temPizza());
    mostrarTotal(t);

    $$('[data-total-curto]').forEach(function (el) { el.textContent = reaisCurto(t); });
    pintarBarra();

    if (typeof destaque === 'number' && !vazia) {
      var nova = $$('#linhas .linha')[destaque];
      if (nova && telaLarga.matches) nova.scrollIntoView({ block: 'nearest', behavior: reduz ? 'auto' : 'smooth' });
    }
  }

  /* A barra do celular é a comanda dobrada: quantos itens e quanto deu.
     Logo depois de anotar ela mostra o que entrou, e volta sozinha. */
  var barraOcupada = false, barraTimer = 0;
  function pintarBarra() {
    var n = comanda.reduce(function (s, l) { return s + l.qtd; }, 0);
    $('#barra').classList.toggle('cheia', n > 0);
    if (!barraOcupada) $('#barraInfo').textContent = n ? n + (n === 1 ? ' item' : ' itens') : 'em branco';
    $('#barraTotal').textContent = n ? reaisCurto(total()) : '';
  }

  /* Depois de anotar: no computador a linha se escreve na comanda ao lado;
     no celular a barra diz o que entrou e dá um pulo. */
  function anunciar(nome) {
    /* Quem usa leitor de tela não vê a linha se escrevendo: ouve. */
    $('#anuncio').textContent = nome + ' anotado na comanda. Total: ' + reais(total()) + '.';
    barraOcupada = true;
    $('#barraInfo').textContent = 'Anotado: ' + nome;
    var btn = $('.barra-btn');
    btn.classList.remove('pulo'); void btn.offsetWidth; btn.classList.add('pulo');
    clearTimeout(barraTimer);
    barraTimer = setTimeout(function () { barraOcupada = false; pintarBarra(); }, 2400);
  }

  $('#linhas').addEventListener('click', function (e) {
    var b = e.target.closest('button');
    if (!b) return;
    var i;
    if (b.hasAttribute('data-mais')) { i = +b.getAttribute('data-mais'); comanda[i].qtd = Math.min(20, comanda[i].qtd + 1); }
    else if (b.hasAttribute('data-menos')) { i = +b.getAttribute('data-menos'); comanda[i].qtd--; if (comanda[i].qtd < 1) comanda.splice(i, 1); }
    else if (b.hasAttribute('data-tirar')) { i = +b.getAttribute('data-tirar'); comanda.splice(i, 1); }
    else return;
    salvar();
    /* O botão que foi apertado sumiu no redesenho: o foco volta pra mesma
       linha, ou pro título se a comanda ficou vazia. */
    var alvo = $$('#linhas [data-mais]')[Math.min(i, comanda.length - 1)];
    if (alvo) alvo.focus({ preventScroll: true }); else $('#h-comanda').focus({ preventScroll: true });
  });

  $('#limpar').addEventListener('click', function () {
    if (!comanda.length) return;
    if (!window.confirm('Limpar a comanda inteira?')) return;
    comanda = [];
    salvar();
    $('#h-comanda').focus({ preventScroll: true });
  });

  /* ---------------------------------------------------------- ficha e mensagem */

  var CHAVE_CLIENTE = 'labella-cliente-v1';

  function montarFicha() {
    $('#opcoesReceber').innerHTML = L.receber.map(function (r, i) { return chip('receber', r, r, i === 0); }).join('');
    $('#opcoesPagamento').innerHTML = L.pagamento.map(function (p, i) { return chip('pagamento', p, p, i === 0); }).join('');
    var f = $('#ficha');
    var salvo = guarda.ler(CHAVE_CLIENTE) || {};
    ['nome', 'endereco', 'bairro', 'referencia'].forEach(function (k) { if (salvo[k]) f[k].value = salvo[k]; });
    /* Guarda o que a pessoa digitou pra não pedir de novo no próximo pedido.
       Fica só no navegador dela. */
    f.addEventListener('input', function (e) {
      guarda.gravar(CHAVE_CLIENTE, { nome: f.nome.value, endereco: f.endereco.value, bairro: f.bairro.value, referencia: f.referencia.value });
      e.target.classList.remove('faltou');
    });
    f.addEventListener('change', function (e) {
      if (e.target.name === 'receber') $('#camposEntrega').hidden = e.target.value !== 'Entrega';
      if (e.target.name === 'pagamento') $('#campoTroco').hidden = e.target.value !== 'Dinheiro';
    });
    $('#campoTroco').hidden = f.pagamento.value !== 'Dinheiro';
  }

  function mensagem() {
    var f = $('#ficha');
    var entrega = f.receber.value === 'Entrega';
    var m = ['Olá, Labella! Quero fazer um pedido pelo site:', ''];
    comanda.forEach(function (l) {
      var d = descricao(l);
      m.push(l.qtd + 'x ' + d.msg + ' — ' + reais(precoUnidade(l) * l.qtd));
      d.msgDet.forEach(function (x) { m.push('   ' + x); });
      if (l.obs) m.push('   Obs.: ' + l.obs);
    });
    m.push('');
    m.push('*Total dos itens: ' + reais(total()) + '*');
    if (entrega) m.push('(a taxa de entrega vocês me passam aqui)');
    if (hojeQuarta && temPizza()) m.push('Hoje é Quarta em Dobro: vem o broto de chocolate de brinde?');
    m.push('');
    m.push('Nome: ' + f.nome.value.trim());
    m.push('Receber: ' + f.receber.value);
    if (entrega) {
      m.push('Endereço: ' + f.endereco.value.trim() + ' — ' + f.bairro.value.trim());
      if (f.referencia.value.trim()) m.push('Referência: ' + f.referencia.value.trim());
    }
    var pag = f.pagamento.value;
    var troco = f.troco.value.trim().replace(/^r\$\s*/i, '');
    m.push('Pagamento: ' + pag + (pag === 'Dinheiro' && troco ? ' (troco pra R$ ' + troco + ')' : ''));
    if (f.obs.value.trim()) m.push('Obs.: ' + f.obs.value.trim());
    return m.join('\n');
  }

  $('#mandar').addEventListener('click', function () {
    if (!comanda.length) return;
    var f = $('#ficha');
    var entrega = f.receber.value === 'Entrega';
    var faltou = null, motivo = '';
    if (!f.nome.value.trim()) { faltou = f.nome; motivo = 'Falta o seu nome.'; }
    else if (entrega && !f.endereco.value.trim()) { faltou = f.endereco; motivo = 'Falta a rua e o número.'; }
    else if (entrega && !f.bairro.value.trim()) { faltou = f.bairro; motivo = 'Falta o bairro.'; }
    if (faltou) {
      faltou.classList.add('faltou');
      faltou.focus();
      aviso(motivo);
      return;
    }
    var url = linkZap(mensagem());
    /* Sem "noopener" na chamada: com ele o window.open devolve sempre null,
       e o teste de bloqueio abaixo trocaria a própria aba pelo WhatsApp. O
       opener é cortado à mão. */
    var janela = window.open(url, '_blank');
    if (janela) { try { janela.opener = null; } catch (e) { /* segue */ } }
    else location.href = url;
    aviso('Comanda pronta no WhatsApp. É só enviar lá.');
  });

  /* ---------------------------------------------------------- painéis */

  var painel = null;   // '#folha' ou '#comanda' (no celular)

  /* O foco só entra depois que o painel ficou visível: elemento com
     visibility hidden não recebe foco, e com o quadro atrasado o foco caía
     fora. Por quadro e por tempo, o que vier primeiro. */
  function abrirPainel(sel, depois) {
    var p = $(sel), v = $('#veu');
    var feito = false;
    painel = sel;
    p.hidden = false; v.hidden = false;
    document.body.style.overflow = 'hidden';
    function mostra() {
      if (feito || painel !== sel) return;
      feito = true;
      p.classList.add(sel === '#comanda' ? 'aberta' : 'on');
      v.classList.add('on');
      if (depois) depois();
    }
    requestAnimationFrame(function () { requestAnimationFrame(mostra); });
    setTimeout(mostra, 120);
  }

  function fecharPainel() {
    if (!painel) return;
    var sel = painel, p = $(sel), v = $('#veu');
    painel = null;
    p.classList.remove('on', 'aberta');
    v.classList.remove('on');
    document.body.style.overflow = '';
    setTimeout(function () {
      if (painel) return;
      v.hidden = true;
      if (sel === '#folha') p.hidden = true;
      else { p.removeAttribute('role'); p.removeAttribute('aria-modal'); }
    }, 420);
    if (quemAbriu && document.contains(quemAbriu)) quemAbriu.focus({ preventScroll: true });
    quemAbriu = null;
  }

  /* No celular a comanda sobe como folha; no computador ela já está na
     tela, então o botão só leva até ela. */
  function abrirComanda(botao) {
    if (telaLarga.matches) {
      $('#comanda').scrollIntoView({ behavior: reduz ? 'auto' : 'smooth', block: 'start' });
      $('#h-comanda').focus({ preventScroll: true });
      return;
    }
    quemAbriu = botao || null;
    var c = $('#comanda');
    c.setAttribute('role', 'dialog');
    c.setAttribute('aria-modal', 'true');
    c.scrollTop = 0;
    abrirPainel('#comanda', function () { $('.comanda-fechar').focus(); });
  }

  /* Girar o celular ou alargar a janela com a folha da comanda aberta: a
     comanda vira coluna e o véu precisa sair junto. */
  function mudouLargura() { if (telaLarga.matches && painel === '#comanda') fecharPainel(); }
  if (telaLarga.addEventListener) telaLarga.addEventListener('change', mudouLargura);
  else if (telaLarga.addListener) telaLarga.addListener(mudouLargura);

  document.addEventListener('click', function (e) {
    var t = e.target;
    var combo = t.closest('[data-combo]');
    if (combo) { e.preventDefault(); abrirCombo(combo.getAttribute('data-combo'), combo); return; }
    var pizza = t.closest('[data-pizza]');
    if (pizza) { abrirPizza(pizza.getAttribute('data-pizza'), pizza); return; }
    /* A linha inteira do sabor é alvo, não só o "+": no celular o dedo
       acerta o nome antes do botão. O botão continua sendo o controle pro
       teclado e pro leitor de tela. */
    var linhaSabor = t.closest('.sabor');
    if (linhaSabor && !t.closest('button, a')) {
      var botao = $('.anotar', linhaSabor);
      if (botao) botao.click();
      return;
    }
    var bebida = t.closest('[data-bebida]');
    if (bebida) {
      var id = bebida.getAttribute('data-bebida');
      var i = colocar({ tipo: 'bebida', id: id, qtd: 1 });
      anunciar(BEBIDA[id].nome, i);
      return;
    }
    if (t.closest('[data-abrir-comanda]')) { abrirComanda(t.closest('[data-abrir-comanda]')); return; }
    if (t.closest('[data-ir-comanda]')) { e.preventDefault(); abrirComanda(); return; }
    if (t.closest('[data-fechar-folha]') || t.closest('[data-fechar-comanda]') || t === $('#veu')) { fecharPainel(); return; }
  });

  /* Esc fecha; Tab fica preso dentro do painel aberto. */
  document.addEventListener('keydown', function (e) {
    if (!painel) return;
    if (e.key === 'Escape') { fecharPainel(); return; }
    if (e.key !== 'Tab') return;
    var focaveis = $$('button, [href], input, textarea, select', $(painel)).filter(function (el) {
      return !el.disabled && el.offsetParent !== null;
    });
    if (!focaveis.length) return;
    var primeiro = focaveis[0], ultimo = focaveis[focaveis.length - 1];
    if (e.shiftKey && document.activeElement === primeiro) { e.preventDefault(); ultimo.focus(); }
    else if (!e.shiftKey && document.activeElement === ultimo) { e.preventDefault(); primeiro.focus(); }
  });

  /* ---------------------------------------------------------- partida */

  $$('[data-zap]').forEach(function (a) { a.href = linkZap('Oi, Labella! Vim pelo site.'); });
  $('#busca').addEventListener('input', pintarCardapio);

  montarVia();
  montarContas();
  pintarCardapio();
  montarFicha();
  pintarComanda();
  pintarSituacao();
  setInterval(pintarSituacao, 60000);
})();
