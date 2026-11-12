'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { app, total } = require('./app');

test('total(100, 2, 0.5) es 100', () => {
  assert.equal(total(100, 2, 0.5), 100);
});

test('descuentos cero y completo', () => {
  assert.equal(total(100, 2, 0), 200);
  assert.equal(total(100, 2, 1), 0);
});

test('HTTP calcula el total y rechaza entradas inválidas', async t => {
  const server = app.listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  t.after(() => new Promise(resolve => server.close(resolve)));
  const base = `http://127.0.0.1:${server.address().port}`;
  const response = await fetch(`${base}/total?precio=100&cant=2&desc=0.5`);
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { total: 100 });
  assert.equal(response.headers.get('x-powered-by'), null);
  assert.match(response.headers.get('content-security-policy'), /form-action 'none'/);
  const missing = await fetch(`${base}/ruta-inexistente`);
  assert.equal(missing.status, 404);
  assert.match(missing.headers.get('content-security-policy'), /frame-ancestors 'none'/);
  for (const query of ['', 'precio=100&cant=2&desc=2', 'precio=texto&cant=2&desc=0.5', 'precio=100&cant=1.5&desc=0.5']) {
    assert.equal((await fetch(`${base}/total?${query}`)).status, 400);
  }
});
