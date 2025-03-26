const jwt = require("jsonwebtoken");

exports.ensureAuthenticated = (req, res, next) => {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return res.status(401).json({ error: "Unauthorized" });

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ error: "Invalid token" });
    req.user = user;
    next();
  });
};

exports.ensureRole = (role) => (req, res, next) => {
  if (req.user.role !== role) return res.status(403).json({ error: "Forbidden" });
  next();
};
