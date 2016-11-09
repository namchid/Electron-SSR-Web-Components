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
    var importsString = '';
    var removedImports = new Set();
  `);

  /** Taken from Kevin's WC-SSR (link in README)**/
  win.webContents.executeJavaScript(`
    var ipcRenderer = require('electron').ipcRenderer;
    var importsString = '';
    var removedImports = new Set();

    var shadowStyleList = [];
    var shadowStyleMap = {};
  `);

  /** Taken from Kevin's WC-SSR (link in README)**/
  win.webContents.executeJavaScript(`
    function removeScripts(container) {
      var scripts = container.querySelectorAll('script');
      [].slice.call(scripts).forEach(function(el) {
        el.remove();
      });
    }
  `);

  /** Modified from Kevin's WC-SSR (link in README)**/
  win.webContents.executeJavaScript(`
    function removeImports(container) {
      var imports = container.querySelectorAll('link[rel=import]');
      [].slice.call(imports).forEach(function(el) {
        var temp = el.outerHTML;
        if(!removedImports.has(temp)) {
          importsString += el.outerHTML + String.fromCharCode(13);
          removedImports.add(temp);
        }
        el.remove();
      });
    }
  `);

  /** Taken from Kevin's WC-SSR (link in README)**/
  win.webContents.executeJavaScript(`
    function replaceStyles(container) {
      var styles = container.querySelectorAll('style');
      [].slice.call(styles).forEach(function(el) {
        var style = shadowStyleMap[el.textContent];
        if (!style) {
          style = el;
          shadowStyleMap[style.textContent] = style;
          style.index = shadowStyleList.length;
          style.setAttribute('shadow-style', style.index);
          shadowStyleList.push(style);
        }
        var shadowStyle = document.createElement('shadow-style');
        shadowStyle.setAttribute('index', style.index);
        el.parentNode.replaceChild(shadowStyle, el);
      });
    }
  `);

  /** Taken from Kevin's WC-SSR (link in README)**/
  win.webContents.executeJavaScript(`
    function replaceShadowRoot(el, clonedEl) {
      if (el.shadowRoot) {
        var shadowRoot = document.createElement('shadow-root');
        for (var e=el.shadowRoot.firstChild; e; e=e.nextSibling) {
          shadowRoot.appendChild(e.cloneNode(true));
        }
        removeImports(shadowRoot);
        replaceStyles(shadowRoot);
        replaceShadowRoots(el.shadowRoot, shadowRoot);
        clonedEl.insertBefore(shadowRoot, clonedEl.firstChild);
      }
    }
  `);

  /** Taken from Kevin's WC-SSR (link in README)**/
  win.webContents.executeJavaScript(`
      function replaceShadowRoots(container, clonedContainer) {
        var elements = container.querySelectorAll('*');
        var clonedElements = clonedContainer.querySelectorAll('*');
        [].slice.call(elements).forEach(function(el, i) {
          replaceShadowRoot(el, clonedElements[i]);
        });
        return clonedContainer;
      }
  `);
  
  /** Taken from Kevin's WC-SSR (link in README)**/
  win.webContents.executeJavaScript(`
    function insertShadowStyles(doc, list) {
      var template = document.createElement('template');
      template.setAttribute('shadow-styles', '');
      list.forEach(function(style) {
        template.content.appendChild(style);
      });
      doc.querySelector('head').appendChild(template);
    }
  `);

  /** Taken from Kevin's WC-SSR (link in README)**/
  win.webContents.executeJavaScript(`
    function registerShadowRoot() {
      var t = document.querySelector('template[shadow-styles]');
      var shadowStyles = t && t.content.children;
      var proto = Object.create(HTMLElement.prototype);
      proto.createdCallback = function() {
        var parent = this.parentNode;
        if (parent) {
          var shadowRoot = parent.createShadowRoot();
          var child;
          while ((child = this.firstChild)) {
            if (child.localName == 'shadow-style') {
              child.remove();
              child = shadowStyles[child.getAttribute('index')].cloneNode(true);
            }
            shadowRoot.appendChild(child);
          }
          this.remove();
        }
      };
      document.registerElement('shadow-root', {prototype: proto});
    }
  `);

  win.webContents.executeJavaScript(`
    function insertPolymerShadowDom() {
      var head = document.querySelector('head');

      var scriptNode = document.createElement('script');
      scriptNode.setAttribute('src', 'bower_components/webcomponentsjs/webcomponents-lite.js');
      head.insertBefore(scriptNode, head.firstChild);

      var script = document.createElement('script');
      script.textContent = 'window.Polymer = {dom: "shadow", lazyRegister: true}';
      head.insertBefore(script, head.firstChild.nextSibling);
    }
  `);

  win.webContents.executeJavaScript(`
    function insertImportLink() {
      var linkNode = document.createElement('link');
      linkNode.setAttribute('rel', 'import');
      linkNode.setAttribute('href', 'asyncFile.html');
      linkNode.setAttribute('async', '');
      var head = document.querySelector('head');
      head.appendChild(linkNode);
    }
  `);

  win.webContents.executeJavaScript(`
    function registerAndReinsert() {
      insertPolymerShadowDom();
      registerShadowRoot();
      insertImportLink();
    }
  `);

  win.webContents.executeJavaScript(`
    function insertScriptsAndImports(clonedDoc) {
      var scripts = document.createElement('script');

      scripts.textContent = insertPolymerShadowDom.toString();
      scripts.textContent += String.fromCharCode(13) + registerShadowRoot.toString();
      scripts.textContent += String.fromCharCode(13) + insertImportLink.toString();
      scripts.textContent += String.fromCharCode(13) + '(' + registerAndReinsert.toString() + ')();';

      clonedDoc.querySelector('head').appendChild(scripts);
    }
  `);

  /** Modified from Kevin's WC-SSR (link in README)**/
  win.webContents.executeJavaScript(`
    var doc = document.documentElement;
    var clonedDoc = doc.cloneNode(true);
    clonedDoc.querySelector('body').removeAttribute('unresolved');

    replaceShadowRoots(doc, clonedDoc);
    removeImports(clonedDoc);
    ipcRenderer.send('setAsyncImports', importsString);
    removeScripts(clonedDoc);
    insertShadowStyles(clonedDoc, shadowStyleList);
    insertScriptsAndImports(clonedDoc);

    ipcRenderer.send('receiveSerializedDOM', clonedDoc.outerHTML);
  `);
}
