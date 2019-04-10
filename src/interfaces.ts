export type Order = [number, number, number];
export type Tranche = Array<Order>;

export type OrderBook = Array<Order>;

export interface OrderBooks {
  SELL: OrderBook;
  BUY: OrderBook;
}

export interface TradingPairs {
  [key: string]: TradingPair
}

export interface TradingPair {
  pairs: Array<Pair>;
  USDT: Pair;
}

export interface Pair {
  coinType: string;
  coinTypePair: string;
  symbol: string;
  buy?: number;
  sell?: number;
  price?: number;
  feeRate?: number;
}

export interface Triangle {
  direction: string;
  trades: Array<Trade>;
}

export interface Trade {
  symbol: string;
  operation: string; // These are only BUY and SELL so look at enums/unions
  amount?: number;
  available?: number;
  price?: number;
}

