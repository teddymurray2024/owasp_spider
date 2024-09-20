const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');
const { OpenAI } = require('openai');
const PDFDocument = require('pdfkit');
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

// Directory for PDF reports
const reportsDir = path.join(__dirname, 'reports');
if (!fs.existsSync(reportsDir)) {
    fs.mkdirSync(reportsDir, { recursive: true });
}

// Generate OWASP payloads using AI
async function generateAdvancedPayloads() {
    const prompt = `
        Generate OWASP top 10 payloads for SQL Injection, XSS, and CSRF. Display each payload on each line without numbers or bullet points. Do not display any extra information besides the payload itself on each line. No Headers only payloads on each line. Generate 250 payloads.
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
        ${content.substring(0, 1500)}
    `;
    const response = await openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [{ role: "system", content: prompt }],
        max_tokens: 300,
        temperature: 0.7,
    });
    const analysis = response.choices[0].message.content.trim().toLowerCase();

    if (analysis.includes('vulnerability') || analysis.includes('possible exploit')) {
        return true; // Vulnerability detected
    }
    return false; // No vulnerability detected
}

// Generate PDF report for detected vulnerabilities
function generatePDFReport(vulnerabilities) {
    const doc = new PDFDocument();
    const reportPath = path.join(reportsDir, `vulnerability_report_${Date.now()}.pdf`);

    doc.pipe(fs.createWriteStream(reportPath));

    // Title
    doc.fontSize(18).text('HackerOne Vulnerability Report', { align: 'center' });
    doc.moveDown();

    // Basic Info
    doc.fontSize(12).text('This report contains the details of vulnerabilities detected during testing.');
    doc.moveDown();

    vulnerabilities.forEach((vuln, index) => {
        // Vulnerability Title
        doc.fontSize(16).text(`Vulnerability ${index + 1}: ${vuln.payload}`, { underline: true });
        doc.moveDown();

        // Summary
        doc.fontSize(12).text('Summary:');
        doc.text(`A vulnerability was detected using the payload "${vuln.payload}" on the URL "${vuln.url}".`);
        doc.moveDown();

        // Steps to Reproduce
        doc.text('Steps to Reproduce:');
        doc.text('1. Navigate to the target URL.');
        doc.text(`2. Inject the payload "${vuln.payload}" into the vulnerable parameter.`);
        doc.text('3. Observe the page behavior and the effect of the payload.');
        doc.moveDown();

        // Vulnerable URL
        doc.text(`Vulnerable URL: ${vuln.url}`);
        doc.moveDown();

        // Recommendations
        doc.text('Recommendations:');
        doc.text('Sanitize user inputs to prevent injection of untrusted data.');
        doc.moveDown();

        // Severity
        doc.text(`Severity: ${vuln.severity}`);
        doc.moveDown();
        doc.moveDown();
    });

    doc.end();
    console.log(colors.green(`PDF report saved: ${reportPath}`));
}

// Test URL with payloads
async function testUrlWithPayloads(url, payloads, page) {
    const vulnerabilities = [];

    for (const payload of payloads) {
        console.log(colors.cyan(`Attempting payload: ${payload}`));
        const testUrl = new URL(url);
        testUrl.searchParams.set('payload', encodeURIComponent(payload));

        try {
            await page.goto(testUrl.toString(), { waitUntil: 'networkidle0', timeout: 10000 });
            const htmlContent = await page.content();
            const isVulnerable = await analyzeContentWithAI(htmlContent);

            if (isVulnerable) {
                console.log(colors.green(`Vulnerability detected with payload: ${payload}`));
                vulnerabilities.push({
                    url: testUrl.toString(),
                    payload,
                    severity: 'Medium', // Adjust severity based on the type of vulnerability
                });

                // Screenshot if needed
                if (process.argv.includes('--screenshot')) {
                    const filename = `screenshot_${Date.now()}.png`;
                    await page.screenshot({ path: path.join(screenshotsDir, filename), fullPage: true });
                    console.log(`Screenshot saved: ${filename}`);
                }
            } else {
                console.log(colors.yellow(`No vulnerability detected with payload: ${payload}`));
            }

        } catch (error) {
            console.error(colors.red(`Error navigating to ${testUrl.toString()}: ${error.message}`));
        }
    }

    // Generate the PDF report if vulnerabilities were found
    if (vulnerabilities.length > 0) {
        generatePDFReport(vulnerabilities);
    } else {
        console.log(colors.red('No vulnerabilities detected. No report generated.'));
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
