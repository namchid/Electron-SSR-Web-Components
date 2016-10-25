function recurseParseDOM(node) {
    if(node == null) return '';

    var outerHTML = '';

    if(node.outerHTML) {
        var outerHTML = node.outerHTML.split('>');
        console.log(outerHTML + '>');
    }

    // this is the "innerHTML"
    if(node.childNodes) {
        parseChildNodes(node.childNodes);
    } 
    if(node.shadowRoot) {
        parseChildNodes(node.shadowRoot.childNodes);
    }

    if(outerHTML) {
        var tag = node.tagName;
        console.log('</' + tag.toLowerCase() + '>');
    }
}

function parseChildNodes(nodes) {

    for(var i = 0; i < nodes.length; i++) {
        if(nodes[i].innerHTML) {
            console.log(nodes[i].innerHTML);
        }
        if(nodes[i].shadowRoot) {
            recurseParseDOM(nodes[i]);
        } else if(nodes[i].childNodes) {
            recurseParseDOM(nodes[i]);
        }
    }
}