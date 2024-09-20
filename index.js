const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');
const { OpenAI } = require('openai');
require('dotenv').config();
const colors = require('colors');

// OpenAI client setup
const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

// Directory for screenshots
const screenshotsDir = path.join(__dirname, 'screenshots');

if (!fs.existsSync(screenshotsDir)) {
    fs.mkdirSync(screenshotsDir, { recursive: true });
}

// Generate OWASP payloads using AI
async function generateAdvancedPayloads() {
    const prompt = `
        Generate OWASP top 10 payloads for SQL Injection, XSS, and CSRF. Display each payload on each line without numbers or bullet points. Do not display any extra information besides the payload itself on each line. No Headers only payloads on each line.
    `;
    const response = await openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [{ role: "system", content: prompt }],
        max_tokens: 150,
        temperature: 0.7,
    });
    return response.choices[0].message.content.trim().split('\n').filter(Boolean);
}

// Analyze HTML content for vulnerabilities using AI
async function analyzeContentWithAI(content) {
    const prompt = `
        Analyze the following HTML content for potential vulnerabilities:
        ${content.substring(0,1500)}
    `;
    const response = await openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [{ role: "system", content: prompt }],
        max_tokens: 300,
        temperature: 0.7,
    });
    const analysis = response.choices[0].message.content.trim().toLowerCase();

    // Determine if the content suggests a vulnerability
    if (analysis.includes('vulnerability') || analysis.includes('possible exploit')) {
        return true; // Vulnerability detected
    }
    return false; // No vulnerability detected
}

// Test URL with payloads
async function testUrlWithPayloads(url, payloads, page) {
    for (const payload of payloads) {
        console.log(colors.cyan(`Attempting payload: ${payload}`));
        const testUrl = new URL(url);
        testUrl.searchParams.set('payload', encodeURIComponent(payload));
        try {
            await page.goto(testUrl.toString(), { waitUntil: 'networkidle0', timeout: 10000 });
            const htmlContent = await page.content();
            const isVulnerable = await analyzeContentWithAI(htmlContent);
            console.log(colors.green(`Vulnerability detected: ${isVulnerable}`));

            // Screenshot if needed
            if (process.argv.includes('--screenshot')) {
                const filename = `screenshot_${Date.now()}.png`;
                await page.screenshot({ path: path.join(screenshotsDir, filename), fullPage: true });
                console.log(`Screenshot saved: ${filename}`);
            }

        } catch (error) {
            console.error(colors.red(`Error navigating to ${testUrl.toString()}: ${error.message}`));
        }
    }
}

// Main function to crawl and test the provided URL
async function crawlAndTest(url) {
    const browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();
    await page.goto(url, { waitUntil: 'networkidle0' });

    const payloads = await generateAdvancedPayloads();
    await testUrlWithPayloads(url, payloads, page);

    await page.close();
    await browser.close();
}

// Command line execution
(async () => {
    const url = process.argv[2];
    if (!url) {
        console.error(colors.red('Please provide a valid URL.'));
        process.exit(1);
    }
    
    console.log(colors.green(`Launching Puppeteer and crawling: ${url}`));
    await crawlAndTest(url);
})();
