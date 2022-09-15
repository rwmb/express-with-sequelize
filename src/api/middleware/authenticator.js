/**
 * Gets the profile of the user that made the request and adds it to the request object.
 * 
 * @param { express.Request } req The request object containing "profile_id"
 * @param { express.Response } res The response object
 * @returns The call to the next step, with req.profile containing the requested Profile information or "Unauthorized"
 */
const authenticate = async (req, res, next) => {
  const {Profile} = req.app.get('models');
  const userId = req.get('profile_id');

  const profile = await Profile.findByPk(userId);

  if(!profile) return res.status(401).end();

  req.profile = profile;
  next();
};

module.exports = { authenticate };