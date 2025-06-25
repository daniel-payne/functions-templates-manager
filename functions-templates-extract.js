const fs = require('fs');
const path = require('path');

const namedArguments = extractNamedArguments()

let flowsFile =  './flows.json';
let inputPath = path.join(__dirname, flowsFile)

if (namedArguments['flows-file'] != null) {
    flowsFile = namedArguments['flows-file'];

    if (flowsFile.startsWith('./')) {
        inputPath = path.join(__dirname, flowsFile)
    } else {
        inputPath = flowsFile
    }
}

const manfestPath = path.join(__dirname, 'src', 'manifest.json');

const flows = JSON.parse(fs.readFileSync(inputPath, 'utf8'));

let count = 0;

const manifest = {}
const folder = {}

const fileNames = []

flows.forEach((item) => {
    const id = item.id

    if (item.type === 'tab') {
        folder[id] = item.label;
    } else if (item.type === 'subflow') {
        folder[id] = item.label;
    }
})

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

Object.keys(manifest).forEach((id) => {
    const item = manifest[id];

    const folder = item.folderName;
    const outputDir = path.join(__dirname, 'src', folder);

    // Ensure output directory exists (recursive for nested dirs)
    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
    }

    count++;

    let baseName = item.fileName;

    const baseFile = `${baseName}.${item.isVue ? 'vue' : 'js'}`

    const outFile = path.join(outputDir, baseFile);

    const data = item.data;

    fs.writeFileSync(outFile, data, 'utf8');

    item.data = null;

});

fs.writeFileSync(manfestPath, JSON.stringify(manifest, null, 2), 'utf8');

if (count === 0) {
    console.info('No Functions or templates found in format fields.');
} else {
    console.info(`Extracted ${count} functions or templates.`);
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
