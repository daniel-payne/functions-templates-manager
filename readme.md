# node-red and vs-code integration hack

When building a complex dashboards in node-red having the ability to edit in VS Code speeds up development. 

I have not found any integrations to do this, so as a workaround I wrote these scripts. They extract and return the function nodes, or the vue templates of dashboard2 elements.

Run **functions-templates-watch**, it extracts all the function and dashboard templates to the /src. It then watches for changes and writes them back to the flows.json. It also watches the flows.json incase you change something in the node-red editor and extracts everything again on deploy.

Put all **three** scripts next to your flows.json

```bash
node functions-templates-watch
```
