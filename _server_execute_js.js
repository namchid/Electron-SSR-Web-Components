module.exports = function() {
  return {
    hybridVersion: function() {
      const ipcRenderer = require('electron').ipcRenderer;

      if (document.querySelectorAll('link[rel="import"]').length > 0) {
        let html = document.cloneNode(true);
        html.querySelector('body').removeAttribute('unresolved');

        let shadowPolymerScript = document.createElement('script');
        shadowPolymerScript.innerText =
            'window.Polymer = { dom: "shadow", lazyRegister: true}';
        let imports = html.querySelectorAll('link[rel="import"]');
        html.querySelector('head').insertBefore(shadowPolymerScript,
          imports[0]);

        removeImportsAndSetInCache(html);
        makePathsRelative(html);

        ipcRenderer.send('receiveSerializedDOM',
                         html.documentElement.outerHTML, false);
      } else {
        ipcRenderer.send('receiveSerializedDOM',
                         document.documentElement.outerHTML, false);
      }
    },
    shadyVersion: function() {
      const ipcRenderer = require('electron').ipcRenderer;

      if (document.querySelectorAll('link[rel="import"]').length > 0) {
        let html = document.cloneNode(true);
        html.querySelector('body').removeAttribute('unresolved');
        removeImportsAndSetInCache(html);
        makePathsRelative(html);

        ipcRenderer.send('receiveSerializedDOM',
                         html.documentElement.outerHTML, true);
      } else {
        ipcRenderer.send('receiveSerializedDOM',
                         document.documentElement.outerHTML, true);
      }
    },
    /** Modified from Kevin's WC-SSR (link in README)**/
    shadowVersion: function() {
      /**
      * Removes scripts.
      * @param {Object} container The element to remove scripts from.
      */
      function removeScripts(container) {
        let scripts = container.querySelectorAll('script');
        [].slice.call(scripts).forEach(function(el) {
          el.remove();
        });
      }

      /**
      * Removes HTML imports.
      * @param {Object} container The element to remove the import nodes from.
      */
      function removeImports(container) {
        const imports = container.querySelectorAll('link[rel=import]');
        [].slice.call(imports).forEach(function(el) {
          const temp = el.outerHTML;
          if (!removedImports.has(temp)) {
            hashKey += el['href'];
            hashValue += el.outerHTML + space;
            removedImports.add(temp);
          }
          el.remove();
        });
      }

      /**
      * Removes styles in shadow roots and stores them in a template.
      * @param {Object} container The element to remove styles from.
      */
      function replaceStyles(container) {
        const styles = container.querySelectorAll('style');
        [].slice.call(styles).forEach(function(el) {
          let style = shadowStyleMap[el.textContent];
          if (!style) {
            style = el;
            shadowStyleMap[style.textContent] = style;
            style.index = shadowStyleList.length;
            style.setAttribute('shadow-style', style.index);
            shadowStyleList.push(style);
          }
          let shadowStyle = document.createElement('shadow-style');
          shadowStyle.setAttribute('index', style.index);
          el.parentNode.replaceChild(shadowStyle, el);
        });
      }

      /**
      * Remove the shadow root of an element. Does the following:
      * - Removes its script tag.
      * - Removes HTML imports.
      * - Replaces its shadow root styles and stores them as a template.
      * @param {Object} el The original element, which is not modified.
      * @param {Object} clonedEl The cloned element with modifications
      * listed above.
      */
      function replaceShadowRoot(el, clonedEl) {
        if (el.shadowRoot) {
          let shadowRoot = document.createElement('shadow-root');
          for (let e = el.shadowRoot.firstChild; e; e = e.nextSibling) {
            shadowRoot.appendChild(e.cloneNode(true));
          }
          removeImports(shadowRoot);
          replaceStyles(shadowRoot);
          replaceShadowRoots(el.shadowRoot, shadowRoot);
          clonedEl.insertBefore(shadowRoot, clonedEl.firstChild);
        }
      }

      /**
      * Removes all shadow roots from elements in the container.
      * @param {Object} container The original container, which is not modified.
      * @param {Object} clonedContainer The cloned container with modifications.
      * @return {Object} The cloned container with modifications.
      */
      function replaceShadowRoots(container, clonedContainer) {
        const elements = container.querySelectorAll('*');
        const clonedElements = clonedContainer.querySelectorAll('*');
        [].slice.call(elements).forEach(function(el, i) {
          replaceShadowRoot(el, clonedElements[i]);
        });
        return clonedContainer;
      }

      /**
      * Inserts styles removed from shadow roots into a template.
      * @param {Object} doc The document to insert the template with styles.
      * @param {Object} list The list of previously removed styles.
      */
      function insertShadowStyles(doc, list) {
        let template = document.createElement('template');
        template.setAttribute('shadow-styles', '');
        list.forEach(function(style) {
          template.content.appendChild(style);
        });
        doc.querySelector('head').appendChild(template);
      }

      /**
      * Registers custom elements by attaching shadow roots with proper styling.
      */
      function registerShadowRoot() {
        const t = document.querySelector('template[shadow-styles]');
        const shadowStyles = t && t.content.children;
        let proto = Object.create(HTMLElement.prototype);
        proto.createdCallback = function() {
          let parent = this.parentNode;
          if (parent) {
            let shadowRoot = parent.createShadowRoot();
            let child;
            while ((child = this.firstChild)) {
              if (child.localName == 'shadow-style') {
                child.remove();
                child = shadowStyles[child.getAttribute('index')].cloneNode(
                    true);
              }
              shadowRoot.appendChild(child);
            }
            this.remove();
          }
        };
        document.registerElement('shadow-root', {prototype: proto});
      }

      /**
      * Inserts script in DOM to enforce shadow DOM.
      */
      function insertPolymerShadowDom() {
        const head = document.querySelector('head');

        let scriptNode = document.createElement('script');
        scriptNode.setAttribute(
            'src',
            'bower_components/webcomponentsjs/webcomponents-lite.js');
        head.insertBefore(scriptNode, head.firstChild);

        let script = document.createElement('script');
        script.textContent =
            'window.Polymer = {dom: "shadow", lazyRegister: true}';
        head.insertBefore(script, head.firstChild.nextSibling);
      }

      /**
      * Inserts route for asynchronously requesting the HTML imports.
      * @param {String} hashedNum The hashed key corresponding to the HTML
      * imports string in the server's cache.
      */
      function insertImportLink(hashedNum) {
        let linkNode = document.createElement('link');
        linkNode.setAttribute('rel', 'import');
        linkNode.setAttribute('href', hashedNum);
        linkNode.setAttribute('async', '');
        const head = document.querySelector('head');
        head.appendChild(linkNode);
      }

      /**
      * Registers custom elements, shadow roots, and reinserts link to
      * import HTML.
      * @param {String} hashedNum The hashed key corresponding to the HTML
      * imports string in the server's cache.
      */
      function registerAndReinsert(hashedNum) {
        insertPolymerShadowDom();
        registerShadowRoot();
        insertImportLink(hashedNum);
      }

      /**
      * Inserts scripts for custom element registration, upgrade, and HTML
      * imports into the head of the document and executes them upon page load.
      * @param {Object} clonedDoc The DOM to insert the scripts into.
      * @param {String} hashedNum The hashed key corresponding to the HTML
      * imports string in the server's cache.
      */
      function insertScriptsAndImports(clonedDoc, hashedNum) {
        let scripts = document.createElement('script');

        scripts.textContent = insertPolymerShadowDom.toString();
        scripts.textContent += space + registerShadowRoot.toString();
        scripts.textContent += space + insertImportLink.toString();
        scripts.textContent += space + '(' +
                               registerAndReinsert.toString() +
                               ')("_asyncImport' + hashedNum + '.html");';

        clonedDoc.querySelector('head').appendChild(scripts);
      }

      const ipcRenderer = require('electron').ipcRenderer;
      const hash = require('string-hash');
      let hashKey = '';
      let hashValue = '';
      let removedImports = new Set();
      let shadowStyleList = [];
      let shadowStyleMap = {};
      const space = String.fromCharCode(13);

      const doc = document.documentElement;
      let clonedDoc = doc.cloneNode(true);
      clonedDoc.querySelector('body').removeAttribute('unresolved');

      replaceShadowRoots(doc, clonedDoc);
      removeImports(clonedDoc);
      hashKey = hash(hashKey);
      if(hashValue != '') {
        ipcRenderer.send('setAsyncImports', hashKey, hashValue);
      }
      removeScripts(clonedDoc);
      insertShadowStyles(clonedDoc, shadowStyleList);
      insertScriptsAndImports(clonedDoc, hashKey);

      makePathsRelative(clonedDoc);

      ipcRenderer.send('receiveSerializedDOM', clonedDoc.outerHTML, false);
    },
  };
};

