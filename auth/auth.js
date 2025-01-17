const session = require("express-session");

const users = {
  client: { password: "rapidPr2025", role: "user" },
  admin: { password: "RaPidPr2000", role: "admin" },
};

const authMiddleware = (req, res, next) => {
  if (req.session && req.session.user) {
    return next(); // User is authenticated
  }
  res.redirect("/"); // Redirect to login page if not authenticated
};



const roleMiddleware = (requiredRole) => {
  return (req, res, next) => {
    if (req.session && req.session.user) {
      if (req.session.role === requiredRole || req.session.role === "admin") {
        return next();
      } else {
        res.redirect("/");
      }
    }
    res.redirect("/");
  };
};

module.exports = { users, authMiddleware, roleMiddleware, session };
