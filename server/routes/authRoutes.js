// Compatibility export. Authentication is implemented exclusively by the
// identity module; this file remains for imports from older integrations.
module.exports = require('../identity/routes/authRoutes');
