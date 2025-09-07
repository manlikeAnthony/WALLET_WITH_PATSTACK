const dotenv = require("dotenv");
dotenv.config();

const CONFIG = {
  PORT: process.env.PORT || 5000,
  MONGO_URL: process.env.MONGO_URL || "mongodb://127.0.0.1:27017/food-ordering",
  JWT_CREDENTIAL: {
    secret: process.env.JWT_SECRET || "default_secret",
    lifetime: process.env.JWT_LIFETIME || "30d",
  },
  EMAIL: {
    USER: process.env.EMAIL_USER || "",
    PASS: process.env.EMAIL_PASS || "",
  },
  PAYSTACK: {
    SECRET_KEY: process.env.PAYSTACK_SECRET_KEY,
  },
  URL: {
    BASE_URL: process.env.BASE_URL,
  },
};

module.exports = CONFIG;
