/**
 * Gets the best profession that earned the most money
 * for any contractor that worked in the query time range.
 * 
 * @param { express.Request } req The request object containing the time range query params
 * @param { express.Response } res The response object
 * @returns { string } The best Profession in terms of earned money
 */
const getBestProfession = async (req, res) => {
  try {
    const { Profile } = req.app.get('models');
    const { start, end } = req.query;

    const result = await Profile.getBestProfession(start, end);
    res.json(result);
  } catch (error) {
    console.error(error);
    return res.status(error.status || 500).end();
  }
};
  
/**
 * Gets the best clients that paid the most for jobs
 * in the query time range.
 * 
 * @param { express.Request } req The request object containing the time range query params and size limit
 * @param { express.Response } res The response object
 * @returns { sequelize.Profile[] } The list of best clients
 */
const getBestClients = async (req, res) => {
  try {
    const { Profile } = req.app.get('models');
    const { start, end, limit } = req.query;

    const result = await Profile.getBestClients(start, end, parseInt(limit));
    res.json(result);
  } catch (error) {
    console.error(error);
    return res.status(error.status || 500).end();
  }
};

module.exports = {
  getBestProfession,
  getBestClients,
};