import {Observable, interval, of, merge} from 'rxjs';
import {flatMap, scan, map} from 'rxjs/operators';
import {format} from 'url';
import {fetchPromise} from './utils';
import {OrderBooks, OrderBook} from '../interfaces';
import {createSocketObserver} from '../Socket';
import {patchOrderBooksUpdate} from '../utils';

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
  limit : number = 1000
) : Promise<OrderBooks> {
  const endpoint = `/api/v1/depth?symbol=${symbol}&limit=${limit}`;
  const response = await requestEndpoint(endpoint);
  const formatted = formatOrderBooks(response);

  return formatted;
}

export async function getOrderBooksSocket(
  symbol : string,
  limit : number = 50
) : Promise<Observable<OrderBooks>> {
  const books = await fetchOrderBooks(symbol);
  const booksInitial$ = of(books);

  const booksUpdate$ = orderBooksSocket(symbol);
  const books$ = merge(booksInitial$, booksUpdate$);

  return books$
    .pipe(scan((acc, curr) => patchOrderBooksUpdate(acc, curr)))
    .pipe(map(books => truncateOrderBooks(books, limit)));
}

export function orderBooksSocket(
  symbol : string
) : Observable<OrderBooks> {
  const url = format(`${config.SOCKET_URL}${symbol.toLowerCase()}@depth`);
  const books$ = createSocketObserver(url);

  return books$
    .pipe(map(books => formatOrderBooks(books)));
}

function formatOrderBooks(response) : OrderBooks {
  return {
    BUY: formatOrderBook(response.bids || response.b),
    SELL: formatOrderBook(response.asks || response.a),
  };
}

function truncateOrderBooks(books, limit) : OrderBooks {
  return {
    BUY: books.BUY.slice(0, limit),
    SELL: books.SELL.slice(0, limit)
  };
}

function formatOrderBook(orders) {
  return orders.map(([priceStr, quantityStr]) => {
    const price = parseFloat(priceStr);
    const quantity = parseFloat(quantityStr);

    return [
      price,
      quantity,
      price * quantity, // volume
    ];
  });
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
