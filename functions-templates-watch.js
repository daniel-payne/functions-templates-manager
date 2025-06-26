import chokidar from 'chokidar';
import path from'path';
import fs from'fs-extra';
import yargs from 'yargs';

import { spawn } from 'child_process';

import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { hideBin } from 'yargs/helpers';

// Extract standard process arguments

const currentArges = process.argv.slice(2);

const startupProperties = yargs(hideBin(process.argv)).parse()

const currentPathAndFile = fileURLToPath(import.meta.url);
const currentDirectory = dirname(currentPathAndFile);

// Default values for flows file and server URL

const defaultFile = './flows.json';
const defaultUrl = 'http://127.0.0.1:1880'

const flowsFile = startupProperties.flowsFile ?? defaultFile;
const serverAt = startupProperties.serverAt ?? defaultUrl;

const flowsPath = dirname(flowsFile);

const sourcePath = path.join(flowsPath, 'src');

const extractScript = path.join(currentDirectory, 'functions-templates-extract.js');
const collectScript = path.join(currentDirectory, 'functions-templates-collect.js');

// Setup the control and calls for Extract & Collect

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
    const proc = spawn('node', [extractScript, ...currentArges], { stdio: 'inherit' });
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

    const proc = spawn('node', [collectScript, ...currentArges], { stdio: 'inherit' });

    proc.on('close', (code) => {
        runningCollect = false;
        if (rerunCollect) {
            rerunCollect = false;
            runCollectChanges();
        }
    });
}

// Setup filesystem warchers

const watcherForExtract = chokidar.watch(flowsFile, {
    persistent: true,
    ignoreInitial: true,
    awaitWriteFinish: {
        stabilityThreshold: 200,
        pollInterval: 100
    }
});

const watcherForCollect = chokidar.watch(sourcePath, {
    // ignore .test.js test files
    // ignored: /.*\.test\.js$/, 
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

//

if (startupProperties.clean === true) {
    if (fs.existsSync(sourcePath)) {
        fs.removeSync(sourcePath);

        console.info(`Cleared /src directory`);
    }
}

// Start the initial run

runExtractChanges();

// Report the file status

console.info(`Extracting from ${flowsFile}`);
console.info(`Collecting From ${sourcePath}`);
 

// Keep the process running and handle process termination
process.on('SIGINT', async () => {
  console.log('\nStopping watchers');
  
  await watcherForExtract.close();
  await watcherForCollect.close();

  console.log('Watchers stopped');
  process.exit(0);
});