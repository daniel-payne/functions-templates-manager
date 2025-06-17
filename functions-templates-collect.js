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


const inputPath = path.join(__dirname, 'flows.json');
const dashboardDir = path.join(__dirname, 'src');

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
let vueJsFiles = [];
try {
    vueJsFiles = getAllFiles(dashboardDir, ['.vue', '.js']);
} catch (error) {
    console.error('Nothing to upload');
    process.exit(1);
}

const flows = JSON.parse(fs.readFileSync(inputPath, 'utf8'));

let updatedCount = 0;

vueJsFiles.forEach(file => {
    const filePath = path.join(dashboardDir, file);
    const templateContent = fs.readFileSync(filePath, 'utf8');
    // Extract id from filename: name-id.vue or name-id.js
    const base = path.basename(file, path.extname(file));
    const dashIdx = base.indexOf('-');
    if (dashIdx === -1) return;
    const flowId = base.slice(dashIdx + 1);
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
    console.log(`Inserted ${updatedCount} templates into flows.json.`);

    reloadFlows();
}
// else {
//     console.log('No matching flows found to update.');
// }


