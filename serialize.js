
function recurseParseDOM(node) {
    if(node == null) return '';

    var tag = node.tagName;
    if(tag) {
        console.log('<' + tag + '>');
    }

    // this is the "innerHTML"
    if(node.childNodes) {
        parseChildNodes(node.childNodes);
    } 
    if(node.shadowRoot) {
        parseChildNodes(node.shadowRoot.childNodes);
    }
    // if(node.innerHTML) {
    //     console.log(node.innerHTML);
    // }

    if(tag) {
        console.log('</' + tag + '>');
    }
}

function parseChildNodes(nodes) {

    for(var i = 0; i < nodes.length; i++) {
        if(nodes[i].innerHTML) {
            console.log(nodes[i].innerHTML);
        }

        if(nodes[i].shadowRoot) {
            recurseParseDOM(nodes[i]);
            //console.log(nodes[i])
            //console.log(nodes[i].shadowRoot.childNodes)
            //recurseParseDOM(nodes[i].shadowRoot.childNodes);
        } else if(nodes[i].childNodes) {
            recurseParseDOM(nodes[i]);
        } 



        // else {
        //     var tag = nodes[i].tagName;
        //     if(tag) {
        //         console.log('<' + tag + '>');
        //         console.log(nodes[i].innerHTML);
        //         console.log('</' + tag + '>');
        //     } else {
        //         console.log('.....text.....')
        //     }
        // }
    }
}


// var domString = '';
// var cloned = document.cloneNode(true);
// var stack = [];

// function serialize(node) {

//     stack = [].slice.call(document.querySelectorAll('*'));
//     replaceAndSerialize();

// }

// function replaceAndSerialize() {
//     if(stack.length < 2) return;

// }


// function replaceAndSerializeHelper() {
//     var top = stack.pop();

//     var temp = [].slice.call(top.querySelectorAll('*'));


// }

// serialize(cloned);