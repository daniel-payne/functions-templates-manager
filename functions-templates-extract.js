import path from'path';
import fs from'fs-extra';
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

const defaultFile = './flows.json';
const defaultUrl = 'http://127.0.0.1:1880'

const flowsFile = startupProperties.flowsFile ?? defaultFile;
const serverAt = startupProperties.serverAt ?? defaultUrl;

const flowsPath = dirname(flowsFile);

const sourcePath = path.join(flowsPath, 'src');
const manfestFile = path.join(sourcePath, 'manifest.json');

// Setup the vars needed for the extraction
 
const flows = JSON.parse(fs.readFileSync(flowsFile, 'utf8'));

let count = 0;

const manifest = {}
const folder = {}

const fileNames = []

// Extract TABs and SUBFLOWs

flows.forEach((item) => {
    const id = item.id

    if (item.type === 'tab') {
        folder[id] = item.label;
    } else if (item.type === 'subflow') {
        folder[id] = item.label;
    }
})

// Extract Functions and UI Templates

flows.forEach((item) => {
    const id = item.id
    const type = item.type

    let name

    if (type === 'function') {
        name = item.name;
    } else if (type === 'ui-template') {
        name = item.name;
    } else {
        return
    }

    const sanitizedName = name.replace(/[\/\\]/g, '-');

    const folderName = folder[item.z] || 'default';

    fileNames.push(sanitizedName);

    const count = fileNames.filter((n) => n === sanitizedName).length;

    let fileName

    if (count > 1) {
        fileName = `${sanitizedName}(${count})`;
    } else {
        fileName = sanitizedName;
    }

    const isVue = (typeof item.format === 'string' && (item.format.trim().indexOf('<template>') !== -1))
    const isFun = (typeof item.func === 'string' && item.func.trim().length > 0) && isVue === false

    const data = isVue ? item.format : item.func;

    if (isVue || isFun) {
        manifest[id] = { folderName, name, sanitizedName, fileName, isVue, isFun, data };
    }
})

// For each item in the manifest, create the output directory and write the file

Object.keys(manifest).forEach((id) => {
    const item = manifest[id];

    const folder = item.folderName;
    const outputDir = path.join(sourcePath, folder);

    // Ensure output directory exists (recursive for nested dirs)
    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
    }

    count++;

    let baseName = item.fileName;

    const baseFile = `${baseName}.${item.isVue ? 'vue' : 'js'}`

    const outFile = path.join(outputDir, baseFile);

    let data = item.data;

    if (startupProperties.wrap) {
        const functionName = item.fileName.replace(/\s/g, '_');

        if (item.isFun) {
            data = `export default function ${functionName}(msg){\n${data}\n\n}`;  
        }
    }

    fs.writeFileSync(outFile, data, 'utf8');

    item.data = null;

});

// Save the manifest file

fs.writeFileSync(manfestFile, JSON.stringify(manifest, null, 2), 'utf8');

// Report the number of functions and templates extracted

if (count === 0) {
    console.info('No Functions or templates found in format fields.');
} else {
    console.info(`Extracted ${count} functions or templates.`);
}
 