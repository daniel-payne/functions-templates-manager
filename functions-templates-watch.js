const chokidar = require('chokidar');
const { spawn } = require('child_process');
const path = require('path');

const watchExtractDir = path.join(__dirname);
const watchCollectDir = path.join(__dirname, 'src');

const extractScript = path.join(__dirname, 'functions-templates-extract.js');
const collectScript = path.join(__dirname, 'functions-templates-collect.js');


let runningExtract = false;
let rerunExtract   = false;
let runningCollect = false;
let rerunCollect   = false;

function runExtractChanges() {
    if (runningCollect){
       return;
    }
    if (runningExtract) {
        rerunExtract= true;
        return;
    }
    runningExtract = true;
    const proc = spawn('node', [extractScript], { stdio: 'inherit' });
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
    const proc = spawn('node', [collectScript], { stdio: 'inherit' });
    proc.on('close', (code) => {
        runningCollect = false;
        if (rerunCollect) {
            rerunCollect = false;
            runCollectChanges();
        }
    });
}

const watcherForExtract = chokidar.watch(__dirname + '/flows.json', {
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
    if (runningCollect){
       return;
    }
    if (filePath.endsWith('.json')) {
        // console.log(`Detected change (${event}) in ${filePath}. Running functions-templates-extract.js...`);
        runExtractChanges();
    }
});

watcherForCollect.on('all', (event, filePath) => {
    if (runningExtract){
       return;
    }
    if (filePath.endsWith('.js') || filePath.endsWith('.vue')) {
        // console.log(`Detected change (${event}) in ${filePath}. Running functions-templates-collect.js...`);
        runCollectChanges();
    }
});


console.log(`Extracting from flows.json`);

runExtractChanges();

console.log(`Watching ${watchCollectDir} and flows.json`);




