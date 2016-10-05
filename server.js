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
var asyncFile = 'asyncFile.html'

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

expressApp.get(pjson['entry-pages'], (req, res) => {
    win.loadURL('file://' + __dirname + req.url)
    gRes = res
    gReq = req

    win.webContents.on('did-finish-load', () => {
        getDOMInsidePage()
    })
})

expressApp.get('/asyncFile.html', (req, res) => {
    var p = path.join(__dirname, asyncFile)
    res.sendFile(p)
    // fs.unlinkSync(asyncFile)
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
        var ipc = require('electron').ipcRenderer;
        var serializer = require('dom-serialize');
        var htmlImports = document.querySelectorAll('link[rel="import"]');
        
        // if more than one html import, replace it by a link to another html import
        if(htmlImports.length > 1) {
            console.log(htmlImports);
            console.log(serializer(htmlImports));
            var asyncImports = serializer(htmlImports);

            for(var i = 0; i < htmlImports.length; i++) {
                htmlImports[i].parentNode.removeChild(htmlImports[i]);
            }

            // write contents to file
            var asyncFile = 'asyncFile.html'

            var fs = require('fs');
            fs.writeFile(asyncFile, asyncImports, (err) => {
                if(err) {
                    return console.log(err)
                }
                console.log("HEREEEE~~~~~~~~~");
                document.querySelector('head').innerHTML += 
                '<link rel="import" href="' + asyncFile + '" async></link>';

                ipc.send('receiveSerializedDOM', serializer(document));  
            });
        } else {
            for(var i = 0; i < htmlImports.length; i++) {
                htmlImports[i].setAttribute('async', '');
            }
            ipc.send('receiveSerializedDOM', serializer(document));  
        }  
    `);
}
