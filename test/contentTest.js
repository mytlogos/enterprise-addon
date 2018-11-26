const puppeteer = require("puppeteer");
const fs = require("fs");
const path = require("path");

let dataDir = path.join(path.dirname(__dirname), "example_data");
let testData = fs.readdirSync(dataDir, {withFileTypes: true}).map(name => path.join(dataDir, name)).filter(value => value.endsWith(".html"));
testAll().catch(console.log);

async function testAll() {
    const chromium = await puppeteer.launch({headless: true});

    let promises = testData.map(data =>
            testPage(chromium, data)
                .then(() => console.log("no error for ", data))
        // .catch(error => console.log(data, " invalid!\n", error))
    );
    await Promise.all(promises)
}

async function testSingle(file) {
    const chromium = await puppeteer.launch();
    await testPage(chromium, file)
}

async function testPage(chromium, file) {
    const page = await chromium.newPage();
    await page.goto("file://" + file);
    await page.addScriptTag({path: "./content/initializer.js"});
    await page.addScriptTag({path: "./content/analyzer.js"});
    await page.addScriptTag({path: "./test/progressCheckDub.js"});
    await page.addScriptTag({path: "./content/metaExtractor.js"});
    await page.addScriptTag({path: "./content/overWatch.js"});

    let result = await page.evaluate(function () {
        return OverWatch.start();
    }).catch(error => console.log(file, ": ", error));
    console.log(result, file);
}

