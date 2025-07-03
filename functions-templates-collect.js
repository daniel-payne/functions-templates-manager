import path from 'path';
import fs from 'fs-extra';
import yargs from 'yargs';

import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { hideBin } from 'yargs/helpers';

// Extract standard process arguments

const currentArges = process.argv.slice(2);

const startupProperties = yargs(hideBin(process.argv)).parse()

const currentPathAndFile = fileURLToPath(import.meta.url);
const currentDirectory = dirname(currentPathAndFile);

// Default values for flows file and server URL

const defaultFile = '~/.node-red/flows.json';
const defaultUrl = 'http://127.0.0.1:1880'

const flowsFile = startupProperties.flowsFile ?? defaultFile;
const serverAt = startupProperties.serverAt ?? defaultUrl;

const flowsPath = dirname(flowsFile);

const sourcePath = path.join(flowsPath, 'src');
const manfestFile = path.join(sourcePath, 'manifest.json');

// Collect all .vue and .js files from all subdirectories

let sourceFiles = [];

try {
    sourceFiles = getAllFiles(sourcePath, ['.vue', '.js']);
} catch (error) {
    console.error(`ERROR: Could not find any files ro read in ${sourcePath}`);
    process.exit(1);
}

// Read in flow and manfest

let flows;
let manfest;

try {

    flows = JSON.parse(fs.readFileSync(flowsFile, 'utf8'));
    manfest = JSON.parse(fs.readFileSync(manfestFile, 'utf8'));

} catch (error) {
    console.error(`ERROR: Could not read flows file ${flowsFile} or manifest file ${manfestFile}. Please check the file paths and ensure they are valid JSON.`);
    process.exit(1);
}

if (flows == null || manfest == null) {
    console.error(`ERROR: Could not read flows file ${flowsFile} or manifest file ${manfestFile}. Please check the file paths and ensure they are valid JSON.`);
    process.exit(1);
}

// read in source files

let updatedCount = 0;

sourceFiles.forEach(file => {
    const filePath = path.join(sourcePath, file);
    const templateContent = fs.readFileSync(filePath, 'utf8');

    const fileName = file.replace(/\.vue$/, '').replace(/\.js$/, '').split('/').pop();

    const flowId = Object.keys(manfest).find(key => manfest[key].fileName === fileName);

    if (flowId == null) {
        console.error(`ERROR: ${file} not in manifest.json, does this file exist in flows.json?`);

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
            console.info(`INFO: updated flow id ${flowId} with ${file}`);
        }
    } else if (isJs) {
        flow = flows.find(f => f.id === flowId && typeof f.func === 'string');

        if (flow) {

            const functionTemplate = removeFunctionWrapper(templateContent);


            if (areContentsSame(flow.func, functionTemplate)) {
                return;
            }

            flow.func = functionTemplate.trim();

            updatedCount++;

            console.info(`INFO: updated flow id ${flowId} with ${file}`);
        }
    }
});

// Report status

if (updatedCount > 0) {
    fs.writeFileSync(flowsFile, JSON.stringify(flows, null, 4), 'utf8');

    // top level await
    (async () => {
        await reloadFlows(serverAt);
    })();
}


///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

function removeFunctionWrapper(code) {
    const match = code.match(/\s*export\s*default\s*function\s*.*\(msg\)\s*{/);

    if (match) {
        const result = code.slice(match[0].length).trim();

        const lastIndex = result.lastIndexOf('}');

        if (lastIndex !== -1) {
            return result.slice(0, lastIndex) + result.slice(lastIndex + 1);
        }

        return result
    }

    return code
}

///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////


function areContentsSame(str1, str2) {
    // Remove all whitespace, tabs, and newlines from both strings
    const cleanStr1 = str1.replace(/\s/g, '');
    const cleanStr2 = str2.replace(/\s/g, '');

    // Compare the cleaned strings
    return cleanStr1 === cleanStr2;
}

///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

async function reloadFlows(nodeRedUrl) {
    try {
        const response = await fetch(nodeRedUrl + '/flows', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Node-RED-Deployment-Type': 'reload'
            },
            body: '{}'
        });

        if (response.status === 204) {
            console.info('INFO: flows reloaded successfully');
        } else {
            console.error(`ERROR: connecting with node-red: Status ${response.status}`);
        }

    } catch (error) {
        console.error('ERROR: could not connect with node-red --server-at : ' + nodeRedUrl);
    }
}


///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

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

///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////












