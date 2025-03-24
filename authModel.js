const { v4: uuidv4 } = require('uuid');

const tokens = {}; // Store tokens temporarily (use a database in production)
const users = {
  admin: { password: 'password', role: 'admin' },
  user: { password: 'password', role: 'user' }
};

module.exports = {
  getClient: function(clientId, clientSecret, callback) {
    const client = { clientId: '123', clientSecret: 'secret', grants: ['password'] };
    callback(null, client);
  },

  getUser: function(username, password, callback) {
    const user = users[username];
    if (user && user.password === password) {
      callback(null, { username, role: user.role });
    } else {
      callback(null, false);
    }
  },

  saveToken: function(token, client, user, callback) {
    const accessToken = uuidv4();
    tokens[accessToken] = { user, accessToken };
    callback(null, { accessToken, user });
  },

  getAccessToken: function(accessToken, callback) {
    callback(null, tokens[accessToken] || false);
  }
};
