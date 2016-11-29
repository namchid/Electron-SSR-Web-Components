# Server Side Rendering of Web Components

Uses [Electron] to render on the server.

## Note

Port 3000: Shady DOM

Port 4000: Shadow DOM

The Shadow DOM version (runs on port 4000) is for web components that use Shadow DOM. It is adapted from Kevin's [WC-SSR].

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
Install/update packages for Polymer and Node.

```
bower update

npm update
```
Alternatively, run script to install Polymer and Node packages and download files for testing.

```
./runme
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
