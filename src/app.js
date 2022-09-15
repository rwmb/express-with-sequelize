const express = require('express');
const bodyParser = require('body-parser');

const { sequelize } = require('./model');

const router = require('./api/router');

const app = express();

app.use(bodyParser.json());
app.set('sequelize', sequelize);
app.set('models', sequelize.models);

app.use(router);

module.exports = app;
