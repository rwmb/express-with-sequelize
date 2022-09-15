var express = require('express');
var router = express.Router();

const handlers = require('./balances.handlers');

router.post('/deposit/:userId', handlers.deposit);

module.exports = router;