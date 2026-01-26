require("dotenv").config();
const jwt = require("jsonwebtoken");
const Admin = require("../models/Admin");

const signInToken = (user) => {
  const payload = {
    _id: user._id,
    name: user.name,
    email: user.email,
    address: user.address,
    phone: user.phone,
    image: user.image,
  };

  // Include role if it exists (for Admin or Customer with role)
  if (user.role) {
    payload.role = user.role;
  }

  return jwt.sign(
    payload,
    process.env.JWT_SECRET,
    {
      expiresIn: "1d",
    }
  );
};

const tokenForVerify = (user) => {
  return jwt.sign(
    {
      _id: user._id,
      name: user.name,
      email: user.email,
      password: user.password,
    },
    process.env.JWT_SECRET_FOR_VERIFY,
    { expiresIn: "15m" }
  );
};

const isAuth = async (req, res, next) => {
  const { authorization } = req.headers;
  // console.log("authorization", req.headers);
  try {
    const token = authorization.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    res.status(401).send({
      message: err.message,
    });
  }
};

const isAdmin = async (req, res, next) => {
  try {
    // First check if user is authenticated
    if (!req.user || !req.user._id) {
      return res.status(401).send({
        message: "Authentication required",
      });
    }

    // Check if user has admin role in token
    if (req.user.role === "Admin" || req.user.role === "Super Admin") {
      return next();
    }

    // Fallback: verify admin status from database
    const admin = await Admin.findById(req.user._id);
    if (admin && (admin.role === "Admin" || admin.role === "Super Admin")) {
      // Update req.user with role if not in token
      req.user.role = admin.role;
      return next();
    }

    res.status(403).send({
      message: "Admin access required",
    });
  } catch (err) {
    res.status(500).send({
      message: err.message,
    });
  }
};

module.exports = {
  signInToken,
  tokenForVerify,
  isAuth,
  isAdmin,
};
