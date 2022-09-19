/**
 * Gets the requested Contract with the provided ID from a list of Contracts.
 * 
 * I didn't change this route too much to keep it closer to the original,
 * but this GET request should also be done through the Profile model
 * 
 * @param { express.Request } req
 * @param { express.Response } res
 * @returns { sequelize.Contract } The requested Contract
 */
const getOne = async (req, res) => {
  try {
    const { Contract } = req.app.get('models');
    const { id } = req.params;
    const profile = req.profile;
  
    const clause = Contract.getProfileIdClause(profile);
    clause['id'] = id;

    const contract = await Contract.findOne({where: clause});

    if(!contract) return res.status(404).end();

    res.json(contract);
  } catch (error) {
    console.error(error);
    return res.status(error.status || 500).end();
  }
};

/**
 * Gets all active Contracts from a list of Contracts of the user
 * 
 * @param { express.Request } req
 * @param { express.Request } res
 * @returns { sequelize.Contract[] } A list of active Contracts that the user has access to.
 */
const getAll = async (req, res) => {
  try {
    const { Contract } = req.app.get('models');
    const result = await Contract.getAll(req.profile);

    res.json(result);
  } catch (error) {
    console.error(error);
    return res.status(error.status || 500).end();
  }
};

module.exports = {
  getOne,
  getAll,
};
