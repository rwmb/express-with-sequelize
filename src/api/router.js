var express = require('express');
var router = express.Router();

const { authenticate } = require('./middleware/authenticator');

const adminRouter = require('./admin/admin.router');
const balancesRouter = require('./balances/balances.router');
const contractsRouter = require('./contracts/contracts.router');
const jobsRouter = require('./jobs/jobs.router');

router.use(authenticate);

router.use('/admin', adminRouter);
router.use('/balances', balancesRouter);
router.use('/contracts', contractsRouter);
router.use('/jobs', jobsRouter);

module.exports = router;
