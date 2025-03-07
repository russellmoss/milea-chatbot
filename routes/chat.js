// routes/chat.js
const express = require('express');
const router = express.Router();
const openai = require('../config/openai');
const logger = require('../utils/logger');

router.post("/", async (req, res) => {
    try {
        const { message } = req.body;
        logger.info("Processing chat request:", message);
        
        const response = await openai.chat.completions.create({
            model: "gpt-4",
            messages: [{ role: "user", content: message }],
        });
        
        res.json({ response: response.choices[0].message.content });
    } catch (error) {
        logger.error("OpenAI API Error:", error);
        res.status(500).json({ error: "Error processing request" });
    }
});

module.exports = router;