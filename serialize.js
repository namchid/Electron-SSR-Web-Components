var htmlImportsString = '';
var htmlImportsSet = false;

function handleHTMLImports() {
    htmlImportsString = '';

    var htmlImports = document.querySelectorAll('link[rel="import"]');
    for(var i = 0; i < htmlImports.length; i++) {
        htmlImportsString += '<link ' + getAttributeString(htmlImports[i]).slice(0, -1) + '></link>';
    }
}

function getAttributeString(node) {
    var attributeString = '';

    var attributes = [];
    var values = [];

    for(var i = 0; i < node.attributes.length; i++) {
        var curr = node.attributes[i];
        attributes.push(curr.nodeName);
        values.push(curr.nodeValue);
    }

    for(var i = 0; i < attributes.length; i++) {
        attributeString += attributes[i] + '="' + values[i] + '" ';
    }

    return attributeString;
}

function recurseParseDOM(node) {
    if (node == null) return '';

    var tag = node.tagName;
    var openTag = '';
    var closeTag = '';

    var htmlString = '';

    if(tag) {
        tag = tag.toLowerCase();

        var attributeString = ' ';

        // don't serialize this
        if(tag === 'link' && node.getAttribute('rel') === 'import') {
            if(!htmlImportsSet) {
                openTag = '<link rel="import" href="asyncFile.html" async>';
                closeTag = '</link>';
                htmlImportsSet = true;
            }
        } else {
            attributeString += + getAttributeString(node);
            openTag = '<' + tag + attributeString.slice(0, -1) + '>';
            closeTag = '</' + tag + '>';
        }
    }

    htmlString += openTag;

    // get inner html
    if(node.childNodes) {
        htmlString += parseChildNodes(node.childNodes);
    }
    if(node.shadowRoot) {
        htmlString += parseChildNodes(node.shadowRoot.childNodes);
    }

    htmlString += closeTag;

    return htmlString;
}

function parseChildNodes(nodes) {

    var htmlString = '';

    for(var i = 0; i < nodes.length; i++) {
        var nodeType = nodes[i].nodeType;

        if(nodeType == 3) {
            htmlString += nodes[i].nodeValue;
        } else if(nodeType == 8) {
            htmlString += '<!--' + nodes[i].nodeValue + '-->';
        } else {
            if(nodes[i].childNodes || nodes[i].shadowRoot) {
                htmlString += recurseParseDOM(nodes[i]);
            }
        }
    }

    return htmlString;
}