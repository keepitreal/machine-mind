/**
  * TODO - Tasks
  * - Crypto-crypto-crypto triangles
  * - Refactor so its less dependent on USDT
  * - Typescriptify everything
  * - Tests
  * - Kucoin appears to be running out of AWS northeast region
  * - Incorporate minimum order size (this may dry up opportunities but it won't work without it :(  )
  *
  * TODO - FUTURE EXCHANGES
  * - Cryptopia
  * - Kraken (margin trading plus USD pairs)
  * - Bitstamp (USD pairs)
  * - Yobit?
  * - OKEX
  *
  * */

import * as uniq from 'lodash/uniq';
import * as cloneDeep from 'lodash/cloneDeep';

import {
  Order, OrderBook, OrderBooks,
  Pair, TradingPair, TradingPairs,
  Trade, Triangle, Tranche
} from '../interfaces';

import * as kucoin from '../exchanges/kucoin';

import {
  OPERATION_TO_BOOK,
  OPERATIONS,
} from '../constants';

const MAX_TRADE = 0.5;
const KUCOIN_FEE = 0.000;
const COBINHOOD_FEE = 0;
const TIMEOUT = 4000;

export default async function triangularArbitrageEngine() {
  try {
    // const kucoinTradeAmount = await getMaxTrade(kucoin.fetchBalanceForCoin);
    const kucoinTradeAmount = 100;
    startKucoinEngine(kucoinTradeAmount);
  } catch (err) {
    console.log('Error Caught:', err);
  }
}

async function startKucoinEngine(tradeAmount, tradingPairs?) {
  const {
    fetchOrderBooks,
    fetchTradingPairs,
  } = kucoin;

  if (!tradingPairs) {
    tradingPairs = await fetchTradingPairs();
  }

  if (tradingPairs && tradingPairs.length) {
    const triangles = buildTriangles(tradingPairs, 'kucoin');
    const tradesFromTriangles = getTradesFromTriangles(triangles);

    const books = await getOrdersForTrades(tradesFromTriangles,
      tradeAmount, fetchOrderBooks);

    const tradesToExecute = getTradesToExecute(books, tradesFromTriangles,
      tradeAmount, KUCOIN_FEE);
  }

  // Continue polling
  setTimeout(() => startKucoinEngine(tradeAmount, tradingPairs), TIMEOUT);
}

async function getMaxTrade(fetchBalanceForCoin) {
  const {USDTBalance} = await getUSDTBalance(fetchBalanceForCoin);
  const tradeAmount = USDTBalance * MAX_TRADE;

  return tradeAmount;
}

let totalProfit = 0;
const trades = new Set();

setInterval(() => {
  trades.clear();
}, 60 * 1000);

function getTradesToExecute(books, triangles, tradeAmount, fee) {
  if (!books) {
    return;
  }


  triangles.forEach((triangle, index) => {
    const booksForTrades = matchBooksToTrades(triangle.trades, books);
    const tranches = buildTranches(triangle, booksForTrades);
    const profitableTranches = getProfitableTranches(tranches, fee);
    const {orders, profit} = getOrdersFromTranches(profitableTranches, tradeAmount, fee);

    if (profit > 0.01) {
      console.log('TRIANGLE');
      console.log(triangle);
      // console.log('TRANCHES');
      // console.log(profitableTranches);
      // console.log('ORDERS');
      // console.log(orders);
      console.log('PROFIT');
      console.log(profit);

      const topPair = triangle.trades[0].symbol;
      if (!trades.has(topPair)) {
        totalProfit += profit;
        trades.add(topPair);
      }
    }
  });

  console.log('TOTAL:');
  console.log(totalProfit);
  return null;
}

function buildTriangles(tradingPairs, exchange) {
  const pairsMap = tradingPairs.reduce((map, curr) => {
    if (!map[curr.baseCurrency]) {
      map[curr.baseCurrency] = decorateCoinData(curr);
    }

    if (curr.quoteCurrency === 'USDT') {
      map[curr.baseCurrency].USDT = curr;
    } else {
      map[curr.baseCurrency].pairs[curr.quoteCurrency] = curr;
    }

    return map;
  }, {});

  const tradeablePairs = Object.entries(pairsMap)
    .filter(([symb, pair]) => pairMeetsRequirements(pair))
    .reduce((prev, [symb, coin]) => {
      return Object.assign({}, prev, {[symb]: coin});
    }, {});

  const triangles = Object.entries(tradeablePairs).reduce((prev, [symb, pair]: [any, any]) => {
    const subTriangles = Object.entries(pair.pairs)
      .filter(([symb]) => pairsMap[symb])
      .map(([subSymb, subCoin]) => {
        return {
          exchange,
          c1c2: subCoin,
          c1USDT: pair.USDT,
          c2USDT: pairsMap[subSymb].USDT
        };
      });

    return prev.concat(subTriangles)
  }, []);

  return triangles;
}

