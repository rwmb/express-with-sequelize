var express = require('express');
var router = express.Router();

const handlers = require('./jobs.handlers');

router.get('/unpaid', handlers.getAllUnpaidJobs);

router.get('/unpaidAmount', handlers.getUnpaidJobsAmount);

router.post('/:job_id/pay', handlers.pay);

module.exports = router;