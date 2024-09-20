const axios = require('axios');
require('dotenv').config();

async function generateAdvancedPayloads() {
    const payloads = [];
    const prompt = "Generate OWASP top 10 payloads for SQL Injection, XSS, and CSRF. Do not use Titles for sections. Display each payload on each line without numbers or bullet points. Do not display any extra information besides the payload itself.";

    try {
        const response = await axios.post('https://api.openai.com/v1/completions', {
            model: "gpt-3.5-turbo",
            prompt: prompt,
            max_tokens: 100,
            n: 5
        }, {
            headers: {
                'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
                'Content-Type': 'application/json'
            }
        });

        response.data.choices.forEach(choice => {
            payloads.push(choice.text.trim());
        });

    } catch (error) {
        console.error(`Error generating payloads: ${error.message}`);
    }

    return payloads;
}

module.exports = { generateAdvancedPayloads };