async function getUSDTBalance(fetchBalanceForCoin) {
  const {balance: USDTBalance} = await fetchBalanceForCoin('USDT');

  return {USDTBalance};
}

// BUY -> SELL, SELL -> BUY
function getBookTypeForOperation(operation : string): string {
  return OPERATION_TO_BOOK[operation];
}

function getProfitableTranches(tranches : Array<Tranche>, feeRate : number) {
  return tranches.filter((tranche) => {
    const [a, b, c] = tranche;
    const profitMargin = getProfitabilityFromVolume(a[2], c[2], feeRate);

    return profitMargin > 0;
  });
}

function getProfitabilityFromVolume(start, end, feeRate) {
  const numTrades = 3; // 3 points in a triangle
  const feeMultiplier = Math.pow(1 - feeRate, numTrades);

  return ((end * feeMultiplier) - start) / start;
}

function getc1c2Spread(c1c3, c2c3, c1c2) {
  return (c1c2 - (c1c3 / c2c3)) / (c1c3 / c2c3);
}

function getc2c1Spread(c1c3, c2c3, c1c2) {
  return ((c1c3 / c2c3) - c1c2) / c1c2;
}

function matchBooksToTrades(trades : Array<Trade>, books) {
  return trades.reduce((agg, trade) => {
    const {operation, symbol} = trade;
    const bookType = getBookTypeForOperation(operation);
    const book = books[symbol][bookType];
    return Object.assign({}, agg, {[symbol]: book});
  }, {});
}

function buildTranches(triangle : Triangle, books) {
  // TODO: should figure how to avoid cloneDeep
  books = cloneDeep(books);

  const {trades, direction} = triangle;
  const c1c2 = direction === 'c1c2';

  const {symbol: A_Symbol} = trades[0];
  const {symbol: B_Symbol} = trades[1];
  const {symbol: C_Symbol} = trades[2];

  const tranches = [];

  while (books[A_Symbol].length && books[B_Symbol].length && books[C_Symbol].length) {
    const A_Books = books[A_Symbol];
    const B_Books = books[B_Symbol];
    const C_Books = books[C_Symbol];

    const A_Order = A_Books[0];
    const B_Order = B_Books[0];
    const C_Order = C_Books[0];

    const [A_Price, A_Amount] = A_Order;
    const A_Volume = A_Price * A_Amount;

    const [B_Price, B_Amount] = B_Order;
    const B_Volume = B_Price * B_Amount;

    const [C_Price, C_Amount] = C_Order;
    const C_Volume = C_Price * C_Amount;

    const AA = 1, BB = 1, CC = 1;
    const AB = c1c2 ? B_Amount / A_Amount : B_Volume / A_Amount;
    const BA = 1 / AB;
    const BC = c1c2 ? C_Amount / B_Volume : C_Amount / B_Amount;
    const CB = 1 / BC;
    const AC = 1 / (BA * CB);
    const CA = 1 / AC;

    const RATIOS = {AA, AB, AC, BA, BB, BC, CA, CB, CC};

    const paths = {
      A: (BA + CA) / 2,
      B: (AB + CB) / 2,
      C: (BC + AC) / 2
    };

    const orderedPaths = Object.entries(paths)
      .sort(([, amtA], [, amtB]) => amtA - amtB)
      .map(([trade], index, arr) => `${trade}${arr[0][0]}`)
      .sort((a, b) => a > b ? 1 : -1);

    const tranche = [A_Order, B_Order, C_Order].map((order, index) => {
      const {symbol, operation} = trades[index];
      const [price, amount, volume] = order;
      const ratioKey = orderedPaths[index];
      const multiplier = RATIOS[ratioKey];
      const newAmount = amount * multiplier;
      return [price, newAmount, price * newAmount, symbol, operation];
    });

    // Reduce the top orders by the amounts added to the tranche
    const updatedOrders = [A_Order, B_Order, C_Order].map((order, index) => {
      const [price, amount, volume] = order;
      const reduceAmountBy = tranche[index][1];
      const newAmount = amount - reduceAmountBy;
      return [price, newAmount, price * newAmount];
    });

    const [new_A_Order, new_B_Order, new_C_Order] = updatedOrders;

    // Overwrite the top orders with updated orders
    A_Books[0] = new_A_Order;
    B_Books[0] = new_B_Order;
    C_Books[0] = new_C_Order;

    // Remove the 0'd out order
    books[A_Symbol] = removeEmptyOrders(A_Books);
    books[B_Symbol] = removeEmptyOrders(B_Books);
    books[C_Symbol] = removeEmptyOrders(C_Books);

    tranches.push(tranche);
  }

  return tranches;
}

