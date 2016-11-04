const pjson = require('./package')

const electron = require('electron'),
app = electron.app,
BrowserWindow = electron.BrowserWindow,
ipcMain = electron.ipcMain

const express = require('express'),
expressApp = express(),
port = 3000,
path = require('path')

const fs = require('fs'),
url = require('url')

let win

var mimeType = ''
var listening = false
var gRes = null, gReq = null
var asyncImports = ''
var shadowStyles = ''

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
ipcMain.on('receiveSerializedDOM', (_, contents) => {
  gRes.end(contents)
})

ipcMain.on('setAsyncImports', (_, contents) => {
  asyncImports = contents
})

ipcMain.on('setShadowStyles', (_, contents) => {
  shadowStyles = contents
})

expressApp.get(pjson['entry-pages'], (req, res) => {
  win.loadURL('file://' + __dirname + req.url)
  gRes = res
  gReq = req

  win.webContents.on('did-finish-load', () => {
    getDOMInsidePage()
  })
})

expressApp.get('/asyncFile.html', (req, res) => {
  res.end(asyncImports)
  // asyncImports = ''
})

expressApp.get('/shadowStyles.html', (req, res) => {
  res.end(shadowStyles)
  // asyncImports = ''
})

expressApp.get('/*', (req, res) => {
  var parsed_url = url.parse(req.url, true)
  var filename = parsed_url.pathname.substr(1)

  var p = path.join(__dirname, filename)
  res.sendFile(p)
})

// Express Server
function startServer() {
  if(!listening) {
    expressApp.listen(port, () => {
      expressApp.emit('listening', null)
    })
  }
}

function stopServer() {
  expressApp.close()
}

expressApp.on('listening', () => {
  listening = true
})

function getDOMInsidePage() {
  win.webContents.executeJavaScript(`
    var ipcRenderer = require('electron').ipcRenderer;
    var serializer = require('dom-serialize');
    var asyncImports = '';

    var htmlImports = document.querySelectorAll('link[rel="import"]');

    if(htmlImports.length > 0) {
      var html = document.cloneNode(true);
      html.querySelector('body').removeAttribute('unresolved');

      var imports = html.querySelectorAll('link[rel="import"]');
      imports.forEach((linkNode) => {
        asyncImports += linkNode.outerHTML;
        linkNode.parentNode.removeChild(linkNode);
      });
      ipcRenderer.send('setAsyncImports', asyncImports);

      var newImport = html.createElement('link');
      newImport.setAttribute('rel', 'import');
      newImport.setAttribute('href', 'asyncFile.html');
      newImport.setAttribute('async', '');
      html.querySelector('head').appendChild(newImport);

      ipcRenderer.send('receiveSerializedDOM', html.documentElement.outerHTML);
    } else {
      ipcRenderer.send('receiveSerializedDOM', document.documentElement.outerHTML);
    }
  `);
}
