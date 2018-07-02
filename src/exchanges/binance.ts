import {Observable, merge, from} from 'rxjs';
import {format} from 'url';
import {fetchPromise} from './utils';
import {OrderBooks} from '../interfaces';

const cfg: any = require(`../config/env/${process.env.NODE_ENV}.json`);
const {API: {BINANCE: config}} = cfg;

export function getOrderBooks(
  symbol : string,
  limit : number,
  interval : number = 5000
) : Observable<OrderBooks> {
  const promise = fetchOrderBooks.bind(null, symbol, limit);
  const immediate$ = from(promise());

  const interval$ = Observable.create(observer => {
    setInterval(() => {
      promise().then(books => observer.next(books));
    }, interval)
  });

  return interval$;
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
