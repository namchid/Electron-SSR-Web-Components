const electron = require('electron'),
app = electron.app,
BrowserWindow = electron.BrowserWindow,
ipcMain = electron.ipcMain

global.directory = 'file://' + __dirname + '/'

const shadyServer = require('express')(),
shadowServer = require('express')(),
shadyPort = 3000,
shadowPort = 4000,
path = require('path'),
ngrok = require('ngrok')

const fs = require('fs'),
url = require('url')

let win

var listening = false,
shadyRes = null,
shadowRes = null,
shadyAsyncImports = '',
shadowAsyncImports = ''

const LRUCache = require('./lruCache'),
  cacheSize = 5, // arbitrary number
  cache = new LRUCache(cacheSize),
  hasher = require('string-hash')

// Setup for Electron app
function createWindow() {
  win = new BrowserWindow({width: 800, height: 600})
  win.loadURL(`file://${__dirname}/_server_index.html`)
  win.webContents.openDevTools()

  win.on('closed', () => {
    win = null
  })

  // Setup for Express server
  win.webContents.on('dom-ready', () => {
    startServer();
  })
}

app.on('ready', createWindow)

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    stopServer()
    app.quit()
  }
})

app.on('activate', function () {
  if (mainWindow === null) {
    createWindow()
  }
})

// IPC functions
ipcMain.on('receiveSerializedDOM', (_, contents, isShady) => {
  if(isShady) {
    shadyRes.end(contents)
  } else {
    shadowRes.end(contents)
  }
})

ipcMain.on('setAsyncImports', (event, key, value) => {
  cache.set('_asyncImport' + key + '.html', value)
  event.returnValue = true;
})

shadyServer.get(/\/index[0-9]*.html/, (req, res) => {
  win.loadURL('file://' + __dirname + req.url)
  shadyRes = res

  win.webContents.on('did-finish-load', () => {
    shadyGetDOMInsidePage()
  })
})

shadowServer.get(/\/index[0-9]*shadow.html/, (req, res) => {
  win.loadURL('file://' + __dirname + req.url)
  shadowRes = res

  win.webContents.on('did-finish-load', () => {
    // shadyThenShadowGetDOMInsidePage()
    shadowGetDOMInsidePage()
  })
})

shadyServer.get(/_asyncImport[0-9]+/, (req, res) => {
  getAsyncImport(req.url.substring(1), res)
})

shadowServer.get(/_asyncImport[0-9]+/, (req, res) => {
  getAsyncImport(req.url.substring(1), res)
})

function getAsyncImport(key, res) {
  res.end('' + cache.get(key))
}

shadyServer.get('/*', returnRequest)

shadowServer.get('/*', returnRequest)

// Express Server
function startServer() {
  if(!listening) {
    shadyServer.listen(shadyPort)

    shadowServer.listen(shadowPort, () => {
      shadowServer.emit('listening', null)
    })

    ngrok.connect(shadyPort, (err, url) => { console.log('Shady ngrok url: ' + url) })
    ngrok.connect(shadowPort, (err, url) => { console.log('Shadow ngrok url: ' + url) })
  }
}

function stopServer() {
  shadyServer.close()
  shadowServer.close()
}

function returnRequest(req, res) {
  var parsed_url = url.parse(req.url, true)
  var filename = parsed_url.pathname.substr(1)

  var p = path.join(__dirname, filename)
  res.sendFile(p)
}

shadowServer.on('listening', () => {
  listening = true
})

function shadyThenShadowGetDOMInsidePage() {
  win.webContents.executeJavaScript(`
    require('./_server_execute_js')().hybridVersion();
    `);
}

function shadyGetDOMInsidePage() {
  win.webContents.executeJavaScript(`
    require('./_server_execute_js')().shadyVersion();
    `);
}

function shadowGetDOMInsidePage() {
  win.webContents.executeJavaScript(`
    require('./_server_execute_js')().shadowVersion();
    `)
}
