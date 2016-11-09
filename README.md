# Server Side Rendering of Web Components

Uses [Electron] to render on the server.

## Note

This version is for web components that use Shadow DOM. It is adapted from Kevin's [WC-SSR]

## Setup
Install [Node.js] and npm

Install Electron
```
npm install electron --save-dev
```
or globally:
```
npm install -g electron
```

Install Bower
```
npm install bower
```
Update installed packages for Polymer.

```
bower update
```
Run Electron app locally
```
electron .
```
Navigate to Browser. Example links:
```
http://localhost:3000/index.html
http://localhost:3000/index2.html
http://localhost:3000/test.html
```

[Electron]: <https://github.com/electron/electron>
[Node.js]: <https://docs.npmjs.com/getting-started/installing-node#installing-nodejs>
[WC-SSR]: <https://github.com/kevinpschaaf/wc-ssr>