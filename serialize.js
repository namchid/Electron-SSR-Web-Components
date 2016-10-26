// var htmlImports = []; // TODO: add implementation for this

function recurseParseDOM(node) {
    if (node == null) return '';

    var tag = node.tagName;
    var openTag = '';
    var closeTag = '';

    var htmlString = '';

    if(tag) {
        tag = tag.toLowerCase();
        var attributes = [];
        var values = [];

        for(var i = 0; i < node.attributes.length; i++) {
            var curr = node.attributes[i];
            attributes.push(curr.nodeName);
            values.push(curr.nodeValue);
        }

        var attributeString = ' ';
        for(var i = 0; i < attributes.length; i++) {
            attributeString += attributes[i] + '="' + values[i] + '" ';
        }

        // don't serialize this
        if(tag === 'link' && node.getAttribute('rel') === 'import') {
            attributeString += 'async ';
        }

        openTag = '<' + tag + attributeString.slice(0, -1) + '>';
        closeTag = '</' + tag + '>';
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

        if(nodeType == 3 || nodeType == 8) {
            htmlString += nodes[i].nodeValue;
        } else {
            if(nodes[i].childNodes || nodes[i].shadowRoot) {
                htmlString += recurseParseDOM(nodes[i]);
            }
        }
    }

    return htmlString;
}