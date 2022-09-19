var express = require('express');
var router = express.Router();

const handlers = require('./admin.handlers');

router.get('/best-profession', handlers.getBestProfession);

router.get('/best-clients', handlers.getBestClients);

module.exports = router;