import {map, filter} from 'rxjs/operators';
import {combineLatestObject} from 'rxjs-etc';
import * as meanBy from 'lodash/meanBy';
import {fetchHistoMinute} from '../exchanges/cryptocompare';
import * as kucoin from '../exchanges/kucoin';
import * as binance from '../exchanges/binance';

export default async function leadingExchangeEngine() {
  const leadExchange = { name: 'binance', symbol: 'BTC-USDT' };
  const trailExchange = { name: 'kucoin', symbol: 'BTC-USDT' };

  // Get average amount that binance leads by (this tells me when to buy on the trailing exchange)
  const binanceLeadAverages$ = getExchangeAverages(leadExchange, trailExchange);

  // Get average diff between exchanges (this tells me when price has normalized and I can sell)

  // Start polling to look for leads/trails

  const opportunity$ = combineLatestObject({
    kucoinOrderBooks: kucoin.getOrderBooks('BTC-USDT', 5000),
    binanceOrderBooks: binance.getOrderBooks('BTCUSDT', 10, 5000),
  })
  .pipe(map(({kucoinOrderBooks, binanceOrderBooks}) => ({
    lowestSell: kucoinOrderBooks.SELL.slice().shift(),
    highestBuy: binanceOrderBooks.BUY.slice().shift(),
  })))
  .pipe(filter(({lowestSell, highestBuy}) => highestBuy > lowestSell))
  .pipe(map(result => console.log(result)));

  // Next steps
  // - A good opportunity will be a spike in diff compared to prior periods
  // - Track the next couple of minutes and start making mock trades
  // - Need to check order sizes when determining actual diff

  // An ideal trail will look like
  // - Difference between the lowest SELL price on the trailing exchange and the highest BUY
  //   price on the leading exchange exceeds the average
  // - Account for fees as well
  // - Perhaps prior periods have tighter differences (still evaluating)

  opportunity$.subscribe(x => x);
  //   binanceOrderBooks$.subscribe(x => console.log(x));
}

function getExchangeAverages(exchangeA : ExchangeSymbol, exchangeB : ExchangeSymbol) {
  const averages$ = combineLatestObject({
    a: fetchHistoMinute(exchangeA.name, exchangeA.symbol),
    b: fetchHistoMinute(exchangeB.name, exchangeB.symbol),
  }).pipe(map(({a, b}) => {
    return compareExchanges(a, b);
  }));

  return averages$;
}

function compareExchanges(pricesA, pricesB) {
  const A_Leads = [];

  for (let index = pricesA.length - 1; index > 0; index--) {
    const priceA = pricesA[index];
    const priceB = pricesB[index];
    const closeA = priceA.close;
    const closeB = priceB.close;

    if (priceA.time !== priceB.time) {
      continue;
    }

    if (closeA > closeB) {
      A_Leads.push({
        priceA,
        priceB,
        index,
        diff: priceDiff(closeA, closeB),
        diffPct: priceDiffPct(closeA, closeB),
      });
    }
  }

  return {
    diffMean: meanBy(A_Leads, a => a.diff),
    diffMeanPct: meanBy(A_Leads, a => a.diffPct),
  };
}

function priceDiff(a : number, b : number) : number {
  return a - b;
}

function priceDiffPct(a : number, b : number) : number {
  return (a - b) / b;
}

interface ExchangeSymbol {
  name: string;
  symbol: string;
}

/*
const exchanges = [
  'bitmex',
  'kraken',
  'okcoin',
  'coinbase',
  'poloniex',
  'bitfinex',
  'hitbtc',
  'cryptopia',
  'etherdelta',
  'binance',
  'okex',
  'kucoin',
  'bitstamp'
];
*/
