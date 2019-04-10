import {OrderBook} from '../src/interfaces';

export const buyBook : OrderBook = [
  [100, 1, 100],
  [99.5, 0.3, 29.85],
  [99, 0.5, 49.5],
  [98.5, 0.8, 78.8],
  [98.3, 0.3, 29.49]
];

export const buyUpdate1 : OrderBook = [
  [99.5, 0.5, 49.75],
  [99, 0, 0],
  [98.7, 1, 98.7],
  [97.2, 1, 97.2]
];

export const patched1 : OrderBook = [
  [100, 1, 100],
  [99.5, 0.5, 49.75],
  [98.5, 0.8, 78.8],
  [98.3, 0.3, 29.49]
];
