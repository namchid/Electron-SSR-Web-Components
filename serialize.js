var htmlImports = [];

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

        openTag = '<' + tag + attributeString + '>';
        closeTag = '</' + tag + '>';
    }

    htmlString += openTag;
    htmlString += closeTag;

    return htmlString;
}

// function recurseParseDOM(node) {
//     if(node == null) return '';

//     var outerHTML = '';

//     if(node.outerHTML) {
//         var outerHTML = node.outerHTML.split('>');
//         console.log(outerHTML[0] + '>');
//     }

//     // var tag = node.tagName;

//     if(tag) {
//         var atts = [];

//         console.log('<' + tag + '>');
//     }

//     // this is the "innerHTML"
//     if(node.childNodes) {
//         parseChildNodes(node.childNodes);
//     } 
//     if(node.shadowRoot) {
//         parseChildNodes(node.shadowRoot.childNodes);
//     }

//     if(outerHTML) {
//         var tag = node.tagName;
//         console.log('</' + tag.toLowerCase() + '>');
//     }
// }

// function parseChildNodes(nodes) {

//     for(var i = 0; i < nodes.length; i++) {
//         if(nodes[i].innerHTML) {
//             console.log(nodes[i].innerHTML);
//         }
//         if(nodes[i].shadowRoot) {
//             recurseParseDOM(nodes[i]);
//         } else if(nodes[i].childNodes) {
//             recurseParseDOM(nodes[i]);
//         }
//     }
// }

// recurseParseDOM(document.documentElement);