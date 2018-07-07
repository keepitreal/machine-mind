import {Observable, interval} from 'rxjs';
import {flatMap} from 'rxjs/operators';
import {format} from 'url';
import {fetchPromise} from './utils';
import {OrderBooks} from '../interfaces';
import SocketClient from '../Socket';

const cfg: any = require(`../config/env/${process.env.NODE_ENV}.json`);
const {API: {BINANCE: config}} = cfg;

export function getOrderBooks(
  symbol : string,
  limit : number,
  intervalMS : number = 5000
) : Observable<OrderBooks> {
  const promise = fetchOrderBooks.bind(null, symbol, limit);
  return interval(intervalMS).pipe(flatMap(promise));
}

export async function fetchOrderBooks(
  symbol : string,
  limit : number = 10
) : Promise<OrderBooks> {
  const endpoint = `/api/v1/depth?symbol=${symbol}&limit=${limit}`;
  const response = await requestEndpoint(endpoint);
  const formatted = formatOrderBooks(response);

  return formatted;
}

export function getOrderBooksSocket(
  symbol : string
) {
  const url = format(`${config.SOCKET_URL}${symbol.toLowerCase()}@depth`);
  const source$ = new SocketClient(url);

  return source$;
}

function formatOrderBooks(response) {
  return {
    BUY: formatOrderBook(response.bids),
    SELL: formatOrderBook(response.asks),
  };
}

function formatOrderBook(orders) {
  return orders.map(([price, qty]) => [
    price,
    qty,
    price * qty, // volume
  ]);
}

async function requestEndpoint(endpoint) {
  const location = format(config.URL + endpoint);

  try {
    const response = await fetchPromise(location);
    const body = JSON.parse(response);

    return body;
  } catch (err) {
    throw new Error(err);
  }
}
