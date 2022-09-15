var express = require('express');
var router = express.Router();

const handlers = require('./contracts.handlers');

router.get('/', handlers.getAll);

router.get('/:id', handlers.getOne);

module.exports = router;