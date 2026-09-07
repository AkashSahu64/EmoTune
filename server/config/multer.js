const multer = require('multer');
const path = require('path');
const fs = require('fs');

const uploadDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Extensions and MIME types that can execute or be rendered as a document when
// served back from /uploads. Blocking them here is what stops a stored-XSS
// upload; SVG is on the list because it carries script and is never sanitised.
const BLOCKED_EXTENSIONS = new Set([
  '.html', '.htm', '.xhtml', '.shtml', '.svg', '.svgz', '.xml', '.xsl', '.xslt',
  '.js', '.mjs', '.cjs', '.jsx', '.php', '.php3', '.php4', '.php5', '.phtml',
  '.jsp', '.jspx', '.asp', '.aspx', '.cer', '.cgi', '.pl', '.py', '.rb', '.sh',
  '.bash', '.bat', '.cmd', '.com', '.exe', '.dll', '.so', '.msi', '.scr', '.hta',
  '.jar', '.vbs', '.vbe', '.wsf', '.wsh', '.ps1', '.reg', '.lnk', '.url', '.swf',
  '.htaccess', '.htpasswd',
]);

const BLOCKED_MIMES = new Set([
  'text/html', 'application/xhtml+xml', 'image/svg+xml', 'text/xml', 'application/xml',
  'text/javascript', 'application/javascript', 'application/x-javascript',
  'application/x-httpd-php', 'application/x-msdownload', 'application/x-msdos-program',
  'application/x-sh', 'application/x-shockwave-flash', 'application/vnd.microsoft.portable-executable',
  'application/hta', 'application/java-archive',
]);

// The stored filename is generated, and its extension is taken from the client
// name only after it survives the denylist. A missing or hostile extension just
// becomes .bin rather than something the static route would happily execute.
function safeExtension(originalname) {
  const extension = path.extname(String(originalname || '')).toLowerCase();
  if (!extension || extension.length > 12) return '.bin';
  if (!/^\.[a-z0-9]+$/.test(extension)) return '.bin';
  if (BLOCKED_EXTENSIONS.has(extension)) return '.bin';
  return extension;
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, uniqueSuffix + safeExtension(file.originalname));
  },
});

// First gate only. Byte-level signature checks live in mediaValidationService
// and still run for every media upload after multer has written the file.
function rejectActiveContent(req, file, cb) {
  const extension = path.extname(String(file.originalname || '')).toLowerCase();
  const mimetype = String(file.mimetype || '').toLowerCase().split(';')[0].trim();
  if (BLOCKED_EXTENSIONS.has(extension) || BLOCKED_MIMES.has(mimetype)) {
    const error = new Error('This file type is not allowed');
    error.code = 'LIMIT_UNSUPPORTED_FILE';
    return cb(error);
  }
  return cb(null, true);
}

const upload = multer({
  storage,
  fileFilter: rejectActiveContent,
  limits: { fileSize: 100 * 1024 * 1024, files: 10 },
});

// Sticker uploads are our own export plus its thumbnail and layer sources, so
// the field names and sizes are far tighter than the generic attachment route.
const stickerUpload = multer({
  storage,
  fileFilter: rejectActiveContent,
  limits: { fileSize: 20 * 1024 * 1024, files: 14, fields: 20, fieldSize: 1024 * 1024 },
}).fields([
  { name: 'asset', maxCount: 1 },
  { name: 'thumbnail', maxCount: 1 },
  { name: 'objectAssets', maxCount: 12 },
]);

module.exports = upload;
module.exports.upload = upload;
module.exports.stickerUpload = stickerUpload;
module.exports.safeExtension = safeExtension;
module.exports.BLOCKED_EXTENSIONS = BLOCKED_EXTENSIONS;
module.exports.BLOCKED_MIMES = BLOCKED_MIMES;
