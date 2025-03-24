require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const OAuth2Server = require('oauth2-server');
const bodyParser = require('body-parser');
const authModel = require('./authModel'); // Ensure authModel.js exists

const app = express();
const PORT = process.env.PORT || 10000;

// 🛑 Security Headers & CORS
app.use(helmet());
app.use(cors({ origin: '*' })); // Allow all origins (Modify for production)
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// 🛑 OAuth2 Authentication Setup
const oauth = new OAuth2Server({
  model: authModel,
  grants: ['password'],
  accessTokenLifetime: 3600
});

// 🔐 Authentication Middleware
const authenticateRequest = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token || !authModel.getAccessToken(token, (err, data) => !data)) {
    return res.status(401).json({ error: 'Unauthorized access' });
  }
  req.user = authModel.getAccessToken(token, (err, data) => data.user);
  next();
};

// 📂 Multer Configuration for File Upload
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, 'uploads');
    if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir);
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + '-' + file.originalname);
  }
});
const upload = multer({ storage });

// 📤 Upload File (Admin Only)
app.post('/upload', authenticateRequest, upload.single('file'), (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Access denied' });
  res.json({ message: 'File uploaded successfully', fileName: req.file.filename });
});

// 📂 List Files
app.get('/files', authenticateRequest, (req, res) => {
  const directoryPath = path.join(__dirname, 'uploads');
  fs.readdir(directoryPath, (err, files) => {
    if (err) return res.status(500).json({ error: 'Error listing files' });
    res.json({ files });
  });
});

// 📥 Download File
app.get('/download/:filename', authenticateRequest, (req, res) => {
  const filePath = path.join(__dirname, 'uploads', req.params.filename);
  if (fs.existsSync(filePath)) {
    res.download(filePath);
  } else {
    res.status(404).json({ error: 'File not found' });
  }
});

// 🌍 Open File in Browser
app.get('/open/:filename', authenticateRequest, (req, res) => {
  const filePath = path.join(__dirname, 'uploads', req.params.filename);
  if (fs.existsSync(filePath)) {
    res.sendFile(filePath);
  } else {
    res.status(404).json({ error: 'File not found' });
  }
});

// 🔑 OAuth 2.0 Token Generation
app.post('/auth/token', (req, res) => {
  req.body.grant_type = 'password';
  oauth.token(req, res).then((token) => {
    res.json(token);
  }).catch((err) => {
    res.status(400).json({ error: err.message });
  });
});

// 🚀 Start Server
app.listen(PORT, () => console.log(`✅ File Server running at http://localhost:${PORT}`));
