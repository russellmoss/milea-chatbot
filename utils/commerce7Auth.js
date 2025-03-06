const axios = require('axios');

// Configure Commerce7 API authentication
const authConfig = {
    headers: {
        'Authorization': `Basic ${Buffer.from(
            process.env.C7_APP_ID + ':' + process.env.C7_SECRET_KEY
        ).toString('base64')}`,
        'Tenant': process.env.C7_TENANT_ID,
        'Content-Type': 'application/json',
    },
};

module.exports = authConfig;
