const path = require('path');
const express = require('express');
const cookieParser = require('cookie-parser');
const routes = require('./routes');
const { notFoundHandler, globalErrorHandler } = require('./middlewares/errorMiddleware');

const app = express();

// 1. Body & Cookie Parsers
app.use(express.json({ limit: '100kb' }));
app.use(express.urlencoded({ extended: true, limit: '100kb' }));
app.use(cookieParser());

// 2. Sajikan aset statis (Tailwind CSS & Client JS) dari folder public/
app.use(express.static(path.join(__dirname, 'public')));

// 3. Pasang Pusat Routing (API & Views)
app.use('/', routes);

// 4. Penanganan 404 & Global Error Handling terpusat (wajib paling bawah)
app.use(notFoundHandler);
app.use(globalErrorHandler);

module.exports = app;