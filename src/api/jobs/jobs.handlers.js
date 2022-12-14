/**
 * Gets all unpaid Jobs from a list of active Contracts that the user has access to
 * 
 * @param { express.Request } req
 * @param { express.Request } res
 * @returns A list of unpaid Jobs from active contracts
 */
const getAllUnpaidJobs = async (req, res) => {
  const profile = req.profile;

  try {
    const result = await profile.getUnpaidJobs();
  
    res.json(result);
  } catch (error) {
    console.error(error);
    return res.status(error.status || 500).end();
  }
};

/**
 * Gets the sum of unpaid Jobs from a list of active Contracts that the user has access to
 * 
 * @param { express.Request } req
 * @param { express.Request } res
 * @returns { number } The sum of unpaid Jobs from active contracts
 */
const getUnpaidJobsAmount = async (req, res) => {
  const profile = req.profile;

  try {
    const result = await profile.getUnpaidJobsAmount();
  
    res.json(result);
  } catch (error) {
    console.error(error);
    return res.status(error.status || 500).end();
  }
};

/**
 * Pays for a Job if the client has a balance bigger or equal to Job price.
 * The amount is moved from the client's balance to the contractor's balance
 * 
 * @param { express.Request } req
 * @param { express.Request } res
 * @returns The updated Profile with the new balance and the Job that was paid.
 */
const pay = async (req, res) => {
  try {
    const { job_id } = req.params;
    const result = await req.profile.pay(job_id);
  
    res.json(result);
  } catch (error) {
    console.error(error);
    return res.status(error.status || 500).end();
  }
};

module.exports = {
  getAllUnpaidJobs,
  getUnpaidJobsAmount,
  pay,
};