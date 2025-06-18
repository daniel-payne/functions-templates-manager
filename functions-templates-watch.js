const chokidar = require('chokidar');
const { spawn } = require('child_process');
const path = require('path');

const watchCollectDir = path.join(__dirname, 'src');

const collectScript = path.join(__dirname, 'functions-templates-collect.js');

let runningCollect = false;
let rerunCollect   = false;

function runCollectChanges() {
    if (runningCollect) {
        rerunCollect = true;
        return;
    }
    runningCollect = true;
    const proc = spawn('node', [collectScript], { stdio: 'inherit' });
    proc.on('close', (code) => {
        runningCollect = false;
        if (rerunCollect) {
            rerunCollect = false;
            runCollectChanges();
        }
    });
}

const watcherForCollect = chokidar.watch(watchCollectDir, {
    ignored: /(^|[\/\\])\../, // ignore dotfiles
    persistent: true,
    ignoreInitial: true,
    awaitWriteFinish: {
        stabilityThreshold: 200,
        pollInterval: 100
    }
});

watcherForCollect.on('all', (event, filePath) => {
    if (filePath.endsWith('.js') || filePath.endsWith('.vue')) {
        console.log(`Detected change (${event}) in ${filePath}. Running functions-templates-collect.js...`);
        runCollectChanges();
    }
});

console.log(`Watching ${watchCollectDir} and flows.json`);
