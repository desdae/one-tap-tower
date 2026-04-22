import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

test('topbar uses a gear settings button instead of a sound label chip', () => {
  const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');

  assert.equal(html.includes('id="sound-toggle"'), false);
  assert.equal(html.includes('id="settings-button"'), true);
  assert.equal(html.includes('Open options'), true);
});

test('options overlay includes separate music and effects sliders', () => {
  const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
  const styles = readFileSync(new URL('../src/styles.css', import.meta.url), 'utf8');

  assert.equal(html.includes('id="options-screen"'), true);
  assert.equal(html.includes('id="music-volume"'), true);
  assert.equal(html.includes('id="effects-volume"'), true);
  assert.match(styles, /\.options-screen--active/s);
  assert.match(styles, /\.slider/s);
});
