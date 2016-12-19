const electron = require('electron');
const shadyServer = require('express')();
const shadowServer = require('express')();
const LRUCache = require('./lruCache');
const ngrok = require('ngrok');
const path = require('path');
const url = require('url');

const app = electron.app;
const BrowserWindow = electron.BrowserWindow;
let cache = new LRUCache(100);
const ipcMain = electron.ipcMain;
let listening = false;
const shadyPort = 3000;
const shadowPort = 4000;
let shadyRes = null;
let shadowRes = null;
let win = null;

global.directory = 'file://' + __dirname + '/';

/**
* Creates an instance of the Electron BrowserWindow with the DevTools open
* and spins up Express server.
*/
function createWindow() {
  win = new BrowserWindow({width: 800, height: 600});
  win.loadURL('data:text/html;charset:utf-8,<html></html>');
  win.webContents.openDevTools();

  win.on('closed', () => {
    win = null;
  });

  // Setup for Express server
  win.webContents.on('dom-ready', () => {
    startServer();
  });
}

/**
* Returns the string containing the HTML imports.
* @param {String} key The key of the HTML imports in the cache.
* @param {Object} res The response object.
*/
function startServer() {
  if (!listening) {
    shadyServer.listen(shadyPort);

    shadowServer.listen(shadowPort,
                        () => {
      shadowServer.emit('listening', null);
    });

    ngrok.connect(shadyPort,
                  (err, url) => {
      console.log('Shady ngrok url: ' + url);
    });

    ngrok.connect(shadowPort,
                  (err, url) => {
      console.log('Shadow ngrok url: ' + url);
    });
  }
}

shadowServer.on('listening', () => {
  listening = true;
});

/**
* Closes the server ports.
*/
function stopServer() {
  shadyServer.close();
  shadowServer.close();
}

app.on('ready', createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    stopServer();
    app.quit();
  }
});

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow();
  }
});

// IPC functions
ipcMain.on('receiveSerializedDOM', (_, contents, isShady) => {
  if (isShady) {
    shadyRes.end(contents);
  } else {
    shadowRes.end(contents);
  }
});

ipcMain.on('setAsyncImports', (event, key, value) => {
  cache.set('_asyncImport' + key + '.html', value);
  event.returnValue = true;
});

shadyServer.get(/\/index[0-9]*.html/, (req, res) => {
  win.loadURL('file://' + __dirname + req.url);
  shadyRes = res;

  win.webContents.on('did-finish-load', () => {
    shadyGetDOMInsidePage();
  });
});

shadowServer.get(/\/index[0-9]*shadow.html/, (req, res) => {
  win.loadURL('file://' + __dirname + req.url);
  shadowRes = res;

  win.webContents.on('did-finish-load', () => {
    // To use the hybrid version instead, use this instead:
    // shadyThenShadowGetDOMInsidePage()
    shadowGetDOMInsidePage();
  });
});

shadyServer.get(/_asyncImport[0-9]+/,
                (req, res) => {
  getAsyncImport(req.url.substring(1), res);
});

shadowServer.get(/_asyncImport[0-9]+/,
                 (req, res) => {
  getAsyncImport(req.url.substring(1), res);
});

/**
* Returns the string containing the HTML imports.
* @param {String} key The key of the HTML imports in the cache.
* @param {Object} res The response from the server.
*/
function getAsyncImport(key, res) {
  res.end('' + cache.get(key));
}

/**
* Sends the requested file as the response without any modification.
* @param {Object} req The request to the server.
* @param {Object} res The response from the server.
*/
function returnRequest(req, res) {
  const parsedUrl = url.parse(req.url, true);
  const filename = parsedUrl.pathname.substr(1);

  const p = path.join(__dirname, filename);
  res.sendFile(p);
}

shadyServer.get('/*', returnRequest);

shadowServer.get('/*', returnRequest);

/* eslint no-unused-vars:
["error", {"varsIgnorePattern": "shadyThenShadowGetDOMInsidePage"}]*/
/**
* Accesses and modifies the DOM inside the BrowserWindow and
* sends a serialized HTMLString as the response.
* This is the hybrid version which serves Shady CSS and DOM initially.
* After the HTML imports, the elements are rendered with native shadow DOM.
*/
function shadyThenShadowGetDOMInsidePage() {
  win.webContents.executeJavaScript(`
    require('./_server_execute_js')().hybridVersion();
    `);
}

/**
* Accesses and modifies the DOM inside the BrowserWindow and
* sends a serialized HTMLString as the response.
* This implementation is for apps that use shady DOM.
*/
function shadyGetDOMInsidePage() {
  win.webContents.executeJavaScript(`
    require('./_server_execute_js')().shadyVersion();
    `);
}

/**
* Accesses and modifies the DOM inside the BrowserWindow and
* sends a serialized HTMLString as the response.
* This implementation is for apps that use shadow DOM.
*/
function shadowGetDOMInsidePage() {
  win.webContents.executeJavaScript(`
    require('./_server_execute_js')().shadowVersion();
    `);
}
