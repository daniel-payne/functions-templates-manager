const chokidar = require('chokidar');
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs-extra');

const watchCollectDir = path.join(__dirname, 'src');

const extractScript = path.join(__dirname, 'functions-templates-extract.js');
const collectScript = path.join(__dirname, 'functions-templates-collect.js');

let extractArgs = ''
let collectArgs = ''

const namedArguments = extractNamedArguments()

const defaultFile = './flows.json';
const defaultUrl = 'http://127.0.0.1:1880'

const flowsFile = namedArguments['flows-file'] ?? defaultFile;
const serverUrl = namedArguments['server-url'] ?? defaultUrl;

if (flowsFile != defaultFile){
   extractArgs = ` --flows-file ${flowsFile}`;
}

if (serverUrl != defaultUrl){
   collectArgs = ` --server-url ${serverUrl}`;
}

let runningExtract = false;
let rerunExtract = false;
let runningCollect = false;
let rerunCollect = false;

function runExtractChanges() {
    if (runningCollect) {
        return;
    }
    if (runningExtract) {
        rerunExtract = true;
        return;
    }
    runningExtract = true;
    const proc = spawn('node', [extractScript, extractArgs], { stdio: 'inherit' });
    proc.on('close', (code) => {
        setTimeout(() => {
            runningExtract = false;
        }, 1000);


        if (rerunExtract) {
            rerunExtract = false;
            runExtractChanges();
        }
    });
}

function runCollectChanges() {
    if (runningCollect) {
        rerunCollect = true;
        return;
    }
    runningCollect = true;

    const proc = spawn('node', [collectScript, collectArgs], { stdio: 'inherit' });
    proc.on('close', (code) => {
        runningCollect = false;
        if (rerunCollect) {
            rerunCollect = false;
            runCollectChanges();
        }
    });
}

const watcherForExtract = chokidar.watch(path.join(__dirname, flowsFile), {
    // ignored: /(^|[\/\\])\../, // ignore dotfiles
    persistent: true,
    // ignoreInitial: true,
    // awaitWriteFinish: {
    //     stabilityThreshold: 200,
    //     pollInterval: 100
    // }
});

const watcherForCollect = chokidar.watch(watchCollectDir, {
    ignored: /(^|[\/\\])\../, // ignore dotfiles
    persistent: true,
    ignoreInitial: true,
    awaitWriteFinish: {
        stabilityThreshold: 200,
        pollInterval: 100
    }
});

watcherForExtract.on('all', (event, filePath) => {
    if (runningCollect) {
        return;
    }

    console.info(`Detected change (${event}) in ${filePath}.`);

    if (filePath.endsWith('.json')) {
        runExtractChanges();
    }
});

watcherForCollect.on('all', (event, filePath) => {
    if (runningExtract) {
        return;
    }
    if (filePath.endsWith('.js') || filePath.endsWith('.vue')) {
        runCollectChanges();
    }
});

if (namedArguments['clean'] === true) {
    const srcDir = path.join(__dirname, 'src');

    if (fs.existsSync(srcDir)) {
        fs.removeSync(srcDir);

        console.info(`Cleared /src directory`);
    }
}




runExtractChanges();

console.info(`Extracting from ${flowsFile}`);
console.info(`Collecting From ${watchCollectDir}`);

function extractNamedArguments() {
    const args = process.argv.slice(2); // Skip node and script path
    const namedArgs = {};

    for (let i = 0; i < args.length; i++) {
        const input = args[i].trim();

        if (input.startsWith('--')) {

            let key
            let value

            if (input.indexOf(' ') > -1 && input.indexOf('"') === -1 && input.indexOf(`'`) === -1){
              const parts = input.split(' ');

              key = parts[0].slice(2);
              value = parts[1];
            } else {
              key = input.slice(2);
              value = args[i + 1];                
            }

            if (value && !value.startsWith('--')) {
                namedArgs[key] = value;
                i++;
            } else {
                namedArgs[key] = true; // Treat as flag if no value
            }
        }
    }

    return namedArgs;
}




