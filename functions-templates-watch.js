const chokidar = require('chokidar');
const { spawn } = require('child_process');
const path = require('path');

const watchDir = path.join(__dirname, 'src');
const scriptPath = path.join(__dirname, 'functions-templates-collect.js');

let running = false;
let rerun = false;

function runScript() {
    if (running) {
        rerun = true;
        return;
    }
    running = true;
    const proc = spawn('node', [scriptPath], { stdio: 'inherit' });
    proc.on('close', (code) => {
        running = false;
        if (rerun) {
            rerun = false;
            runScript();
        }
    });
}

const watcher = chokidar.watch(watchDir, {
    ignored: /(^|[\/\\])\../, // ignore dotfiles
    persistent: true,
    ignoreInitial: true,
    awaitWriteFinish: {
        stabilityThreshold: 200,
        pollInterval: 100
    }
});

watcher.on('all', (event, filePath) => {
    if (filePath.endsWith('.js') || filePath.endsWith('.vue')) {
        console.log(`Detected change (${event}) in ${filePath}. Running functions-templates-collect.js...`);
        runScript();
    }
});

console.log(`Watching ${watchDir} for .js and .vue changes...`);
