module.exports = function() {

  return {

    hybridVersion: function() {
      console.log("DONE")
      var ipcRenderer = require('electron').ipcRenderer;
      var asyncImports = '';
      var remote = require('electron').remote;
      var directory = remote.getGlobal('directory');
      var hash = require('string-hash'); 

      var htmlImports = document.querySelectorAll('link[rel="import"]');

      if(htmlImports.length > 0) {
        var html = document.cloneNode(true);
        html.querySelector('body').removeAttribute('unresolved');

        var imports = html.querySelectorAll('link[rel="import"]');
        var head = html.querySelector('head');
        var shadowPolymerScript = document.createElement('script');
        shadowPolymerScript.innerText = 'window.Polymer = { dom: "shadow", lazyRegister: true}';
        head.insertBefore(shadowPolymerScript, imports[0]);

        var hashString = '';
        imports.forEach((linkNode) => {
          asyncImports += linkNode.outerHTML;
          hashString += linkNode['href'];
          linkNode.parentNode.removeChild(linkNode);
        });
        var hashed = hash(hashString)
        ipcRenderer.send('setAsyncImports', hashed, asyncImports);

        var newImport = html.createElement('link');
        newImport.setAttribute('rel', 'import');
        newImport.setAttribute('href', '_asyncImport' + hashed + '.html');
        newImport.setAttribute('async', '');
        html.querySelector('head').appendChild(newImport);

        // Make sure pathnames are relative
        html.querySelectorAll('[url]').forEach((link) => { link.setAttribute('url', link.url.replace(directory, ''))});
        html.querySelectorAll('[src]').forEach((link) => { link.setAttribute('src', link.src.replace(directory, ''))});
        html.querySelectorAll('[href]').forEach((link) => { link.setAttribute('href', link.href.replace(directory, ''))});

        ipcRenderer.send('receiveSerializedDOM', html.documentElement.outerHTML, false);
      } else {
        ipcRenderer.send('receiveSerializedDOM', document.documentElement.outerHTML, false);
      }
    },

    shadyVersion: function() {
      var ipcRenderer = require('electron').ipcRenderer;
      var asyncImports = '';
      var remote = require('electron').remote;
      var directory = remote.getGlobal('directory');
      var hash = require('string-hash'); 

      var htmlImports = document.querySelectorAll('link[rel="import"]');

      if(htmlImports.length > 0) {
        var html = document.cloneNode(true);
        html.querySelector('body').removeAttribute('unresolved');

        var hashString = '';
        var imports = html.querySelectorAll('link[rel="import"]');
        imports.forEach((linkNode) => {
          asyncImports += linkNode.outerHTML;
          hashString += linkNode['href'];
          linkNode.parentNode.removeChild(linkNode);
        });
        var hashed = hash(hashString)
        ipcRenderer.sendSync('setAsyncImports', hashed, asyncImports)

        var newImport = html.createElement('link');
        newImport.setAttribute('rel', 'import');
        newImport.setAttribute('href', '_asyncImport' + hashed + '.html');
        newImport.setAttribute('async', '');
        html.querySelector('head').appendChild(newImport);

        // Make sure pathnames are relative
        html.querySelectorAll('[url]').forEach((link) => { link.setAttribute('url', link.url.replace(directory, ''))});
        html.querySelectorAll('[src]').forEach((link) => { link.setAttribute('src', link.src.replace(directory, ''))});
        html.querySelectorAll('[href]').forEach((link) => { link.setAttribute('href', link.href.replace(directory, ''))});

        ipcRenderer.send('receiveSerializedDOM', html.documentElement.outerHTML, true);
      } else {
        ipcRenderer.send('receiveSerializedDOM', document.documentElement.outerHTML, true);
      }

    }

  }

}