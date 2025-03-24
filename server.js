const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const OAuth2Server = require('oauth2-server');
const Request = OAuth2Server.Request;
const Response = OAuth2Server.Response;
const soap = require('soap');

const app = express();
const PORT = process.env.PORT || 10000;

// Enable CORS (Restrict to frontend domain)
app.use(cors({
  origin: ['https://your-frontend-domain.com'],
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Apply security headers
app.use(helmet());

// Custom security headers
app.use((req, res, next) => {
  res.setHeader('Content-Security-Policy', "default-src 'self'");
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  next();
});

// OAuth 2.0 Authentication Setup
const oauth = new OAuth2Server({
  model: require('./authModel'),
  grants: ['password'],
  accessTokenLifetime: 3600
});

// Token generation endpoint
app.post('/auth/token', express.json(), (req, res) => {
  const request = new Request(req);
  const response = new Response(res);
  
  oauth.token(request, response)
    .then(token => res.json(token))
    .catch(err => res.status(500).json(err));
});

// Middleware for authentication
const authenticate = (req, res, next) => {
  const request = new Request(req);
  const response = new Response(res);

  oauth.authenticate(request, response)
    .then((token) => {
      req.user = token.user; // Attach user to request
      next();
    })
    .catch(err => res.status(401).json(err));
};

// Role-Based Access Control (RBAC)
const checkRole = (role) => (req, res, next) => {
  if (!req.user || req.user.role !== role) {
    return res.status(403).json({ message: 'Forbidden' });
  }
  next();
};

// File Upload Setup (Allow only certain extensions)
const allowedExtensions = ['.png', '.jpg', '.pdf', '.txt'];
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (!allowedExtensions.includes(ext)) {
      return cb(new Error('File type not allowed'), false);
    }
    cb(null, file.fieldname + '-' + Date.now() + ext);
  }
});

const upload = multer({ storage });

// File Upload Route (Only Admins can upload)
app.post('/upload', authenticate, checkRole('admin'), upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ message: 'No file uploaded' });
  res.json({ message: 'File uploaded successfully', filename: req.file.filename });
});

// List Files Route (Accessible to all authenticated users)
app.get('/files', authenticate, (req, res) => {
  fs.readdir('uploads/', (err, files) => {
    if (err) return res.status(500).json({ error: 'Error reading files' });
    res.json({ files });
  });
});

// File Download Route (Accessible to all authenticated users)
app.get('/files/:filename', authenticate, (req, res) => {
  const filePath = path.join(__dirname, 'uploads', req.params.filename);
  if (!fs.existsSync(filePath)) return res.status(404).json({ error: 'File not found' });
  res.download(filePath);
});

// Secure SOAP Service Setup
const soapService = {
  FileService: {
    FilePort: {
      UploadFile: (args, callback) => {
        if (args.authToken !== 'secure-token') {
          return callback({ error: 'Unauthorized' });
        }
        callback(null, { message: 'File uploaded securely' });
      }
    }
  }
};

const wsdlXml = fs.readFileSync('fileService.wsdl', 'utf8');
app.use('/wsdl', (req, res) => res.send(wsdlXml));
soap.listen(app, '/soap', soapService, wsdlXml);

// Start Server
app.listen(PORT, () => {
  console.log(`File Server running at http://localhost:${PORT}`);
});
