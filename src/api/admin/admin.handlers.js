/**
 * Gets the best profession that earned the most money
 * for any contractor that worked in the query time range.
 * 
 * @param { express.Request } req The request object containing the time range query params
 * @param { express.Response } res The response object
 * @returns { string } The best Profession in terms of earned money
 */
const getBestProfession = async (req, res) => {
  // Get all Contracts with ContractorId
  // Include Jobs where paidAt between range and paid equals true
  // sort by sum desc and get first

  const result = {};
  res.json(result);
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
  // Get all contracts with ClientID
  // Include Jobs where payedAt between range and paid equals true
  // sorted by sum desc and limited to the query param || 2 return result

  // FIELDS TO SHOW
  // id
  // fullName
  // paid

  const result = {};
  res.json(result);
};

module.exports = {
  getBestProfession,
  getBestClients,
};