const path = require('path');
require('dotenv').config();

const config = {
  port: parseInt(process.env.PORT, 10) || 3000,
  secretKey: process.env.SECRET_KEY || 'kopi9_wa_secret_2026',
  sessionDir: path.resolve(process.cwd(), process.env.SESSION_DIR || './session'),
  botPhone: process.env.BOT_PHONE || '6285855180131',
  ownerPhone: process.env.OWNER_PHONE || '628132869806',
};


module.exports = config;
