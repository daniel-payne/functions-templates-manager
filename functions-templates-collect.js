const fs = require('fs');
const path = require('path');

const defaultUrl = 'http://127.0.0.1:1880'

const namedArguments = extractNamedArguments()

const serverUrl = namedArguments['server-url'] ?? defaultUrl;

async function reloadFlows() {
    try {
        const response = await fetch(serverUrl + '/flows', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Node-RED-Deployment-Type': 'reload'
            },
            body: '{}'
        });
        if (response.status === 204) {
            console.info('Flows reloaded successfully');
        } else {
            console.error(`Error Connecting with node-red: Status ${response.status}`);
        }
    } catch (error) {
        console.error('Error: Could not connect with node-red on : ' + serverUrl);
    }
}

const sourceDir = path.join(__dirname, 'src');

const inputPath = path.join(__dirname, 'flows.json');
const manfestPath = path.join(__dirname, 'src', 'manifest.json');

function getAllFiles(dir, exts, fileList = [], relDir = '') {
    const files = fs.readdirSync(dir);

    files.forEach(file => {
        const filePath = path.join(dir, file);
        const relPath = path.join(relDir, file);
        const stat = fs.statSync(filePath);

        if (stat.isDirectory()) {
            getAllFiles(filePath, exts, fileList, relPath);
        } else if (exts.some(ext => file.endsWith(ext))) {
            fileList.push(relPath);
        }

    });

    return fileList;
}

// Collect all .vue and .js files from all subdirectories
let sourceFiles = [];

try {
    sourceFiles = getAllFiles(sourceDir, ['.vue', '.js']);
} catch (error) {
    console.error('Nothing to upload');
    process.exit(1);
}

const flows = JSON.parse(fs.readFileSync(inputPath, 'utf8'));
const manfest = JSON.parse(fs.readFileSync(manfestPath, 'utf8'));

let updatedCount = 0;

sourceFiles.forEach(file => {
    const filePath = path.join(sourceDir, file);
    const templateContent = fs.readFileSync(filePath, 'utf8');

    const fileName = file.replace(/\.vue$/, '').replace(/\.js$/, '').split('/').pop();
    
    const flowId = Object.keys(manfest).find(key => manfest[key].fileName === fileName);

    if(flowId == null){
        console.error(`ERROR : ${file} not in manifest.json, does this file exist in flows.json?`);

        return
    }
    
    // Find and update the corresponding flow
    const isVue = file.endsWith('.vue');
    const isJs = file.endsWith('.js');
    
    let flow;
    
    if (isVue) {
        flow = flows.find(f => f.id === flowId && typeof f.format === 'string' && f.format.trim().startsWith('<template>'));
        if (flow) {
            if (flow.format === templateContent) {
                return;
            }

            flow.format = templateContent;
            updatedCount++;
            console.info(`Updated flow id ${flowId} with ${file}`);
        }
    } else if (isJs) {
        flow = flows.find(f => f.id === flowId && typeof f.func === 'string');

        if (flow) {
            if (flow.func === templateContent) {
                return;
            }

            flow.func = templateContent;
            updatedCount++;
            console.info(`Updated flow id ${flowId} with ${file}`);
        }
    }
});

if (updatedCount > 0) {
    fs.writeFileSync(inputPath, JSON.stringify(flows, null, 4), 'utf8');

    reloadFlows();
}

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
