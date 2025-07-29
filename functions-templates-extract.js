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
        folder[id] = item.name;
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

    let code = isVue ? item.format : item.func;

    let initialize = isFun ? item.initialize : undefined;
    let finalize = isFun ? item.finalize : undefined;

    let info = item.info ?? undefined;

    if ((code ?? '').trim().length === 0) {
        code = undefined
    }

    if ((initialize ?? '').trim().length === 0) {
        initialize = undefined
    }

    if ((finalize ?? '').trim().length === 0) {
        finalize = undefined
    }

    if ((info ?? '').trim().length === 0) {
        info = undefined
    }

    if (isVue || isFun) {
        manifest[id] = { folderName, name, sanitizedName, fileName, isVue, isFun, code, initialize, finalize, info };
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

    const baseName = item.fileName;

    const codeName = `${baseName}.${item.isVue ? 'vue' : 'js'}`

    const initializeName = `${baseName}.initialize.js`
    const finalizeName = `${baseName}.finalize.js`
    const infoName = `${baseName}.info.md`

    const codeFile = path.join(outputDir, codeName);

    const initializeFile = path.join(outputDir, initializeName);
    const finalizeFile = path.join(outputDir, finalizeName);
    const infoFile = path.join(outputDir, infoName);

    let code = item.code;
    let initialize = item.initialize;
    let finalize = item.finalize;
    let info = item.info;

    if (startupProperties.wrap) {
        const functionName = item.fileName.replace(/\s/g, '_');

        if (item.isFun && code != null) {
            code = `export default function ${functionName}(msg){\n${code}\n\n}`;
        }

        if (item.isFun && initialize != null) {
            initialize = `export default function ${functionName}(msg){\n${initialize}\n\n}`;
        }

        if (item.isFun && finalize != null) {
            finalize = `export default function ${functionName}(msg){\n${finalize}\n\n}`;
        }
    }

    if (code != null) {
        fs.writeFileSync(codeFile, code, 'utf8');
    }

    if (initialize != null) {
        fs.writeFileSync(initializeFile, initialize, 'utf8');
    }

    if (finalize != null) {
        fs.writeFileSync(finalizeFile, finalize, 'utf8');
    }

    if (info != null) {
        fs.writeFileSync(infoFile, info, 'utf8');
    }

    // Save space in the manfest file by removing unnecessary properties
    item.code = null;
    item.initialize = null;
    item.finalize = null;
    item.info = null;
});

// Save the manifest file

fs.writeFileSync(manfestFile, JSON.stringify(manifest, null, 2), 'utf8');

let sourceFiles = [];

try {
    sourceFiles = getAllFiles(sourcePath, ['.vue', '.js', '.md']);
} catch (error) {
    console.error(`ERROR-E01: could not find any files ro read in ${sourcePath}`);
    process.exit(1);
}

sourceFiles.forEach(file => {
    let found = false;

    Object.keys(manifest).forEach((id) => {
        const item = manifest[id];

        if (file.indexOf(item.folderName) > -1 && file.indexOf(item.fileName) > -1) {
            found = true;
        }
    });

    if (!found) {
        const filePath = path.join(sourcePath, file);

        fs.removeSync(filePath);

        console.info(`INFO: removed unused file: ${file}`);
    }
})

// Report the number of functions and templates extracted

if (count === 0) {
    console.info('INFO : No Functions or templates found in format fields.');
} else {
    console.info(`INFO: extracted ${count} functions or templates.`);
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