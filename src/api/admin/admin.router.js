var express = require('express');
var router = express.Router();

const handlers = require('./admin.handlers');

router.get('/best-profession', handlers.getBestProfession);

router.get('/best-clients?start=<date>&end=<date>&limit=<integer>', handlers.getBestClients);

module.exports = router;