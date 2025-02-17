const puppeteer = require('puppeteer');
const readline = require('readline');

// User input for filename & margin ratio
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

(async () => {
    const browser = await puppeteer.launch({
        headless: true,
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage'
        ]
    });

    const page = await browser.newPage();
    await page.goto('https://jsprstn.github.io/resume/', {
        waitUntil: 'networkidle2'
    });

    // Ensure fonts are loaded
    await page.evaluateHandle('document.fonts.ready');

    // Detect computed background color
    const bgColor = await page.evaluate(() => {
        return window.getComputedStyle(document.body).backgroundColor;
    });

    console.log(`Detected background color: ${bgColor}`);

    // Detect true content size
    const contentRect = await page.evaluate(() => {
        return {
            width: Math.round(document.body.scrollWidth),
            height: Math.round(document.documentElement.scrollHeight)
        };
    });

    console.log(`Detected content size: Width = ${contentRect.width}px, Height = ${contentRect.height}px`);

    // Convert pixels to mm (1px ≈ 0.264583mm)
    const widthMM = Math.round(contentRect.width * 0.264583);
    const heightMM = Math.round(contentRect.height * 0.264583);

    // Prompt for margin ratio
    rl.question('Enter the desired margin ratio (Top/Bottom : Left/Right, e.g., "2:1" for twice the top/bottom margin): ', async (ratio) => {
        const [tbRatio, lrRatio] = ratio.split(':').map(Number);
        
        if (isNaN(tbRatio) || isNaN(lrRatio) || tbRatio <= 0 || lrRatio <= 0) {
            console.log("⚠️ Invalid ratio input. Defaulting to 1:1.");
            tbRatio = 1;
            lrRatio = 1;
        }

        // Compute proportional margins
        const baseMargin = 5; // Base margin in mm
        const topBottomMargin = baseMargin * tbRatio;
        const leftRightMargin = baseMargin * lrRatio;

        console.log(`Using Margins: Top/Bottom = ${topBottomMargin}mm, Left/Right = ${leftRightMargin}mm`);

        // Ensure links remain clickable
        await page.evaluate(() => {
            document.querySelectorAll('a').forEach(link => {
                link.style.color = '#0077cc';
                link.style.textDecoration = 'underline';
                link.setAttribute('target', '_blank');
            });
        });

        // Apply custom print styles
        await page.addStyleTag({ content: `
            @media print {
                html, body {
                    background: ${bgColor} !important;
                    color: inherit !important;
                    margin: 0 !important;
                    padding: 0 !important;
                    width: ${widthMM}mm !important;
                    height: ${heightMM}mm !important;
                    display: flex !important;
                    align-items: center !important;
                    justify-content: center !important;
                }
                * {
                    background-color: inherit !important;
                }
                @page {
                    size: ${widthMM}mm ${heightMM}mm;
                    margin: ${topBottomMargin}mm ${leftRightMargin}mm;
                    background: ${bgColor} !important;
                }
            }
        `});

        // Ask for filename
        rl.question('Enter the desired filename (without extension): ', async (filename) => {
            const filePath = `${filename}.pdf`;

            // Generate PDF
            await page.pdf({
                path: filePath,
                width: `${widthMM}mm`,
                height: `${heightMM}mm`,
                printBackground: true,
                margin: { top: `${topBottomMargin}mm`, right: `${leftRightMargin}mm`, bottom: `${topBottomMargin}mm`, left: `${leftRightMargin}mm` },
                scale: 1,
                preferCSSPageSize: true
            });

            console.log(`✅ PDF successfully created: ${filePath} (with margin ratio ${tbRatio}:${lrRatio})`);

            await browser.close();
            rl.close();
        });
    });

})();
