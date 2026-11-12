'use strict';

const express = require('express');
const helmet = require('helmet');

const total = (precio, cant, desc) => precio * cant * (1 - desc);

const app = express();
app.disable('x-powered-by');
app.use(helmet({
  contentSecurityPolicy: {
    useDefaults: false,
    directives: {
      defaultSrc: ["'none'"],
      baseUri: ["'none'"],
      formAction: ["'none'"],
      frameAncestors: ["'none'"],
    },
  },
}));
app.use((_req, res, next) => {
  res.set('Cache-Control', 'no-store');
  next();
});

app.get('/', (_req, res) => {
  res.type('html').send('<!doctype html><html lang="es"><head><meta charset="utf-8"><title>Tienda segura</title></head><body><h1>Tienda segura</h1><a href="/total?precio=100&amp;cant=2&amp;desc=0.5">Calcular compra con descuento</a></body></html>');
});

app.get('/total', (req, res) => {
  const values = ['precio', 'cant', 'desc'].map(key => {
    const value = req.query[key];
    return typeof value === 'string' && value.trim() !== '' ? Number(value) : NaN;
  });
  const [precio, cant, desc] = values;
  if (!values.every(Number.isFinite) || precio < 0 || !Number.isInteger(cant) || cant < 0 || desc < 0 || desc > 1) {
    return res.status(400).json({ error: 'precio >= 0, cant entero >= 0 y desc entre 0 y 1 son obligatorios.' });
  }
  const resultado = total(precio, cant, desc);
  if (!Number.isFinite(resultado)) return res.status(400).json({ error: 'El total excede el rango numérico.' });
  res.json({ total: resultado });
});

app.use((_req, res) => res.status(404).json({ error: 'Ruta no encontrada.' }));

if (require.main === module) {
  const port = Number(process.env.PORT || 3004);
  const host = process.env.HOST || '127.0.0.1';
  app.listen(port, host, () => console.log(`Tienda segura: http://${host}:${port}`));
}

module.exports = { app, total };
