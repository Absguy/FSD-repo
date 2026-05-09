const router = require("express").Router();
const User = require("../models/user");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { body, validationResult } = require("express-validator");

// Register
router.post("/register", [
  body('email').isEmail().withMessage('Enter a valid email'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('name').notEmpty().withMessage('Name cannot be empty')
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const isSuperAdmin = req.body.role === "superadmin";
    const isAdmin = req.body.role === "admin";
    
    if (isSuperAdmin) {
      if (!req.body.adminKey) {
        return res.status(401).json({ message: "Super admin key is required." });
      }
      const validSuperAdminKey = await bcrypt.compare(req.body.adminKey, process.env.SUPER_ADMIN_KEY_HASH);
      if (!validSuperAdminKey) {
        return res.status(401).json({ message: "Invalid super admin key. Registration denied." });
      }
    } else if (isAdmin) {
      if (!req.body.adminKey) {
        return res.status(401).json({ message: "Admin key is required." });
      }
      const validAdminKey = await bcrypt.compare(req.body.adminKey, process.env.ADMIN_KEY_HASH);
      if (!validAdminKey) {
        return res.status(401).json({ message: "Invalid admin key. Registration denied." });
      }
    }

    const hashed = await bcrypt.hash(req.body.password, 10);

    const user = new User({
      name: req.body.name,
      email: req.body.email,
      password: hashed,
      role: isSuperAdmin ? "superadmin" : (isAdmin ? "admin" : "user")
    });

    await user.save();
    res.json("User Registered");
  } catch (err) {
    if (err.code === 11000) {
      return res.status(400).json({ message: "Email already exists in the system." });
    }
    res.status(400).json({ message: err.message || "An error occurred during registration." });
  }
});

// Login
router.post("/login", [
  body('email').isEmail().withMessage('Enter a valid email'),
  body('password').exists().withMessage('Password is required')
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const user = await User.findOne({ email: req.body.email });
    if (!user) return res.status(400).json("User not found");

    const valid = await bcrypt.compare(req.body.password, user.password);
    if (!valid) return res.status(400).json("Wrong password");

    const token = jwt.sign({ id: user._id, role: user.role, name: user.name }, process.env.JWT_SECRET);

    res.json({ token, user });
  } catch (err) {
    res.status(400).json({ message: err.message || "An error occurred during login." });
  }
});

module.exports = router;
