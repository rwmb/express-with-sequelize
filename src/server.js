// Copyright blablabla

const app = require('./app');
const env = require('../environment');

const PORT = process.env.PORT || env.PORT || 3001;

async function init() {
  try {
    app.listen(3001, () => {
      console.log('Express App Listening on Port ' + PORT);
    });
  } catch (error) {
    console.error(`An error occurred: ${JSON.stringify(error)}`);
    process.exit(1);
  }
}

init();
