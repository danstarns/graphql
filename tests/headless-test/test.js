const path = require("path");
const fs = require("fs");
const puppeteer = require("puppeteer");
const bundlePath = path.join(__dirname, "./browser/dist/index.js");
const assert = require("assert");
const { parse } = require("graphql");

async function main() {
    console.log("starting test");

    const bundle = await fs.promises.readFile(bundlePath);

    const html = `
        <!DOCTYPE html>
        <html lang="en">
            <head>
                <meta charset="UTF-8" />
                <meta http-equiv="X-UA-Compatible" content="IE=edge" />
                <meta name="viewport" content="width=device-width, initial-scale=1.0" />
                <title>Document</title>
            </head>
            <body>
                <p id="test-element"></p>
            </body>

            <script>
                ${bundle}
            </script>
        </html>
    `;

    const browser = await puppeteer.launch({ headless: false });

    const page = await browser.newPage();

    await page.setContent(html, {
        waitUntil: "networkidle2",
    });

    const element = await page.waitForSelector("#test-element");
    const browserGeneratedPrinted = await element.evaluate((el) => el.textContent);

    await page.waitFor(2000);
    const documentNode = parse(browserGeneratedPrinted);
    const query = documentNode.definitions.find((x) => x.kind === "ObjectTypeDefinition" && x.name.value === "Query");
    const usersAggregateField = query.fields.find(
        (x) => x.kind === "FieldDefinition" && x.name.value === "usersAggregate"
    );

    assert.ok(usersAggregateField, "browser should generate schema");

    await browser.close();

    console.log("test complete");
}

main();
