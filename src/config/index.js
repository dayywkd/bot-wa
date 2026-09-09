const path = require('path');
require('dotenv').config();

const config = {
  port: parseInt(process.env.PORT, 10) || 3000,
  secretKey: process.env.SECRET_KEY || 'kopi9_wa_secret_2026',
  sessionDir: path.resolve(process.cwd(), process.env.SESSION_DIR || './session'),
  botPhone: process.env.BOT_PHONE || '6281952538106',
  ownerPhone: process.env.OWNER_PHONE || '628132869806',
  storeApiUrl: process.env.STORE_API_URL || 'http://127.0.0.1:8000',
  storeApiKey: process.env.STORE_API_KEY || 'kopi9_wa_secret_2026',
};




module.exports = config;
