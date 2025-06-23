const fs = require('fs');
const path = require('path');

async function reloadFlows() {
    try {
        const response = await fetch('http://localhost:8081/flows', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Node-RED-Deployment-Type': 'reload'
            },
            body: '{}'
        });
        if (response.status === 204) {
            console.log('Flows reloaded successfully');
        } else {
            console.log(`Error: Status ${response.status}`);
        }
    } catch (error) {
        console.error('Error:', error.message);
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
            console.log(`Updated flow id ${flowId} with ${file}`);
        }
    } else if (isJs) {
        flow = flows.find(f => f.id === flowId && typeof f.func === 'string');

        if (flow) {
            if (flow.func === templateContent) {
                return;
            }

            flow.func = templateContent;
            updatedCount++;
            console.log(`Updated flow id ${flowId} with ${file}`);
        }
    }
});

if (updatedCount > 0) {
    fs.writeFileSync(inputPath, JSON.stringify(flows, null, 4), 'utf8');
    
    // console.log(`Updated ${updatedCount} items in flows.json`);

    reloadFlows();
}
// else {
//     console.log('No matching flows found to update.');
// }


