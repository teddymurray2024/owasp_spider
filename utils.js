const axios = require('axios');
require('dotenv').config();

async function analyzeContent(content, type) {
    const prompt = `Analyze the following ${type} response for vulnerabilities:\n${content}`;

    try {
        const response = await axios.post('https://api.openai.com/v1/completions', {
            model: "gpt-3.5-turbo",
            prompt: prompt,
            max_tokens: 200
        }, {
            headers: {
                'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
                'Content-Type': 'application/json'
            }
        });

        return response.data.choices[0].text.trim();

    } catch (error) {
        console.error(`Error analyzing content: ${error.message}`);
        return "Analysis failed.";
    }
}

module.exports = { analyzeContent };
