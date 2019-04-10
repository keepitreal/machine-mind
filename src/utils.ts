import {OrderBooks, OrderBook} from './interfaces';

export function patchOrderBooksUpdate(
  books : OrderBooks,
  update : OrderBooks
) : OrderBooks {
  const {BUY: buy, SELL: sell} = books;
  const {BUY: buyUpdate, SELL: sellUpdate} = update;

  return {
    BUY: patchOrderBookUpdate(buy, buyUpdate),
    SELL: patchOrderBookUpdate(sell, sellUpdate),
  };
}

export function patchOrderBookUpdate(
  book: OrderBook,
  update: OrderBook
) : OrderBook {
  const startingLen = book.length;
  const sortedBook = book.sort(sortBook);

  const updateMap = Object.entries(update).reduce((agg, [key, value]) => {
    const [price] = value;
    return Object.assign({}, agg, {
      [price]: value
    });
  }, {});

  // Removes fulfilled order levels and updates existing levels
  const patched = sortedBook.reduce((agg, order) => {
    const [price] = order;
    const updateRef = updateMap[price];

    if (!updateRef) {
      return agg.concat([order]);
    }

    // keep shallow copy
    const update = updateRef.slice();

    // Remove from the map so only new order levels
    // are left
    delete updateMap[price];

    // Remove closed or fullfilled order levels
    if (update[0] === price && update[1] === 0) {
      return agg;
    }

    // Patch in updates to existing order levels
    if (update[0] === price) {
      return agg.concat([update]);
    }

    return agg.concat([order]);
  }, []);

  const newOrders = Object.entries(updateMap).map(([,value]) => value);
  const updated = patched
    .concat(newOrders)
    .sort(sortBook)
    .slice(0, startingLen);

  return updated;
}

function sortBook(a, b) {
  const [priceA] = a;
  const [priceB] = b;
  return priceB - priceA;
}
