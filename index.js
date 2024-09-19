const puppeteer = require('puppeteer-core');
const fs = require('fs');
const path = require('path');
const PDFDocument = require('pdfkit');
const dotenv = require('dotenv');
const colors = require('colors');

dotenv.config();
const { generateAdvancedPayloads } = require('./payloads');
const { analyzeContent } = require('./utils');
const config = require('./config.json');

const screenshotsDir = path.join(__dirname, 'screenshots');
const vulnerabilities = [];

if (!fs.existsSync(screenshotsDir)) {
    fs.mkdirSync(screenshotsDir, { recursive: true });
}

function isValidUrl(urlString) {
    try {
        new URL(urlString);
        return true;
    } catch (_) {
        return false;
    }
}

async function setupBrowser() {
    const options = {
        headless: config.headless,
        executablePath: path.join(process.env.HOME, '.local/share/puppeteer/chrome/chrome'),
        args: config.proxy ? [`--proxy-server=${config.proxy}`] : []
    };
    return puppeteer.launch(options);
}

async function exposeSaveVideoFunction(page) {
    await page.exposeFunction('saveVideo', async (blob) => {
        const buffer = Buffer.from(await blob.arrayBuffer());
        fs.writeFileSync(page.videoPath, buffer);
    });
}

async function recordVideo(page, type) {
    const videoPath = path.join(screenshotsDir, `${type}.webm`);
    page.videoPath = videoPath;
    await exposeSaveVideoFunction(page);

    await page.evaluate(() => {
        const stream = document.createElement('canvas').captureStream();
        window.stream = stream;
        window.recorder = new MediaRecorder(stream);
        const chunks = [];
        window.recorder.ondataavailable = event => chunks.push(event.data);
        window.recorder.onstop = async () => {
            const blob = new Blob(chunks, { type: 'video/webm' });
            await window.saveVideo(blob);
        };
        window.recorder.start();
    });

    return videoPath;
}

async function stopVideoRecording(page) {
    await page.evaluate(() => {
        if (window.recorder) {
            window.recorder.stop();
        } else {
            console.error("Recorder is not initialized.");
        }
    });
}

async function loadPage(page, url) {
    try {
        await page.setCookie(...config.cookies);
        await page.goto(url, { waitUntil: 'networkidle0', timeout: config.timeout });
        console.log(`Navigated to ${url}`);
    } catch (error) {
        console.error(colors.red(`Error loading ${url}: ${error.message}`));
    }
}

async function takeScreenshot(page, type, param) {
    const filename = `screenshot_${type}_${param}_${Date.now()}.png`;
    await page.screenshot({ path: path.join(screenshotsDir, filename), fullPage: true });
    console.log(`Screenshot saved: ${filename}`);
}

async function testUrlWithPayloads(url, param, type, payloads, page) {
    const results = [];
    const videoPath = await recordVideo(page, type);
    for (const payload of payloads) {
        console.log(colors.cyan(`Attempting payload: ${payload}`));
        const testUrl = new URL(url);
        testUrl.searchParams.set(param, encodeURIComponent(payload));
        try {
            await page.goto(testUrl.toString(), { waitUntil: 'networkidle0', timeout: 10000 });
            const htmlContent = await page.content();
            const aiResult = await analyzeContent(htmlContent, type);

            const result = {
                baseUrl: url,
                param: param,
                type: type,
                payload: payload,
                htmlResponse: htmlContent.substring(0, 2000),
                aiAnalysis: aiResult,
                success: aiResult.includes("vulnerable")
            };

            results.push(result);

            if (result.success) {
                vulnerabilities.push(result);
            }

            if (process.argv.includes('--screenshot')) {
                const filename = `screenshot_${type}_${param}_${Buffer.from(payload).toString('base64')}.png`;
                await page.screenshot({ path: path.join(screenshotsDir, filename), fullPage: true });
                console.log(`Screenshot saved: ${filename}`);
            }

        } catch (error) {
            console.error(colors.red(`Error navigating to ${testUrl.toString()}: ${error.message}`));
            results.push({
                baseUrl: url,
                param: param,
                type: type,
                payload: payload,
                error: `Navigation failed: ${error.message}`,
                success: false
            });
        }
    }
    await stopVideoRecording(page);
    console.log(colors.green(`Video recorded: ${videoPath}`));
    return results;
}

async function testGetVariables(url, page) {
    const params = await page.evaluate(() => {
        const links = Array.from(document.querySelectorAll('a[href]'));
        return links.map(link => new URL(link.href, document.baseURI).searchParams).flatMap(params => Array.from(params.keys()));
    });

    for (const param of params) {
        const payloads = await generateAdvancedPayloads();
        vulnerabilities.push(...await testUrlWithPayloads(url, param, 'GET_Parameter', payloads, page));
    }
}

async function testPostFormsWithPayloads(page, payloads) {
    const forms = await page.evaluate(() => {
        return Array.from(document.forms)
            .filter(form => form.method.toLowerCase() === 'post' || form.method === '')
            .map(form => ({
                action: form.action || window.location.href,
                params: Array.from(form.elements)
                    .filter(el => el.name && !el.disabled)
                    .map(el => ({
                        name: el.name,
                        value: el.value,
                        type: el.type
                    }))
            }));
    });

    for (const form of forms) {
        for (const payload of payloads) {
            const updatedParams = form.params.map(param => ({
                ...param,
                value: param.type === 'password' ? param.value : payload
            }));

            console.log(colors.cyan(`Attempting payload: ${payload} on form: ${form.action}`));

            try {
                await page.goto(form.action, { waitUntil: 'networkidle0' });
                await page.evaluate((formDetails, updatedParams) => {
                    const form = document.createElement('form');
                    form.method = 'post';
                    form.action = formDetails.action;
                    document.body.appendChild(form);

                    updatedParams.forEach(param => {
                        const input = document.createElement('input');
                        input.type = 'hidden';
                        input.name = param.name;
                        input.value = param.value;
                        form.appendChild(input);
                    });

                    form.submit();
                }, form, updatedParams);

                vulnerabilities.push({
                    type: 'POST Parameter',
                    baseUrl: form.action,
                    payload: JSON.stringify(updatedParams),
                    success: true
                });

                if (process.argv.includes('--screenshot')) {
                    const filename = `screenshot_post_${Buffer.from(payload).toString('base64')}.png`;
                    await page.screenshot({ path: path.join(screenshotsDir, filename), fullPage: true });
                    console.log(colors.magenta(`Screenshot saved: ${filename}`));
                }

            } catch (error) {
                console.error(colors.red(`Error submitting form at ${form.action}: ${error.message}`));
            }
        }
    }
}
