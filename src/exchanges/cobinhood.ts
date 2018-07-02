import  * as uuid from 'uuid/v1';
import {format} from 'url';
import {fetchPromise} from './utils';
import {Pair} from '../interfaces';
import SocketClient from '../Socket';

import {
  COBINHOOD_OPERATIONS,
  COBINHOOD_ORDER_TYPES,
  COB_SOCKET_ORDER_TYPES,
  OPERATIONS,
} from '../constants';

const config: any = require(`../config/env/${process.env.NODE_ENV}.json`);
const {API: {COBINHOOD: cobinhoodConfig}} = config;

let socket = null;

export function publish(params) {
  if (!socket) {
    socket = createSocketConnection();
  }

  const payload = Object.assign({}, params, {
    version: cobinhoodConfig.SOCKET_VERSION,
  });

  const payloadToString = castToString(payload);

  socket.publish(payloadToString);
}

export function subscribe(event : string) {
  if (!socket) {
    socket = createSocketConnection();
  }

  return socket.subscribe(event);
}

function createSocketConnection() {
  const url = cobinhoodConfig.SOCKET_URL;
  const keepAlive = {action: 'ping'};
  const headers = createHeaders(cobinhoodConfig);
  const client = new SocketClient(url, keepAlive, { headers });

  return client;
}

export async function getOrders(symbol : string) {
  const source$ = subscribe(`trade.${symbol}`);

  const payload = {
    action: 'subscribe',
    type: 'trade',
    trading_pair_id: symbol,
  };

  publish(payload);

  return source$;
}

export async function getOrderBooks(symbol : string): Promise<any> {
  const precisionValues = await getPrecision(symbol);
  const precision = precisionValues.shift();

  const payload = {
    action: 'subscribe',
    type: 'order-book',
    trading_pair_id: symbol,
    precision,
  };

  publish(payload);

  const source$ = subscribe(`order-book.${symbol}.${precision}`);

  return source$;
}

export async function getPrecision(symbol : string) {
  const endpoint = '/v1/market/orderbook/precisions/' + symbol;
  const response = await requestCobinhoodEndpoint(endpoint);

  return response;
}

function placeOrder(
  symbol : string,
  side : string,
  type : string,
  price : number,
  size : number,
  cb : Function
) {

  const source$ = subscribe('order');

  const payload = {
    action: 'place_order',
    trading_pair_id: symbol,
    type: COB_SOCKET_ORDER_TYPES.LIMIT, // limit
    price,
    size,
    side,
    id: uuid()
  };

  publish(payload);

  return source$;
}

export function placeLimitBuyOrder(
  symbol : string,
  price : number,
  amount : number,
  cb : Function
) {
  placeOrder(symbol, COBINHOOD_OPERATIONS.BID, COBINHOOD_ORDER_TYPES.LIMIT,
    price, amount, cb);
}

export async function fetchTradingPairs() : Promise<Array<Pair>> {
  const endpoint = '/v1/market/trading_pairs';
  const response = await requestCobinhoodEndpoint(endpoint);
  const formatted = formatTradingPairs(response.trading_pairs);

  return formatted;
}

function formatTradingPairs(pairs) {
  return pairs.map(pair => ({
    coinType: pair.base_currency_id,
    coinTypePair: pair.quote_currency_id,
    symbol: pair.id
  }));
}

export async function fetchOrderBooks(symbol) {
  const endpoint = `/v1/market/orderbooks/${symbol}`;
  const response = await requestCobinhoodEndpoint(endpoint);
  const formatted = formatOrderBooks(response, symbol);

  return formatted;
}

function formatOrderBooks(response, symbol) {
  const {orderbook: {bids, asks}} = response;
  return {
    BUY: formatOrders(bids, symbol),
    SELL: formatOrders(asks, symbol)
  };
}

function formatOrders(orders, symbol) {
  return orders.map((order, index) => {
    const [priceStr, countStr, amountStr] = order;
    const price = parseFloat(priceStr);
    const amount = parseFloat(amountStr);
    const volume = price * amount;
    const formattedOrder = [price, amount, volume];

    return formattedOrder;
  });
}

export async function fetchBalanceForCoin(coin) {
  const balances = await fetchBalances();
  const coinBalance = balances[coin];

  return {balance: parseFloat(coinBalance.total)};
}

async function fetchBalances() {
  const endpoint = `/v1/wallet/balances`;
  const response = await requestCobinhoodEndpoint(endpoint);
  const {balances} = response;

  return balances.reduce((balancesMap, coin) => {
    return Object.assign({}, balancesMap, {
      [coin.currency]: coin
    });
  }, {});
}

async function requestCobinhoodEndpoint(endpoint) {
  const headers = createHeaders(cobinhoodConfig);
  const location = format(cobinhoodConfig.URL + endpoint);

  try {
    const response = await fetchPromise(location, {headers});
    const body = JSON.parse(response);

    if (body && body.error) {
      console.log(body)
    }

    if (!body) {
      throw new Error(`Error fetching kucoin endpoint ${endpoint}`);
    }

    return body.result;
  } catch (err) {
    throw new Error(err);
  }
}

function createHeaders(config) {
  const {KEY} = config;
  const nonce = Date.now();

  return {
    'authorization': KEY,
    'nonce': nonce,
  };
}

function getTypeFromOperation(operation: string) {
  return operation === OPERATIONS.BUY ?
    COBINHOOD_OPERATIONS.BID :
    COBINHOOD_OPERATIONS.ASK;
}

// It seems cobinhood wants all values sent as a string
function castToString(payload) {
  return Object.entries(payload).reduce((payload, [key, value]) => {
    return Object.assign({}, payload, {[key]: value.toString()});
  }, {});
}
