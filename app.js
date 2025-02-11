require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const session = require('express-session');
const cors = require('cors');
const {initializeDB } = require('./model/db');
const router = require('./router/router');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(bodyParser.json());

app.use(session({
    secret: process.env.secret || 'jhbjahbdvhas',  
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false }  
}));

initializeDB();
app.use('/',router)
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
