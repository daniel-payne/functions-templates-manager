# node-red and vs-code integration

## The problem it solves

When building a complex dashboards in node-red having the ability to edit in VS Code speeds up development. 

I have not found any integrations to do this, so as a workaround I wrote these scripts. 

These scripts extract and collect the code in function nodes, or the vue templates of Dashboard2 elements.

## how to use

1. Download this project to a local directory

```
git clone https://github.com/daniel-payne/functions-templates-manager.git
```

2. Install any dependencies

```
cd functions-templates-manager
```
```
npm install
```

3. When running your instance of node-red, and make a note of the location of your flows file from the startup log. This is the ```--flows-file``` flag.

```
... [info] Flows file     : /home/daniel/.node-red/flows.json
```

4. Make a note of the URL of your node-red endpoint. This is the ```--server-at``` flag.

```
... - [info] Server now running at http://127.0.0.1:1880/
```

5. Use these values when you start the script. The script will make a directory called /src in the same place as your flows.json file.   

```
node functions-templates-watch --flows-file ~/.node-red/flows.json --server-at http://127.0.0.1:1880

```

## How it works

Running **functions-templates-watch** extracts all the function and dashboard templates to the /src. 
It then watches for changes and writes them back to the flows.json. 
It also watches the flows.json in-case you change something in the node-red editor and extracts everything again on deploy.


There needs to be **three** scripts, as the collect & extract run in separate processes, so you can continue to edit and save during long running synchronization.

There are four optional flags you can send to these scripts

**--flows-file** This allows you to run the scripts from anywhere, if you don't supply this value it defaults to ```~/.node-red/flows.json```

**--server-at** This allows the scripts to communicate with node-red running on different ports or different location, defaults to ```http://127.0.0.1:1880```

**--clean** This first removes the /src folder and does a clean extract from flows.json on startup. Don't forget to merge your changes back into node-red using the "review changes" in the node-red editor, as this will overwrite unsaved /src changes if the script re-starts.

**--wrap** This wraps the contents of function files with ```function(msg){ <<function body here>> }``` to allow for testing outside of node-red. If you put your test files in the /src folder, make sure you do **NOT** have the ```--clean``` flag enabled as you will **LOSE** your test files each time the script is run. If wrap is enabled, whitespace only changes do not trigger a collection run.

With this flag, the contents of the function files will look like this

```
export default function function_name(msg){ 
    <<function body here>> 
}
```

## Video overview

*Coming soon, a short video of the scripts in action*

## Versions

### version 1.0.1

The file names in /src reflect those in node-red, duplicate names are given (n) additions.
Any names containing slashes, both forward and backward slashes, are replaces with "-" in the file name. 

There is also error handling in case you delete something in node-red and it is left on the /src.
I often delete the /src folder before I start the watch.

### version 1.0.2

Added ```--clean``` & ```--flows-file``` flag.

### version 1.0.3

Added ```--server-url``` flag.

### version 1.0.4

Added ```--wrap``` flag.

Renamed ```--server-url``` to ```--server-at``` to match console output from node-red.

Refactored code & fixed bug in 1.0.3 file watcher.