/**
* Removes path to the current directory to make URLs relative.
* @param {String} container The element to look query for URLs.
*/
function makePathsRelative(container) {
  const remote = require('electron').remote;
  const directory = remote.getGlobal('directory');
  container.querySelectorAll('[url]').forEach(
      (link) => {
          link.setAttribute('url', link.url.replace(directory, ''));
        });
  container.querySelectorAll('[src]').forEach(
      (link) => {
          link.setAttribute('src', link.src.replace(directory, ''));
        });
  container.querySelectorAll('[href]').forEach(
      (link) => {
          link.setAttribute('href', link.href.replace(directory, ''));
        });
};

/**
* Removes HTML imports and stores them in cache for later retrieval.
* @param {String} container The element to remove HTML imports from.
*/
function removeImportsAndSetInCache(container) {
  const hash = require('string-hash');
  let hashKey = '';
  let hashValue = '';

  let imports = container.querySelectorAll('link[rel="import"]');
  imports.forEach((linkNode) => {
    hashValue += linkNode.outerHTML;
    hashKey += linkNode['href'];
      linkNode.parentNode.removeChild(linkNode);
    });
  hashKey = hash(hashKey);
  require('electron').ipcRenderer.sendSync('setAsyncImports',
    hashKey, hashValue);

  let newImport = container.createElement('link');
  newImport.setAttribute('rel', 'import');
  newImport.setAttribute('href', '_asyncImport' + hashKey + '.html');
  newImport.setAttribute('async', '');
  container.querySelector('head').appendChild(newImport);
}
