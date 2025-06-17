# node-red and vs code integration hack

When building a complex dashboards in node-red having the ability to edit in VS Code speeds up development. 

I have not found any integrations to do this, so as a workaround I wrote these scripts. They extract and return the function nodes, or the vue templates of dashboard2 elements.

You run the node script **functions-templates-extract** before you start working.

Then run **functions-templates-watch** and any changes you make on save are loaded into node-red.

Put the scripts next to your flows.js


```bash
node functions-templates-extract
```
```bash
node functions-templates-watch
```