// config/commerce7.js
require('dotenv').config();

const C7_APP_ID = process.env.C7_APP_ID;
const C7_SECRET_KEY = process.env.C7_SECRET_KEY;
const C7_TENANT_ID = process.env.C7_TENANT_ID;

// Base authentication configuration for Commerce7
const authConfig = {
    auth: {
        username: C7_APP_ID,
        password: C7_SECRET_KEY,
    },
    headers: {
        Tenant: C7_TENANT_ID,
        "Content-Type": "application/json",
    },
};

module.exports = {
    C7_APP_ID,
    C7_SECRET_KEY,
    C7_TENANT_ID,
    authConfig
};
