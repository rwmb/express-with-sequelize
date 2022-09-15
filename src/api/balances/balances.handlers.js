const MAXIMUM_PERCENTAGE_TO_DEPOSIT = 25; // could be configured from many places instead of hard coded

/**
 * Deposits money into the balance of a client, up to a maximum percentage of unpaid jobs
 * 
 * @param { express.Request } req The request object containing the profile and amount to deposit
 * @param { express.Response } res The response object
 * @returns { sequelize.Profile } The updated Profile
 */
const deposit = async (req, res) => {
  try {
    const { Profile } = req.app.get('models');
    const { userId } = req.params;
    const amount = req.body.amount;
    const profile = await Profile.findByPk(userId);
    const unpaidJobsPrice = await profile.getUnpaidJobsPrice();

    if (amount * MAXIMUM_PERCENTAGE_TO_DEPOSIT / 100 > unpaidJobsPrice)
      throw new Error(`Amount is over ${MAXIMUM_PERCENTAGE_TO_DEPOSIT}% or whatever lol idk`);

    await profile.deposit(amount);

    res.json(profile);
  } catch (error) {
    console.error(error);
    return res.status(error.status || 500).end();
  }
};

module.exports = {
  deposit,
};

// It's not clear who is making this request (client, contractor or admin) and what is the 25% condition exactly.
// The chosen approach allows for anyone to update the user balance, as long as they are authenticated,
// up to a limit of 25% of the SUM of all active unpaid jobs related to that user
