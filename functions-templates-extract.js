const fs = require('fs');
const path = require('path');

const inputPath = path.join(__dirname, 'flows.json');


const flows = JSON.parse(fs.readFileSync(inputPath, 'utf8'));

let count = 0;

const manifest = {}

flows.forEach((item, idx) => {
    if (item.type === 'tab') {
        manifest[item.id] = {
            name: item.label,
        };
    } else if (item.type === 'subflow') {
        manifest[item.id] = {
            name: item.name,
        };
    }
})

flows.forEach((item, idx) => {
    const isVue = (typeof item.format === 'string' && item.format.trim().startsWith('<template>'))
    const isFun = (typeof item.func   === 'string' && item.func.trim().length > 0) && isVue === false


    if (isVue || isFun) {
        const folder = manifest[item.z].name ?? 'default'
        const outputDir = path.join(__dirname, 'src', folder);

        // Ensure output directory exists (recursive for nested dirs)
        if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir, { recursive: true });
        }

        count++;
    
        let baseName = `template_${count}`;

        if (item.name && item.id) {
            baseName = `${item.name}-${item.id}`;
        }

        const baseFile = `${baseName}.${isVue ? 'vue' : 'js'}`

        const outFile = path.join(outputDir, baseFile);

        const data = isVue ? item.format : item.func;

        fs.writeFileSync(outFile, data, 'utf8');

        // console.log(`Extracted ${folder}/${baseFile}`);
    }
});

if (count === 0) {
    console.log('No Functions or templates found in format fields.');
} else {
    console.log(`Extracted ${count} functions or templates.`);
}
