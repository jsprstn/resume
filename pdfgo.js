const puppeteer = require('puppeteer');
const readline = require('readline');

// Create an interface for user input (filename)
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

(async () => {
    const browser = await puppeteer.launch({
        headless: false, // Allow preview
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage'
        ],
        defaultViewport: null // Prevent forced resizing
    });

    const page = await browser.newPage();

    // Load the resume page
    await page.goto('https://jsprstn.github.io/resume/', {
        waitUntil: 'networkidle2'
    });

    // Ensure fonts are fully loaded before rendering
    await page.evaluateHandle('document.fonts.ready');

    // Extract computed background color
    const bgColor = await page.evaluate(() => {
        return window.getComputedStyle(document.body).backgroundColor;
    });

    console.log(`Detected background color: ${bgColor}`);

    // Get bounding box for true content size
    const contentRect = await page.evaluate(() => {
        const body = document.body;
        const html = document.documentElement;
        return {
            width: Math.round(body.scrollWidth),
            height: Math.round(html.getBoundingClientRect().bottom) // Ensure we capture all elements
        };
    });

    console.log(`Detected content size: Width = ${contentRect.width}px, Height = ${contentRect.height}px`);

    // Convert pixels to millimeters (1px ≈ 0.264583mm)
    const widthMM = Math.round(contentRect.width * 0.264583);
    const heightMM = Math.round(contentRect.height * 0.264583);

    console.log(`Adjusted print size: Width = ${widthMM}mm, Height = ${heightMM}mm`);

    // Ensure all links remain clickable
    await page.evaluate(() => {
        document.querySelectorAll('a').forEach(link => {
            link.style.color = '#0077cc';  // Standard link color
            link.style.textDecoration = 'underline'; 
            link.setAttribute('target', '_blank'); // Ensure links open in new tab
        });
    });

    // Set viewport **with proper aspect ratio centering**
    await page.setViewport({
        width: contentRect.width + 40, // Add small buffer for even spacing
        height: contentRect.height
    });

    // Inject CSS to enforce balanced margins & prevent overflow
    await page.addStyleTag({ content: `
        @media print {
            html, body {
                background: ${bgColor} !important;
                color: inherit !important;
                margin: auto !important;
                padding: 0 !important;
                box-shadow: none !important;
                border: none !important;
                height: ${contentRect.height}px !important;
                width: ${contentRect.width}px !important;
                overflow: hidden !important;
                display: flex !important;
                align-items: center !important;
                justify-content: center !important;
            }
            * {
                background-color: inherit !important;
            }
            @page {
                size: ${widthMM}mm ${heightMM}mm; /* Force exact dimensions */
                margin: 0;
                background: ${bgColor} !important;
            }
        }
    `});

    // Preview before saving
    console.log("🔍 Preview the page in the browser. Press ENTER when ready to generate the PDF.");
    rl.question('', async () => {
        rl.question('Enter the desired filename (without extension): ', async (filename) => {
            const filePath = `${filename}.pdf`;

            await page.pdf({
                path: filePath,
                width: `${contentRect.width}px`,
                height: `${contentRect.height}px`, // Proper aspect ratio
                printBackground: true,
                scale: 1,
                margin: { top: '12mm', right: '12mm', bottom: '12mm', left: '12mm' },
                preferCSSPageSize: true, // Fully override auto-layout
                clip: { x: 0, y: 0, width: contentRect.width, height: contentRect.height } // Ensure no excess
            });

            console.log(`✅ Resume PDF successfully created: ${filePath} (Fully centered, no empty pages!)`);

            await browser.close();
            rl.close();
        });
    });

})();