// Pops off an order if we've reduced the amount to 0
function removeEmptyOrders(orders) {
  if (orders[0][1] <= 0) {
    return orders.slice(1);
  }

  return orders;
}

async function getOrdersForTrades(trades, tradeAmount: number, fetchOrderBooks) {
  const symbols = getUniqueSymbols(trades);
  const beforeBooks = Date.now();
  const books = await getOrderBooksForSymbols(symbols, fetchOrderBooks);
  const afterBooks = Date.now();

//   console.log(`Fetched ${symbols.length} Order Books in ${afterBooks - beforeBooks}ms`);

  return books;
}

function getUniqueSymbols(trades) {
  const dupeSymbols = trades.reduce((symbols, trade) => {
    return symbols.concat(trade.trades.map(pair => pair.symbol));
  }, []);

  return uniq(dupeSymbols);
}

// Take an array of symbols and fetch buy/sell order books for each symbol
function getOrderBooksForSymbols(symbols: Array<string>, fetchOrderBooks): Promise<{[key: string]: OrderBooks}> {
  return Promise.all(symbols.map(symbol => fetchOrderBooks(symbol)))
    .then(books => books.reduce((agg, book, index) => {
      return Object.assign({}, agg, { [symbols[index]]: book });
    }, {}))
  .catch(err => {
    console.log('Error fetching order books: ', err);
    return null;
  });
}

// Uses the max tradeAmount to create orders from profitable tranches
// and reduces the orders by the fee amount
function getOrdersFromTranches(tranches, tradeAmount, feeRate) {
  const feeMultiplier = 1 - feeRate;

  return tranches.reduce((order, tranche, index) => {
    const [A_Tranche, B_Tranche, C_Tranche] = tranche;
    const [A_Price, A_Amount, A_Volume, A_Symbol, A_Operation] = A_Tranche;
    const [B_Price, B_Amount, B_Volume, B_Symbol, B_Operation] = B_Tranche;
    const [C_Price, C_Amount, C_Volume, C_Symbol, C_Operation] = C_Tranche;

    let multiplier = 1;

    if (tradeAmount <= 0) {
      return order;
    }

    // We can only buy a portion of this tranche
    if (tradeAmount <= A_Volume) {
      multiplier = (tradeAmount / A_Volume) * 0.99; // add some buffer
    }

    const aAmount = A_Amount * multiplier;
    const A_Order = {
      symbol: A_Symbol,
      operation: A_Operation,
      amount: aAmount,
    };

    const aAmountRec = aAmount * feeMultiplier;
    const bAmountBuy = aAmountRec / B_Price;
    const bAmountSell = aAmountRec * B_Price;
    const bAmount = B_Operation === OPERATIONS.BUY ? bAmountBuy : bAmountSell;
    const B_Order = {
      symbol: B_Symbol,
      operation: B_Operation,
      amount: bAmount,
    };

    const cAmount = bAmount * feeMultiplier;
    const C_Order = {
      symbol: C_Symbol,
      operation: C_Operation,
      amount: cAmount,
    };

    tradeAmount = tradeAmount - (A_Volume * multiplier);

    order.orders.push([A_Order, B_Order, C_Order]);
    order.profit += (cAmount * C_Price) - (aAmount * A_Price);

    return order;
  }, {profit: 0, orders: []});
}

function getTradesFromTriangles(triangles) {
  return triangles.reduce((trades, triangle) => {
    const {c1c2, c1USDT, c2USDT, exchange} = triangle;

    const c1c2Trades = {
      exchange,
      direction: 'c1c2',
      trades: [
        {symbol: c1USDT.symbol, operation: OPERATIONS.BUY},
        {symbol: c1c2.symbol, operation: OPERATIONS.SELL},
        {symbol: c2USDT.symbol, operation: OPERATIONS.SELL}
      ]
    };

    const c2c1Trades = {
      exchange,
      direction: 'c2c1',
      trades: [
        {symbol: c2USDT.symbol, operation: OPERATIONS.BUY},
        {symbol: c1c2.symbol, operation: OPERATIONS.BUY},
        {symbol: c1USDT.symbol, operation: OPERATIONS.SELL}
      ]
    };

    return trades.concat([c1c2Trades, c2c1Trades]);
  }, []);
}

function pairMeetsRequirements(pair) {
  return !!pair.USDT
    && Object.keys(pair.pairs).length > 1;
}

function decorateCoinData(obj) {
  return {
    pairs: {},
    hasUSDT: false
  };
}

