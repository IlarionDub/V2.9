const cors = require('cors');
const jsonServer = require('json-server');
const express = require('express');

const app = express();
const router = jsonServer.router('db.json');
const middlewares = jsonServer.defaults();

const corsOptions = {
    origin: ['https://ilariondub.github.io'],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    credentials: true,
};

app.use(cors(corsOptions));
app.use(middlewares);
app.use(express.json());
app.use((req, res, next) => {
    res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self' https://accounts.google.com; style-src 'self'; img-src 'self'");
    next();
});
app.use('/api', router);

// Безпека
app.use((req, res, next) => {
    res.setHeader("Content-Security-Policy", "default-src 'self';");
    next();
});

app.listen(3000, () => {
    console.log('Server is running on http://localhost:3000');
});