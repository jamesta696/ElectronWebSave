const request = require("request");
const fs = require("fs");
var stripJs = require('strip-js');
const jsdom = require("jsdom");
const { JSDOM } = jsdom;
// var CssDom = require('cssdom');
const {dialog} = require('electron').remote

window.onresize = doLayout;
var isLoading = false;
var iframeShadowWebViews = {};
var html = "";
var downloaded_filenames = {};

var alreadyInitShadowIframes=false;

onload = function() {
  var webview = document.querySelector('webview');


  // webview.addEventListener("ipc-message", function (e) {
  //         if (e.channel === "html-content") {
  //             html = e.args[0];
  //             initializeIframesAsWebViews(html);
  //         }
  // }, false)


  // webview.addEventListener('console-message', (e) => {
  //   //console.log(e.message)
  // })

  doLayout();



  function randomId(low, high) {
    low = low||100000;
    high = high||1000000;
    return parseInt(Math.random() * (high - low) + low);
  }


  
  function initializeIframesAsWebViews(fullHTMLDocumentString){
    if(alreadyInitShadowIframes) {
      return
    }

    var dom;

    dom = new JSDOM( fullHTMLDocumentString, {
        resources   : "usable",
        runScripts  : "dangerously"
    });
    var doc = dom.window.document;
    var iframes = [].slice.call(doc.querySelectorAll("iframe"));

    alreadyInitShadowIframes = true;
    iframes.forEach(iframe => {
      // iframe.id = iframe.id||randomId();
      if(iframe.src && iframe.src.length > 0) {
        console.log("iframe src", iframe.src)
        buildShadowWebView(iframe)
      }
    });
    
  }

  function buildShadowWebView(iframe){
    var _webview = document.createElement('webview');
        _webview.preload="./iframe.js"
        _webview.src = iframe.getAttribute("data-src");
        // _webview.style.width = 
        _webview.setAttribute("data-shadow-id", iframe.id);
        _webview.style.opacity = "0";
        _webview.addEventListener("ipc-message", function (e) {  
          if (e.channel === "iframe-content") {
              _webview._outerHTML = e.args[0];
              iframeShadowWebViews[iframe.id]= _webview;
              // console.log("shadow-id", _webview.getAttribute("data-shadow-id"))
              // webview.executeJavaScript("console.log(document.querySelector('body'))",true)
          }
      }, false);
      document.body.appendChild(_webview);
      // var load = () => {
      //   _webview.removeEventListener('did-finish-load', load);
      // };
      // _webview.addEventListener('did-finish-load', load)
      
  }

  async function saveHTML(src, fullFilePath, assetFolderName){
    /*var rootFolderPath = fullFilePath.substr(0,fullFilePath.lastIndexOf("/")+1)
    var safeHtml = stripJs(src);
    var iFrameReWrittenHtml = await saveInlineIFrames(safeHtml,rootFolderPath);
    var cssReWrittenHtml = await saveCssLinks(iFrameReWrittenHtml,rootFolderPath);
    var imgsReWrittenHtml = await saveInlineImages(cssReWrittenHtml,rootFolderPath);
    var cssImageUrlsReWrittenHtml = await saveInlineCssURLImages(imgsReWrittenHtml,rootFolderPath);
    var videoReWrittenHtml = await saveInlineVideoSources(cssImageUrlsReWrittenHtml,rootFolderPath);
    

    fs.writeFile(fullFilePath, videoReWrittenHtml, function (err) {
      if(err){console.error(err)}
        console.info("CAPTURE COMPLETED")
    }); */

  }

  async function processHTML(fullFilePath){
    var root   = fullFilePath.substr(0,fullFilePath.lastIndexOf("/")+1);
    var file   = fullFilePath.substr(fullFilePath.lastIndexOf("/")+1);
    var assets = file.replace(".html","_files");
    var assetPath = root + assets;

    var fileContent = fs.readFileSync(fullFilePath, "utf8");
    var safeHtml = stripJs(fileContent);
        // safeHtml = await saveInlineCssURLImages(safeHtml,assetPath);

    fs.writeFile(fullFilePath, safeHtml, (err) => {
      if (err) {
          alert("An error ocurred updating the file" + err.message);
          console.log(err);
          return;
      }
  
      alert("The file has been stripped of js and succesfully saved");
    });
  }


  async function saveInlineIFrames(html,rootFolderPath){
    return new Promise(function(resolve, reject) {
      const dom = new JSDOM(html,{resources: "usable",runScripts: "dangerously"});
      
      var iframes = [].slice.call(dom.window.document.querySelectorAll("iframe"));
      var totalIframes = iframes.length;
      var index=0;

      if(iframes.length > 0) {
        iframes.forEach(iframe => {
          if(iframe.id && iframe.id.length > 0){
          // var iframehtml = iframe.contentWindow.document;
            console.log("XXiframe html: " + iframe.id, (iframeShadowWebViews[iframe.id])._outerHTML)
            var fileName = "iframe_" + iframe.id + ".html"
            // var _iframe = iframe.cloneNode();
            // iframe.parentNode.replaceChild(_iframe,iframe);
            // dom.window.document.body.appendChild(_iframe)
            //iframe = _iframe;

            var content = (iframeShadowWebViews[iframe.id])._outerHTML;
            saveToDisk(content, rootFolderPath, fileName, function(){
              index++;
              // _iframe.src = fileName;
              console.log("successfully saved iframe .html as", fileName)
              if(index >= totalIframes) {
                console.log("ALL IFRAME DOWNLOADS COMPLETE");
                resolve(dom.window.document.documentElement.outerHTML)
              }
            })
            resolve(html)
          }
        });//end iframes.forEach
      }
      else {
        resolve(html)
      }
    })
  }

  async function saveInlineVideoSources(html,rootFolderPath){
    return new Promise(function(resolve, reject) {
      const dom = new JSDOM(html);
      
      var videos = [].slice.call(dom.window.document.querySelectorAll("video source"));
      var totalVideos = videos.length;
      var index=0;

      if(videos.length > 0) {
        videos.forEach(video => {
          download(video.src,rootFolderPath, function(filename){
            index++;
            video.src = filename;
            // img.removeAttribute("data-srcset");
            // img.removeAttribute("srcset");
            //console.log("successfully downloaded video", filename)
            if(index >= totalVideos) {
              console.log("ALL VIDEO DOWNLOADS COMPLETE");
              // console.warn(dom.window.document.documentElement.outerHTML);
              resolve(dom.window.document.documentElement.outerHTML)
            }
          })
        });
      }
      else {
        resolve(html)
      }
    })
  }


  async function saveInlineCssURLImages(html,rootFolderPath){
    var assetfolder = rootFolderPath.substr(rootFolderPath.lastIndexOf("/")+1)
    console.log("rootFolderPath",rootFolderPath)
    var reg =/url[\s\t\n]*\([\'|\"|\&quot\;]*([:\/\w\,\.\n\r\u2028\u2029\u0085\s\t\-\+\=\'\"\_0-9A-Za-z\?]+)[\'|\"|\&quot\;]*\)\;?/mig;
    console.log("matches", html.match(reg))
    return new Promise(function(resolve, reject) {
      console.log("Promise")
      html = html.replace(reg,async (full, uri)=>{
        console.log("replace css image uri: " + uri);
        var newuri = "url(" + assetfolder + "/" + (uri.substr(uri.lastIndexOf("/")+1)) + ");";

        console.log("with new css path: " + newuri);
        await download(uri,rootFolderPath, function(filename){})
        return newuri;
      });
      resolve(html);
      // const dom = new JSDOM(html);
      // var doc = dom.window.document.documentElement;
      // var styleTags = [].slice.call(doc.querySelectorAll("style"));
      // // console.log("style tags", styleTags);
      // var css;
      // styleTags.forEach(style => {
      //   // console.log(style.innerHTML);
      //   var s = style.innerHTML;
      //   var reg =/(url\(['|"|&quot;]?)([:\/\w,\.\n,\r,\u2028,\u2029,\u0085\-\+\=\'\"]+)(['|"|&quot;]?)/gmi;
      //   s=s.replace(reg, function(full,match){
      //     var filename = arguments[2].substr(arguments[2].lastIndexOf("/")+1)
      //                 return arguments[1] + filename + arguments[3]
      //   });
      //   style.innerHTML = s;
      // });

      // alert(doc.outerHTML)
        // resolve(doc.outerHTML)
      
      // var document = dom.window.document;//.documentElement.querySelectorAll("style");
      // console.log("dom.window.document",dom.window.document.styleSheets.length)
      // for(var i=0; i<dom.window.document.styleSheets.length; i++) {
      //   var sheet = dom.window.document.styleSheets[i];
      //   console.log("style sheet", sheet)
      // }

      


      /*var css = new CssDom(`
        a{
          background: url(images/test.png);
        }
        div {
          background-image: url(/images/samples.png);
        }
      `);
      var child = css.property('background');
      
      child.forEach(function(dom) {
        css.css(dom, {
          background: function(value) {
            return value.replace(/(url\(['|"]?)([^']*'|"[^"]*"|[^)]*)(['|"]?\))/, function(src) {
              console.log("regex args",arguments)
              var filename = arguments[2].substr(arguments[2].lastIndexOf("/")+1)
              return arguments[1] + filename + arguments[3]
            });
          }
        });
      });
      var child = css.property('background');
      console.log("background rules",child);

      
      resolve(html)*/
    })
  }


  async function saveInlineImages(html,rootFolderPath){
    return new Promise(function(resolve, reject) {
      const dom = new JSDOM(html);
      
      var imgs = [].slice.call(dom.window.document.querySelectorAll("img:not([src *= 'data:'])"));
      var totalImages = imgs.length;
      var index=0;

        imgs.forEach(img => {
          // var srcset = img.srcset||img.src
          var srcset = img.src;
              srcset = (srcset.indexOf("//")==0)?"http:"+srcset:srcset;
              // srcset = srcset.replace(" 2x","");
              // srcset = srcset||img.src;
          download(srcset,rootFolderPath, function(filename){
            index++;
            img.src = filename;
            // img.removeAttribute("data-srcset");
            // img.removeAttribute("srcset");
            //console.log("successfully downloaded", filename)
            if(index >= totalImages) {
              console.log("ALL IMAGE DOWNLOADS COMPLETE");
              // console.warn(dom.window.document.documentElement.outerHTML);
              resolve(dom.window.document.documentElement.outerHTML)
            }
          })
        });
    })
  }


  async function saveCssLinks(html,rootFolderPath){
    return new Promise(function(resolve, reject) {
      const dom = new JSDOM(html);
      
      var links = [].slice.call(dom.window.document.querySelectorAll("link[rel='stylesheet']"));
      var totalLinks = links.length;
      var index=0;

        links.forEach(link => {
          download(link.href,rootFolderPath, function(filename){
            index++;
            link.href = filename;
            link.removeAttribute("crossorigin");
            link.removeAttribute("integrity");
            //console.log("successfully downloaded", filename)
            if(index >= totalLinks) {
              console.log("ALL CSS DOWNLOADS COMPLETE");
              // console.warn(dom.window.document.documentElement.outerHTML);
              resolve(dom.window.document.documentElement.outerHTML)
            }
          })
        });
    })
  }


  async function download(url, rootFolderPath,callback){
    return new Promise(function(resolve, reject) {
      // var filename_extractor = /\/?([a-zA-Z0-9]+\.{1}([.a-zA-Z0-9]+))(?:[\?|!#][\w-=&!@#$%^&*()_-~`+]*)?$/mi;
      var filename = url.substr(url.lastIndexOf("/")+1);
      
      // var filename = url.match(filename_extractor)?
      //     url.match(filename_extractor)[1]:null;

      // if(!url||url && url.length <=0){
      //   callback(url);
      //   return;
      // }


      // url = (url.indexOf("//")==0)?
      //   "http:"+url : url;

      // url = (url.indexOf("/")==0)?
      //   webview.getURL() + url:url;

      // var dest = rootFolderPath + filename;
      

      // console.log("url",url)
      console.log("--> Attempting Download: \n" + url);
      request.head(url, function(err, res, body){
        if(err) {
          console.error("!! Attempted Download Failed: \n" + url);
          console.error("\tFailure Message", err);
          reject();
          callback(url);
          return;
        }
        alert("asdasd")

        // console.log('content-type:', res.headers['content-type']);
        // console.log('content-length:', res.headers['content-length']);
        
        // var ct = res.headers['content-type'];
        // var extRegex = /[a-zA-Z0-9]+\/([A-Za-z0-9]+)/;
        // var ext = ct.match(extRegex)[1];

        // if(!filename){
        //   filename = randomId() + "." + ext;
        // } else {
        //   var filenameOnly = filename.split(".")[0];
        //   filename =  filenameOnly + "." + ext;
        // }

        // dest = rootFolderPath + filename;
        
        // if(downloaded_filenames[filename.toLowerCase()]){
        //   filename = randomId() + "_" + filename;
        //   dest = rootFolderPath + filename;
        // } else {
        //   downloaded_filenames[filename.toLowerCase()] = true;
        // }
        console.log("downloaded: " + url + " - as filename: " + filename + "to:\n" + rootFolderPath);
        request(url).pipe(fs.createWriteStream(rootFolderPath+filename)).on('close', function(){
          //downloaded_filenames[filename.toLowerCase()] = true;
          resolve(true)
          callback(filename)  
        })
      });
    });
  }

  function saveToDisk(content, rootFolderPath, fileName, callback){
    // var filename = url.substr(url.lastIndexOf("/")+1);
    var dest = rootFolderPath + fileName;
    console.log("saving to disk: " + fileName + " to:\n" + dest);

    fs.writeFileSync(dest, content);
    callback();
  }


  document.querySelector('#save').onclick = function(e) {
    e.preventDefault();
    e.stopPropagation();

    // dialog.showSaveDialog({ filters: [{ name: 'text', extensions: ['html'] }]}, 
    //   function (fileName) {
    //     if (fileName === undefined) return;
    //     console.log("path",fileName)
    //     saveHTML(html,fileName, "assets");
    //   }
    // ); 

    // webview.downloadURL(webview.getURL())
    // console.log();

    dialog.showSaveDialog({ filters: [{ name: 'text', extensions: ['html'] }]}, 
      function (fileName) {
        if (fileName === undefined) return;
        webview.getWebContents().savePage(fileName, 'HTMLComplete', (error) => {
          if (!error) {
            processHTML(fileName)
            console.log('Save page successfully');
          }
          else {
            console.error(error)
          }
        });
      }
    ); 
    
  
    
  };

  document.querySelector('#back').onclick = function() {
    webview.goBack();
  };

  document.querySelector('#forward').onclick = function() {
    webview.goForward();
  };

  document.querySelector('#home').onclick = function() {
    navigateTo('http://www.github.com/');
  };

  document.querySelector('#reload').onclick = function() {
    if (isLoading) {
      webview.stop();
    } else {
      webview.reload();
    }
  };
  document.querySelector('#reload').addEventListener(
    'webkitAnimationIteration',
    function() {
      if (!isLoading) {
        document.body.classList.remove('loading');
      }
    });

  document.querySelector('#location-form').onsubmit = function(e) {
    e.preventDefault();
    navigateTo(document.querySelector('#location').value);
  };

  webview.addEventListener('close', handleExit);
  webview.addEventListener('did-start-loading', handleLoadStart);
  webview.addEventListener('did-stop-loading', handleLoadStop);
  webview.addEventListener('did-fail-load', handleLoadAbort);
  webview.addEventListener('did-get-redirect-request', handleLoadRedirect);
  webview.addEventListener('did-finish-load', handleLoadCommit);

  // Test for the presence of the experimental <webview> zoom and find APIs.
  if (typeof(webview.setZoom) == "function" &&
      typeof(webview.find) == "function") {
    var findMatchCase = false;

    document.querySelector('#zoom').onclick = function() {
      if(document.querySelector('#zoom-box').style.display == '-webkit-flex') {
        closeZoomBox();
      } else {
        openZoomBox();
      }
    };

    document.querySelector('#zoom-form').onsubmit = function(e) {
      e.preventDefault();
      var zoomText = document.forms['zoom-form']['zoom-text'];
      var zoomFactor = Number(zoomText.value);
      if (zoomFactor > 5) {
        zoomText.value = "5";
        zoomFactor = 5;
      } else if (zoomFactor < 0.25) {
        zoomText.value = "0.25";
        zoomFactor = 0.25;
      }
      webview.setZoom(zoomFactor);
    }

    document.querySelector('#zoom-in').onclick = function(e) {
      e.preventDefault();
      increaseZoom();
    }

    document.querySelector('#zoom-out').onclick = function(e) {
      e.preventDefault();
      decreaseZoom();
    }

    document.querySelector('#find').onclick = function() {
      if(document.querySelector('#find-box').style.display == 'block') {
        document.querySelector('webview').stopFinding();
        closeFindBox();
      } else {
        openFindBox();
      }
    };

    document.querySelector('#find-text').oninput = function(e) {
      webview.find(document.forms['find-form']['find-text'].value,
                   {matchCase: findMatchCase});
    }

    document.querySelector('#find-text').onkeydown = function(e) {
      if (event.ctrlKey && event.keyCode == 13) {
        e.preventDefault();
        webview.stopFinding('activate');
        closeFindBox();
      }
    }

    document.querySelector('#match-case').onclick = function(e) {
      e.preventDefault();
      findMatchCase = !findMatchCase;
      var matchCase = document.querySelector('#match-case');
      if (findMatchCase) {
        matchCase.style.color = "blue";
        matchCase.style['font-weight'] = "bold";
      } else {
        matchCase.style.color = "black";
        matchCase.style['font-weight'] = "";
      }
      webview.find(document.forms['find-form']['find-text'].value,
                   {matchCase: findMatchCase});
    }

    document.querySelector('#find-backward').onclick = function(e) {
      e.preventDefault();
      webview.find(document.forms['find-form']['find-text'].value,
                   {backward: true, matchCase: findMatchCase});
    }

    document.querySelector('#find-form').onsubmit = function(e) {
      e.preventDefault();
      webview.find(document.forms['find-form']['find-text'].value,
                   {matchCase: findMatchCase});
    }

    webview.addEventListener('findupdate', handleFindUpdate);
    window.addEventListener('keydown', handleKeyDown);
  } else {
    var zoom = document.querySelector('#zoom');
    var find = document.querySelector('#find');
    zoom.style.visibility = "hidden";
    zoom.style.position = "absolute";
    find.style.visibility = "hidden";
    find.style.position = "absolute";
  }
};

function navigateTo(url) {
  resetExitedState();
  document.querySelector('webview').src = url;
}

function doLayout() {
  var webview = document.querySelector('webview');
  var controls = document.querySelector('#controls');
  var controlsHeight = controls.offsetHeight;
  var windowWidth = document.documentElement.clientWidth;
  var windowHeight = document.documentElement.clientHeight;
  var webviewWidth = windowWidth;
  var webviewHeight = windowHeight - controlsHeight;

  webview.style.width = webviewWidth + 'px';
  webview.style.height = webviewHeight + 'px';

  var sadWebview = document.querySelector('#sad-webview');
  sadWebview.style.width = webviewWidth + 'px';
  sadWebview.style.height = webviewHeight * 2/3 + 'px';
  sadWebview.style.paddingTop = webviewHeight/3 + 'px';
}

function handleExit(event) {
  console.log(event.type);
  document.body.classList.add('exited');
  if (event.type == 'abnormal') {
    document.body.classList.add('crashed');
  } else if (event.type == 'killed') {
    document.body.classList.add('killed');
  }
}

function resetExitedState() {
  document.body.classList.remove('exited');
  document.body.classList.remove('crashed');
  document.body.classList.remove('killed');
}

function handleFindUpdate(event) {
  var findResults = document.querySelector('#find-results');
  if (event.searchText == "") {
    findResults.innerText = "";
  } else {
    findResults.innerText =
        event.activeMatchOrdinal + " of " + event.numberOfMatches;
  }

  // Ensure that the find box does not obscure the active match.
  if (event.finalUpdate && !event.canceled) {
    var findBox = document.querySelector('#find-box');
    findBox.style.left = "";
    findBox.style.opacity = "";
    var findBoxRect = findBox.getBoundingClientRect();
    if (findBoxObscuresActiveMatch(findBoxRect, event.selectionRect)) {
      // Move the find box out of the way if there is room on the screen, or
      // make it semi-transparent otherwise.
      var potentialLeft = event.selectionRect.left - findBoxRect.width - 10;
      if (potentialLeft >= 5) {
        findBox.style.left = potentialLeft + "px";
      } else {
        findBox.style.opacity = "0.5";
      }
    }
  }
}

function findBoxObscuresActiveMatch(findBoxRect, matchRect) {
  return findBoxRect.left < matchRect.left + matchRect.width &&
      findBoxRect.right > matchRect.left &&
      findBoxRect.top < matchRect.top + matchRect.height &&
      findBoxRect.bottom > matchRect.top;
}

function handleKeyDown(event) {
  if (event.ctrlKey) {
    switch (event.keyCode) {
      // Ctrl+F.
      case 70:
        event.preventDefault();
        openFindBox();
        break;

      // Ctrl++.
      case 107:
      case 187:
        event.preventDefault();
        increaseZoom();
        break;

      // Ctrl+-.
      case 109:
      case 189:
        event.preventDefault();
        decreaseZoom();
    }
  }
}

function handleLoadCommit() {
  resetExitedState();
  var webview = document.querySelector('webview');
  document.querySelector('#location').value = webview.getURL();
  document.querySelector('#back').disabled = !webview.canGoBack();
  document.querySelector('#forward').disabled = !webview.canGoForward();
  closeBoxes();
}

function handleLoadStart(event) {
  document.body.classList.add('loading');
  isLoading = true;

  resetExitedState();
  if (!event.isTopLevel) {
    return;
  }

  document.querySelector('#location').value = event.url;
}

function handleLoadStop(event) {
  // We don't remove the loading class immediately, instead we let the animation
  // finish, so that the spinner doesn't jerkily reset back to the 0 position.
  isLoading = false;
}

function handleLoadAbort(event) {
  console.log('LoadAbort');
  console.log('  url: ' + event.url);
  console.log('  isTopLevel: ' + event.isTopLevel);
  console.log('  type: ' + event.type);
}

function handleLoadRedirect(event) {
  resetExitedState();
  document.querySelector('#location').value = event.newUrl;
}

function getNextPresetZoom(zoomFactor) {
  var preset = [0.25, 0.33, 0.5, 0.67, 0.75, 0.9, 1, 1.1, 1.25, 1.5, 1.75, 2,
                2.5, 3, 4, 5];
  var low = 0;
  var high = preset.length - 1;
  var mid;
  while (high - low > 1) {
    mid = Math.floor((high + low)/2);
    if (preset[mid] < zoomFactor) {
      low = mid;
    } else if (preset[mid] > zoomFactor) {
      high = mid;
    } else {
      return {low: preset[mid - 1], high: preset[mid + 1]};
    }
  }
  return {low: preset[low], high: preset[high]};
}

function increaseZoom() {
  var webview = document.querySelector('webview');
  webview.getZoom(function(zoomFactor) {
    var nextHigherZoom = getNextPresetZoom(zoomFactor).high;
    webview.setZoom(nextHigherZoom);
    document.forms['zoom-form']['zoom-text'].value = nextHigherZoom.toString();
  });
}

function decreaseZoom() {
  var webview = document.querySelector('webview');
  webview.getZoom(function(zoomFactor) {
    var nextLowerZoom = getNextPresetZoom(zoomFactor).low;
    webview.setZoom(nextLowerZoom);
    document.forms['zoom-form']['zoom-text'].value = nextLowerZoom.toString();
  });
}

function openZoomBox() {
  document.querySelector('webview').getZoom(function(zoomFactor) {
    var zoomText = document.forms['zoom-form']['zoom-text'];
    zoomText.value = Number(zoomFactor.toFixed(6)).toString();
    document.querySelector('#zoom-box').style.display = '-webkit-flex';
    zoomText.select();
  });
}

function closeZoomBox() {
  document.querySelector('#zoom-box').style.display = 'none';
}

function openFindBox() {
  document.querySelector('#find-box').style.display = 'block';
  document.forms['find-form']['find-text'].select();
}

function closeFindBox() {
  var findBox = document.querySelector('#find-box');
  findBox.style.display = 'none';
  findBox.style.left = "";
  findBox.style.opacity = "";
  document.querySelector('#find-results').innerText= "";
}

function closeBoxes() {
  closeZoomBox();
  closeFindBox();
}