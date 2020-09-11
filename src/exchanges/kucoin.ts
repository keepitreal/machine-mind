import {Observable, interval} from 'rxjs';
import {flatMap} from 'rxjs/operators';
import {createHmac} from 'crypto';
import {format} from 'url';
import {fetchPromise} from './utils';
import {OrderBooks} from '../interfaces';

const config: any = require(`../config/env/${process.env.NODE_ENV}.json`);
const {API: {KUCOIN: kucoinConfig}} = config;

export function getOrderBooks(
  symbol : string,
  intervalMS : number
) : Observable<OrderBooks> {
  const promise = fetchOrderBooks.bind(null, symbol);
  return interval(intervalMS).pipe(flatMap(promise));
}

export async function fetchTradingPairs() {
  const endpoint = '/api/v1/symbols';
  const response = await requestKucoinEndpoint(endpoint);

  return response;
}

export async function fetchOrderBooks(symbol) {
  const endpoint = `/api/v1/market/orderbook/level2_20?symbol=${symbol}`;
  const response = await requestKucoinEndpoint(endpoint);

  return response;
}

export async function fetchAccountInfo() {
  const endpoint = '/api/v1/accounts';
  const response = await requestKucoinEndpoint(endpoint);

  return response;
}

export async function fetchBalances(accountId: string) {
  const endpoint = `/api/v1/accounts/${accountId}`;
  const response = await requestKucoinEndpoint(endpoint);

  return response || {balance: 0};
}

async function requestKucoinEndpoint(endpoint) {
  const headers = createHeaders(kucoinConfig, endpoint);
  const location = format(kucoinConfig.URL + endpoint);

  try {
    const response = await fetchPromise(location, {headers});
    const body = JSON.parse(response);

    if (body && body.error) {
      console.log(body)
    }

    if (!body) {
      throw new Error(`Error fetching kucoin endpoint ${endpoint}`);
    }

    return body.data;
  } catch (err) {
    console.log(err);
    throw new Error(err);
  }
}

function createHeaders(config, endpoint) {
  const {URL, KEY, SECRET} = config;
  const nonce = Date.now();
  const strForSign = `${endpoint}/${nonce}/`;
  const signatureStr = Buffer.from(strForSign, 'utf-8').toString('base64');
  const signature = createHmac('sha256', SECRET).update(signatureStr).digest('hex');

  return {
    'KC-API-KEY': KEY,
    'KC-API-NONCE': nonce,
    'KC-API-SIGNATURE': signature
  };
}

