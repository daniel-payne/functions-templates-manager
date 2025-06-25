# node-red and vs-code integration

When building a complex dashboards in node-red having the ability to edit in VS Code speeds up development. 

I have not found any integrations to do this, so as a workaround I wrote these scripts. 
These scripts extract and collect the code in function nodes, or the vue templates of dashboard2 elements.

Run **functions-templates-watch**, it extracts all the function and dashboard templates to the /src. 
It then watches for changes and writes them back to the flows.json. 
It also watches the flows.json in-case you change something in the node-red editor and extracts everything again on deploy.

**Download** and put all **three** scripts next to your flows.json, otherwise you will need to set the flows file path. It needs to be three scripts, as the collect and extract run in separate processes to the watch, so that you can continue editing & saving during a long transfer process.

```bash
node functions-templates-watch
```

There are three optional arguments you can send to these scripts

**--clean** This first removes the /src folder and does a clean extract from flows.json on startup. Don't forget to merge your changes back into node-red using the "review changes" in the node-red editor, as this will overwrite unsaved /src changes if the script re-starts.

**--flows-file** This allows you to run the scripts from anywhere, if you don't supply this value it defaults to ./flows.json

**--server-url** This allows the scripts to communicate with node-red running on different ports or different location, defaults to http://127.0.0.1:1880

```bash
node functions-templates-watch --clean --flows-file ./flows.json --server-url http://127.0.0.1:1880
```

version 1.0.1

The file names in /src reflect those in node-red, duplicate names are given (n) additions.
Any names containing slashes, both forward and backward slashes, are replaces with "-" in the file name. 

There is also error handling in case you delete something in node-red and it is left on the /src.
I often delete the /src folder before I start the watch.

version 1.0.2

Added --clean & --flows-file options

version 1.0.3

Added --server-url options