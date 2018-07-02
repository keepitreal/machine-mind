import {format, parse} from 'url';
import {map} from 'rxjs/operators';
import {fetchPromise, fromPromise} from './utils';

const config: any = require(`../config/env/${process.env.NODE_ENV}.json`);
const {API: {CRYPTOCOMPARE: cryptoCompareConfig}} = config;

export function fetchHistoMinute(e : string, symbol : string) {
  const fsym = symbol.split('-').shift();
  const tsym = symbol.split('-').pop();

  const {protocol, hostname} = parse(cryptoCompareConfig.URL);
  const pathname = '/data/histominute';
  const query = {fsym, tsym, e};
  const location = format({ protocol, hostname, pathname, query});

  return fromPromise(location).pipe(
    map(v => v.Data)
  );
}

export async function fetchExchangesAndPairs() {
  const endpoint = '/data/all/exchanges';
  const response = await requestCryptocompareEndpoint(endpoint);

  return response;
}

async function requestCryptocompareEndpoint(endpoint) {
  const url = format(cryptoCompareConfig.URL + endpoint);

  try {
    const response = await fetchPromise(url);
    const body = JSON.parse(response);

    if (body && body.error) {
      console.log(body)
    }

    if (!body) {
      throw new Error(`Error fetching kucoin endpoint ${endpoint}`);
    }

    return body;
  } catch (err) {
    throw new Error(err);
  }
}

