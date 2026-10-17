import test from 'node:test';
import assert from 'node:assert/strict';
import { createMonetization } from '../src/monetization.js';

const storage = { getRemoveAds: () => false, setRemoveAds: () => {} };

test('remove ads is offered in the browser only until Play Billing exists', () => {
  assert.equal(createMonetization({ platform: { isBrowser: true }, storage }).canOfferRemoveAds(), true);
  assert.equal(createMonetization({ platform: { isBrowser: false }, storage }).canOfferRemoveAds(), false);
});
