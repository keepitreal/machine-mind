import * as assert from 'assert';

import {patchOrderBookUpdate} from '../src/utils';
import {buyBook, buyUpdate1, patched1} from './samples';

describe('patchOrderBookUpdate', () => {
  const update = patchOrderBookUpdate(buyBook, buyUpdate1);
//   assert.equal(1, 1);
});

