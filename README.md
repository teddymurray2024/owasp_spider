Here’s a `README.md` file for your **OWASP Crawler** project:

---

# OWASP Crawler

OWASP Crawler is an automated web vulnerability testing tool that leverages **Puppeteer** and **OpenAI** to test for vulnerabilities in web applications. It simulates attacks using payloads generated based on the OWASP Top 10 and analyzes HTML responses for potential vulnerabilities.

## Features

- **Automated Web Crawler**: Uses Puppeteer to navigate web pages and test GET and POST requests.
- **Advanced Payload Injection**: Generates payloads using OpenAI to test for SQL Injection, XSS, CSRF, and more.
- **Content Analysis**: Analyzes responses for vulnerabilities using AI-powered analysis.
- **Screenshot & Video Recording**: Captures screenshots and records videos of vulnerabilities for detailed inspection.
- **Configurable**: Customize proxy, cookies, and more using the `config.json` file.
- **PDF Reports**: Generates PDF reports that summarize the vulnerabilities discovered during the scan.

## Prerequisites

Before running this tool, ensure you have the following installed:

- **Node.js** (v14 or higher)
- **npm** or **yarn**
- A valid **OpenAI API key**

## Installation

1. Clone the repository:

   ```bash
   git clone https://github.com/yourusername/owasp-crawler.git
   cd owasp-crawler
   ```

2. Install dependencies:

   ```bash
   npm install
   ```

3. Create a `.env` file for sensitive environment variables:

   ```bash
   touch .env
   ```

   Add your OpenAI API key to the `.env` file:

   ```
   OPENAI_API_KEY=your-openai-api-key-here
   ```

4. (Optional) Configure the tool by modifying the `config.json` file. You can set options such as proxy, cookies, and whether to run the tool in headless mode.

## Configuration

- **`config.json`**: Customize your scan settings here.

  ```json
  {
    "headless": true,
    "timeout": 30000,
    "proxy": null,
    "cookies": [],
    "screenshot": true
  }
  ```

- **`OPENAI_API_KEY`**: Set your OpenAI API key in the `.env` file to generate payloads and analyze content.

## Usage

### Running the OWASP Crawler

To start scanning a target website, run the following command:

```bash
node index.js https://target-website.com
```

### Command-line Options

- **`--screenshot`**: Save screenshots of test results.
- **`--headless=false`**: Run the crawler in non-headless mode for debugging.

### Example

To scan `https://example.com` with screenshots enabled, run:

```bash
node index.js https://example.com --screenshot
```

### Output

- **Screenshots**: Saved in the `screenshots/` folder.
- **PDF Reports**: Generated in the root directory.
- **Console Output**: Displays vulnerabilities found and analysis results.

## How it Works

1. **Crawling & Testing**: Puppeteer visits the target URL and extracts GET/POST parameters and forms.
2. **Payload Injection**: Injects OWASP Top 10 vulnerability payloads generated via OpenAI.
3. **Content Analysis**: Analyzes HTML responses and checks for potential security vulnerabilities.
4. **Screenshots and Videos**: Captures evidence of the vulnerability.
5. **PDF Report**: Generates a detailed report of all vulnerabilities found, including screenshots and analysis.

## Technologies Used

- **Puppeteer**: Automates browser interactions for crawling and payload injection.
- **OpenAI GPT-3.5**: Generates advanced security test payloads and performs content analysis.
- **PDFKit**: Generates PDF reports summarizing vulnerabilities.
- **dotenv**: Manages environment variables like API keys.
- **colors**: Enhances console output for easier debugging.

## Project Structure

```
owasp-crawler/
├── .env                  # Environment variables
├── config.json            # Configuration file
├── index.js               # Main script to run the crawler
├── payloads.js            # Payload generation logic using OpenAI
├── utils.js               # Helper functions like content analysis
├── package.json           # Project metadata and dependencies
├── README.md              # Documentation
└── screenshots/           # Captured screenshots and videos
```

## Known Limitations

- **Android Platform**: Puppeteer is not supported on Android. You will need to run this tool on macOS, Windows, or Linux.
- **OpenAI Limitations**: OpenAI's API usage may incur costs. Be mindful of API quotas.

## Contributing

Contributions are welcome! Please fork the repository, make your changes, and submit a pull request.

## License

This project is licensed under the MIT License.

---

**Happy Hacking!**

---

### Note

Remember to replace placeholder information (such as `your-openai-api-key-here` and repository link) with your actual project details before sharing this README.
