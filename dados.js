/* Tudo que o site sabe sobre a Labella.
 *
 * Preço é CENTAVO INTEIRO, sempre: 5000 é R$ 50,00. Soma de número quebrado
 * deixa resíduo no total, e o valor da comanda deixa de bater com o que a
 * Labella cobra.
 *
 * De onde veio cada coisa (detalhe em dados/levantamento.md):
 * - sabores, ingredientes, preços e combos: o cliente mandou pro Gabriel em
 *   06/10/2026. É o cardápio que vale.
 * - horário, WhatsApp, pagamento, retirada e bebidas: respostas do cliente
 *   via Gabriel, 06/10/2026.
 * - telefones e endereço: posts do Instagram deles (30/07 e 16/09).
 * - borda e preço do broto: MenuDino, provisório (ver em cada um).
 * Onde falta informação, o campo não existe e o site se vira sem ele.
 */
window.LABELLA = {
  /* Confirmado 06/10: o pedido vai pro celular. O fixo continua aparecendo
     pra quem prefere ligar. */
  whatsapp: '5517997337599',
  whatsappVisivel: '(17) 99733-7599',
  telefone: '+551735253232',
  telefoneVisivel: '(17) 3525-3232',
  instagram: 'labelladiskpizza',
  endereco: { rua: 'R. Parati, 1178', bairro: 'Nova Catanduva', cidade: 'Catanduva', uf: 'SP' },

  /* Cliente, 06/10: "atendemos de terças-feiras aos domingos, das 18:00 às
     23:00". Substitui o post de 30/07 (19h às 23h, pedido desde as 18h).
     Dia da semana do JavaScript: 0 é domingo, 1 é segunda. Minutos desde a
     meia-noite, no horário de Brasília. */
  horario: { dias: [0, 2, 3, 4, 5, 6], abre: 18 * 60, fecha: 23 * 60 },

  /* Broto avulso: PROVISÓRIO. O cliente disse que acha que vende, sem preço,
     e o Gabriel pediu um valor pra prévia (06/10, "coloca um preço x"). É o
     do MenuDino por faixa: R$ 25 quando a grande era R$ 48, R$ 35 quando era
     R$ 70. O de filé mignon não tem broto. Confirmar antes de publicar. */
  broto: { 5000: 2500, 7000: 3500 },

  /* O preço de cada sabor é o da grande, como o cliente mandou. */
  sabores: [
    /* ---------- salgadas de R$ 50 ---------- */
    { id: '2-queijos', nome: '2 queijos', tipo: 'salgada', preco: 5000, ing: 'Molho, catupiry, mussarela e tomate.' },
    { id: 'mussarela', nome: 'Mussarela', tipo: 'salgada', preco: 5000, ing: 'Molho, mussarela e tomate.' },
    { id: 'bacon', nome: 'Bacon', tipo: 'salgada', preco: 5000, ing: 'Molho, mussarela, bacon e tomate.' },
    { id: 'calabresa', nome: 'Calabresa', tipo: 'salgada', preco: 5000, ing: 'Molho, mussarela, calabresa, cebola e tomate.' },
    { id: 'portuguesa-simples', nome: 'Portuguesa simples', tipo: 'salgada', preco: 5000, ing: 'Molho, presunto, ovo, ervilha, cebola e mussarela.' },
    { id: 'berinjela', nome: 'Berinjela', tipo: 'salgada', preco: 5000, ing: 'Molho, berinjela, cebola, mussarela e tomate.' },
    { id: 'baiana', nome: 'Baiana', tipo: 'salgada', preco: 5000, ing: 'Molho, calabresa picada, cebola, molho de pimenta e mussarela.' },
    { id: 'lombo-catupiry', nome: 'Lombo com catupiry', tipo: 'salgada', preco: 5000, ing: 'Molho, lombo, cebola, catupiry e tomate.' },
    { id: 'lombo-mussarela', nome: 'Lombo com mussarela', tipo: 'salgada', preco: 5000, ing: 'Molho, lombo, cebola, mussarela e tomate.' },
    { id: 'toscana', nome: 'Toscana', tipo: 'salgada', preco: 5000, ing: 'Molho, calabresa picada, cebola e mussarela.' },
    { id: 'rucula', nome: 'Rúcula', tipo: 'salgada', preco: 5000, ing: 'Molho, mussarela, rúcula, tomate seco e alho frito.' },
    { id: 'aliche', nome: 'Aliche', tipo: 'salgada', preco: 5000, ing: 'Molho, mussarela, tomate e aliche.' },
    { id: 'milho-catupiry', nome: 'Milho com catupiry', tipo: 'salgada', preco: 5000, ing: 'Molho, milho, catupiry e tomate.' },
    { id: 'marguerita', nome: 'Marguerita', tipo: 'salgada', preco: 5000, ing: 'Molho, mussarela, tomate e manjericão.' },
    { id: 'do-mestre', nome: 'Do mestre', tipo: 'salgada', preco: 5000, ing: 'Molho, catupiry, presunto, mussarela e tomate.' },
    { id: 'brocolis-bacon', nome: 'Brócolis com bacon', tipo: 'salgada', preco: 5000, ing: 'Molho, brócolis, catupiry e bacon.' },
    { id: '2-carnes', nome: '2 carnes', tipo: 'salgada', preco: 5000, ing: 'Molho, presunto, calabresa picada, cebola, catupiry e tomate.' },
    { id: 'mussarela-alho', nome: 'Mussarela e alho frito', tipo: 'salgada', preco: 5000, ing: 'Molho, mussarela e alho frito.' },
    { id: 'nostra', nome: 'Nostra', tipo: 'salgada', preco: 5000, ing: 'Molho, lombo, catupiry, mussarela e bacon.' },
    { id: 'doritos', nome: 'Doritos', tipo: 'salgada', preco: 5000, ing: 'Molho, cheddar, mussarela e Doritos.' },

    /* ---------- salgadas de R$ 70 ---------- */
    { id: 'bacon-especial', nome: 'Bacon especial', tipo: 'salgada', preco: 7000, ing: 'Molho, mussarela, bacon, catupiry e tomate.' },
    { id: '4-carnes', nome: '4 carnes', tipo: 'salgada', preco: 7000, ing: 'Molho, calabresa, presunto, lombo, cebola, catupiry, bacon e tomate.' },
    { id: '4-queijos', nome: '4 queijos', tipo: 'salgada', preco: 7000, ing: 'Molho, catupiry, mussarela, provolone e parmesão.' },
    { id: 'atum', nome: 'Atum', tipo: 'salgada', preco: 7000, ing: 'Molho, atum, cebola e mussarela.' },
    { id: 'calabresa-bacon', nome: 'Calabresa com bacon', tipo: 'salgada', preco: 7000, ing: 'Molho, mussarela, calabresa, cebola e bacon.' },
    { id: 'champignon', nome: 'Champignon', tipo: 'salgada', preco: 7000, ing: 'Molho, champignon, mussarela e bacon.' },
    { id: 'berinjela-bacon', nome: 'Berinjela com bacon', tipo: 'salgada', preco: 7000, ing: 'Molho, berinjela, cebola, mussarela e bacon.' },
    { id: 'frango-catupiry', nome: 'Frango com catupiry', tipo: 'salgada', preco: 7000, ing: 'Molho, frango desfiado, cebola, catupiry e tomate.' },
    { id: 'portuguesa', nome: 'Portuguesa', tipo: 'salgada', preco: 7000, ing: 'Molho, presunto, ovo, ervilha, palmito, cebola e mussarela.' },
    { id: 'palmito', nome: 'Palmito', tipo: 'salgada', preco: 7000, ing: 'Molho, palmito e mussarela.' },
    { id: 'do-mestre-especial', nome: 'Do mestre especial', tipo: 'salgada', preco: 7000, ing: 'Molho, catupiry, presunto, mussarela, milho e provolone.' },
    { id: 'frango-cheddar', nome: 'Frango com cheddar', tipo: 'salgada', preco: 7000, ing: 'Molho, frango desfiado, cebola, cheddar e tomate.' },
    { id: 'banana-bacon', nome: 'Banana com bacon', tipo: 'salgada', preco: 7000, ing: 'Molho, banana, catupiry e bacon.' },
    { id: 'frango-palmito', nome: 'Frango com palmito', tipo: 'salgada', preco: 7000, ing: 'Molho, frango desfiado, palmito e catupiry.' },
    { id: '5-queijos', nome: '5 queijos', tipo: 'salgada', preco: 7000, ing: 'Molho, catupiry, gorgonzola, mussarela, provolone e parmesão ralado.' },
    { id: 'francesa', nome: 'Francesa', tipo: 'salgada', preco: 7000, ing: 'Molho, calabresa, palmito, catupiry e mussarela.' },
    { id: 'strogonoff-frango', nome: 'Strogonoff de frango', tipo: 'salgada', preco: 7000, ing: 'Molho, mussarela, frango desfiado, ketchup, mostarda, creme de leite e batata palha.' },
    { id: 'california', nome: 'Califórnia', tipo: 'salgada', preco: 7000, ing: 'Molho, lombo, pêssego, figo, abacaxi e catupiry.' },
    { id: 'palmito-especial', nome: 'Palmito especial', tipo: 'salgada', preco: 7000, ing: 'Molho, palmito, catupiry e bacon.' },

    /* ---------- os de filé mignon ---------- */
    { id: 'file-mignon', nome: 'Filé mignon', tipo: 'salgada', preco: 8000, ing: 'Molho, filé mignon, catupiry, tomate e alho frito.' },
    { id: 'strogonoff-mignon', nome: 'Strogonoff de mignon', tipo: 'salgada', preco: 8500, ing: 'Molho, mussarela, filé mignon, ketchup, mostarda, creme de leite e batata palha.' },

    /* ---------- doces ----------
       A Banana veio nas duas listas, com o mesmo recheio e o mesmo preço.
       É doce (banana e açúcar mascavo) e aparece uma vez só. */
    { id: 'chocolate', nome: 'Chocolate', tipo: 'doce', preco: 5000 },
    { id: 'chocolate-branco', nome: 'Chocolate branco', tipo: 'doce', preco: 5000 },
    { id: 'prestigio', nome: 'Prestígio', tipo: 'doce', preco: 5000, ing: 'Chocolate e coco ralado.' },
    { id: 'pacoca', nome: 'Creme de paçoca', tipo: 'doce', preco: 5000 },
    { id: 'ninho', nome: 'Ninho', tipo: 'doce', preco: 5000, ing: 'Chocolate branco e leite em pó.' },
    { id: 'ninho-trufado', nome: 'Ninho trufado', tipo: 'doce', preco: 5000, ing: 'Chocolate e leite em pó.' },
    { id: 'romeu-julieta', nome: 'Romeu e Julieta', tipo: 'doce', preco: 5000, ing: 'Goiabada e mussarela.' },
    { id: 'banana', nome: 'Banana', tipo: 'doce', preco: 5000, ing: 'Banana e açúcar mascavo.' },
    { id: 'banana-chocolate', nome: 'Banana com chocolate', tipo: 'doce', preco: 7000 },
    { id: 'banana-nevada', nome: 'Banana nevada', tipo: 'doce', preco: 7000, ing: 'Banana e chocolate branco.' },

    /* ---------- só dentro dos combos ----------
       Estão na lista de combos do cliente, mas não na de sabores: sem preço
       avulso, então só aparecem na escolha do combo. O cliente não soube os
       ingredientes (06/10); os dois primeiros vêm do MenuDino, no formato da
       lista nova. A Calabresa com catupiry não está em lugar nenhum e fica
       sem descrição. */
    { id: 'presunto-mussarela', nome: 'Presunto e mussarela', tipo: 'salgada', soCombo: true, ing: 'Molho, mussarela, presunto e tomate.' },
    { id: 'calabresa-catupiry', nome: 'Calabresa com catupiry', tipo: 'salgada', soCombo: true },
    { id: 'tanto-faz', nome: 'Tanto faz', tipo: 'salgada', soCombo: true, ing: 'Molho, mussarela, calabresa, presunto, palmito, catupiry e bacon.' }
  ],

  /* Como o cliente mandou. "bebidas" é o que pode escolher pro refri de 2 L. */
  combos: [
    { id: 'combo-1', nome: 'Combo 1', preco: 5500, grandes: 1, bebidas: ['devito'], brinde: null,
      sabores: ['mussarela', 'calabresa', 'presunto-mussarela', 'berinjela', 'rucula', 'aliche', 'mussarela-alho',
        'milho-catupiry', 'lombo-mussarela', 'banana', 'romeu-julieta'] },
    { id: 'combo-2', nome: 'Combo 2', preco: 6500, grandes: 1, bebidas: ['devito'], brinde: 'broto de chocolate',
      sabores: ['2-queijos', 'portuguesa-simples', 'baiana', 'lombo-catupiry', 'toscana', 'marguerita', 'do-mestre',
        'brocolis-bacon', 'bacon', '2-carnes', 'nostra', 'banana-bacon', 'calabresa-catupiry', 'doritos'] },
    { id: 'combo-3', nome: 'Combo 3', preco: 8500, grandes: 1, bebidas: ['devito', 'roller'], brinde: 'broto de chocolate',
      sabores: ['bacon-especial', '4-carnes', '4-queijos', 'atum', 'calabresa-bacon', 'champignon', 'berinjela-bacon',
        'frango-catupiry', 'portuguesa', 'palmito', 'do-mestre-especial', 'frango-cheddar', 'frango-palmito', '5-queijos',
        'francesa', 'strogonoff-frango', 'california', 'palmito-especial', 'tanto-faz', 'banana-chocolate'] },
    /* Pendência 1: o combo 4 veio sem preço. Com preco null ele não aparece
       no site; é só pôr o valor aqui. */
    { id: 'combo-4', nome: 'Combo 4', preco: null, grandes: 2, bebidas: ['devito', 'roller'], brinde: 'pizza grande de chocolate',
      sabores: ['2-queijos', '2-carnes', 'portuguesa', 'baiana', 'lombo-catupiry', 'nostra', 'do-mestre', 'brocolis-bacon',
        '4-carnes', '4-queijos', 'tanto-faz', 'calabresa-catupiry', 'frango-catupiry', 'palmito-especial',
        'strogonoff-frango', 'california', 'bacon-especial'] }
  ],

  /* Bebidas e preços do MenuDino, confirmados pelo cliente em 06/10. Devito
     e Roller também servem de opção dentro dos combos. */
  bebidas: [
    { id: 'devito', nome: 'Guaraná Devito 2 L', curto: 'Devito 2 L', preco: 750 },
    { id: 'roller', nome: 'Roller 2 L', curto: 'Roller 2 L', preco: 900 },
    { id: 'coca-2l', nome: 'Coca-Cola 2 L', preco: 1400 },
    { id: 'coca-zero-2l', nome: 'Coca-Cola Zero 2 L', preco: 1400 },
    { id: 'coca-retornavel', nome: 'Coca-Cola retornável 2 L', preco: 900 },
    { id: 'fanta-2l', nome: 'Fanta Laranja 2 L', preco: 1200 },
    { id: 'sprite-2l', nome: 'Sprite 2 L', preco: 1200 },
    { id: 'sprite-lata', nome: 'Sprite lata', preco: 450 },
    { id: 'suco-laranja', nome: 'Suco de laranja', preco: 1500 },
    { id: 'brahma-lata', nome: 'Brahma lata', preco: 450 },
    { id: 'original-lata', nome: 'Original lata', preco: 450 },
    { id: 'budweiser', nome: 'Budweiser', preco: 400 },
    { id: 'imperio-latao', nome: 'Império latão', preco: 450 },
    { id: 'crystal-latao', nome: 'Crystal latão', preco: 370 }
  ],

  /* Borda: o cliente pediu em 08/10 (via Gabriel). A de catupiry não é
     cobrada e é a que já vem marcada, no lugar do "sem borda". A de cheddar
     é o adicional, R$ 7. Só na grande salgada e nos combos. */
  bordas: [
    { id: 'catupiry', nome: 'Borda de catupiry', preco: 0 },
    { id: 'cheddar', nome: 'Borda de cheddar', preco: 700 }
  ],

  /* Meio a meio só na grande, cobrando pelo sabor mais caro (regra do
     MenuDino). Nos combos: "provável que sim" (cliente, 06/10). */
  meioAMeio: { avulsa: true, combo: true },

  /* Confirmados pelo cliente em 06/10. */
  receber: ['Entrega', 'Retirar no balcão'],
  pagamento: ['Pix', 'Cartão', 'Dinheiro'],

  /* Quarta em Dobro (post de 16/09): comprou pizza, o broto de chocolate é
     brinde. Vale toda quarta (cliente, 06/10). O site avisa e pergunta na
     mensagem; quem confirma é a Labella. */
  quartaEmDobro: true
};
