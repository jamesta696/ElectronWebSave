var ipcRenderer = require('electron').ipcRenderer;
const jsdom = require("jsdom");
const { JSDOM } = jsdom;
var fs = require('fs');





// document.addEventListener("DOMContentLoaded", function(e) {

	
// 	setTimeout(function(){
// 		var dom;
// 	    dom = new JSDOM( document.documentElement.outerHTML, {
// 	        resources   : "usable",
// 	        runScripts  : "dangerously"
// 	    });
// 	    var doc = dom.window.document;

// 	    var iframes = [].slice.call(doc.querySelectorAll("iframe"));
// 			iframes.forEach(iframe => {
// 				var _iframe = iframe.cloneNode();
// 	            iframe.parentNode.replaceChild(_iframe,iframe);
// 				_iframe.id = randomId();
// 				_iframe.setAttribute("data-src", iframe.src);
// 				_iframe.src = "iframe_" + _iframe.id + ".html"
// 			});
// 		ipcRenderer.sendToHost('html-content' , dom.window.document.documentElement.outerHTML);
// 		// ipcRenderer.sendToHost('html-content' , document.documentElement.outerHTML);
// 	},5000)
	
// },false);

// window.addEventListener("load", function(e) {
	
// }, false)


function randomId(low, high) {
	low = low||100000;
	high = high||1000000;
    return parseInt(Math.random() * (high - low) + low);
}
