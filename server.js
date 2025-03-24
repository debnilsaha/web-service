require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const multer = require('multer');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const cloudinary = require('cloudinary').v2;
const OAuth2Server = require('oauth2-server');
const bodyParser = require('body-parser');
const authModel = require('./authModel'); // Ensure authModel.js exists

const app = express();
const PORT = process.env.PORT || 10000;

// 🛑 Security Headers & CORS
app.use(helmet());
app.use(cors({ origin: '*' }));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// 🛑 Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// 📂 Multer Storage Setup for Cloudinary
const storage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: 'file-server', // Folder in Cloudinary
    resource_type: 'auto' // Supports all file types
  }
});
const upload = multer({ storage });

// 🔑 OAuth2 Authentication Setup
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

// 📤 Upload File to Cloudinary (Admin Only)
app.post('/upload', authenticateRequest, upload.single('file'), (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Access denied' });
  res.json({
    message: 'File uploaded successfully',
    fileUrl: req.file.path
  });
});

// 📂 List Files from Cloudinary
app.get('/files', authenticateRequest, async (req, res) => {
  try {
    const { resources } = await cloudinary.search.expression('folder:file-server').execute();
    const files = resources.map((file) => ({
      filename: file.public_id,
      url: file.secure_url
    }));
    res.json({ files });
  } catch (err) {
    res.status(500).json({ error: 'Error listing files' });
  }
});

// 📥 Download File from Cloudinary
app.get('/download/:filename', authenticateRequest, async (req, res) => {
  try {
    const file = await cloudinary.api.resource(req.params.filename);
    res.redirect(file.secure_url);
  } catch (err) {
    res.status(404).json({ error: 'File not found' });
  }
});

// 🌍 Open File in Browser (Direct Cloudinary URL)
app.get('/open/:filename', authenticateRequest, async (req, res) => {
  try {
    const file = await cloudinary.api.resource(req.params.filename);
    res.send(`<h2>File Preview</h2><a href="${file.secure_url}" target="_blank">${file.secure_url}</a>`);
  } catch (err) {
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

// 🌍 Default Route for Homepage
app.get('/', (req, res) => {
  res.send('<h1>Welcome to the Cloud File Server</h1><p>Use API endpoints to upload, list, download, and open files.</p>');
});

// 🚀 Start Server
app.listen(PORT, () => console.log(`✅ Cloud File Server running at http://localhost:${PORT}`));
