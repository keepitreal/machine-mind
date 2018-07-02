import * as cobinhood from '../exchanges/cobinhood';


export default async function marketMakingEngine() {

  // AVOIDING EOD INVENTORY STRATEGIES

  // "Leading Exchange"
  // ==================
  // fetch last x minutes of trading data from x number of exchanges
  // map minutes/second data to % change in price
  // find price change correlation and measure the distance between correlated changes
  // if a price change in the leading exchange moves against the open position, close out


  startCobinhoodEngine();

}

async function startCobinhoodEngine() {
  const {
    fetchTradingPairs
  } = cobinhood;

  // MARKET MAKING LOGISTICS

  // 1. Fetch all order books
  const tradingPairs = await fetchTradingPairs();
  console.log(tradingPairs);

  // 2. Find the largest volume to bid/ask spread ratio
  //    a. Should also have minimum volume so we're not wasting time
  // 3. Place a buy a couple cents above the highest bid
  // 4. When it fills, place a sell a couple cents below the lowest ask 
  //    a. ONLY if the ask is higher than the purchase price plus any fees
  // 5. Monitor the order books to make sure you don't get out bid/asked
  // 6. If you do, cancel order and create one 0.01 cents above/below
  // 5. ??????
  // 6. Profit

}

// Balances 1 BTC, 6700 USDT
// BUY BTC-USDT 6700
// SELL BTC-USDT 6701
// 

