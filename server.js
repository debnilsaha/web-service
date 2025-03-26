require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const passport = require("passport");
const session = require("express-session");
const cors = require("cors");
const helmet = require("helmet");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const multer = require("multer");
const cloudinary = require("cloudinary").v2;
const { ensureAuthenticated, ensureRole } = require("./authModel");

const app = express();
const PORT = process.env.PORT || 10000;

// Database Connection
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cors({ origin: "*" }));
app.use(helmet());
app.use(session({ secret: process.env.JWT_SECRET, resave: false, saveUninitialized: true }));
app.use(passport.initialize());
app.use(passport.session());

// Cloudinary Configuration
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Multer Storage
const storage = multer.memoryStorage();
const upload = multer({ storage });

// ** ROUTES **

// ✅ User Login
app.post("/login", async (req, res) => {
  const { username, password } = req.body;
  const user = await User.findOne({ username });

  if (!user || !bcrypt.compareSync(password, user.password)) {
    return res.status(401).json({ error: "Invalid Credentials" });
  }

  const token = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, { expiresIn: "1h" });
  res.json({ token });
});

// ✅ Upload File to Cloudinary
app.post("/upload", ensureAuthenticated, upload.single("file"), async (req, res) => {
  try {
    const file = req.file;
    if (!file) return res.status(400).json({ error: "No file uploaded" });

    const result = await cloudinary.uploader.upload_stream({ resource_type: "auto" }, (error, result) => {
      if (error) return res.status(500).json({ error: "Upload failed" });
      res.json({ url: result.secure_url, public_id: result.public_id });
    }).end(file.buffer);
  } catch (error) {
    res.status(500).json({ error: "Error uploading file" });
  }
});

// ✅ List Uploaded Files (Cloudinary)
app.get("/files", async (req, res) => {
  try {
    const result = await cloudinary.api.resources({ type: "upload", prefix: "" });
    res.json(result.resources.map(file => ({ url: file.secure_url, name: file.public_id })));
  } catch (error) {
    res.status(500).json({ error: "Failed to list files" });
  }
});

// ✅ Secure Route Example (Only for Admin)
app.get("/admin", ensureAuthenticated, ensureRole("admin"), (req, res) => {
  res.json({ message: "Welcome, Admin!" });
});

// ✅ Default Route
app.get("/", (req, res) => res.sendFile(__dirname + "/public/index.html"));

app.listen(PORT, () => console.log(`File Server running at http://localhost:${PORT}`));
