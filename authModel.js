const users = [
  { username: 'admin', password: 'admin123', role: 'admin' },
  { username: 'user', password: 'user123', role: 'user' }
];

module.exports = {
  verifyUser: (username, password) => {
    return users.find(user => user.username === username && user.password === password);
  }
};
