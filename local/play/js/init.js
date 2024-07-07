var body = document.body;
body.classList.remove('nojs');

//! Detect reduced motion
var fullMotion = false;
if (window.matchMedia &&
    window.matchMedia('(prefers-reduced-motion: no-preference)').matches) {
        body.classList.remove('reduce-motion');
        fullMotion = true;
    }

//! Detect dark mode
var darkmode = null;
if (window.matchMedia &&
    window.matchMedia('(prefers-color-scheme: dark)').matches) {
        body.dataset.mode = 'dark';
        darkmode = true;
    }

//! Detect light mode
var lightmode = null;
if (window.matchMedia &&
    window.matchMedia('(prefers-color-scheme: light)').matches) {
        body.dataset.mode = 'light';
        lightmode = true;
    }
    
//! Detect touch devices
var touchscreen = null;
window.addEventListener('touchstart', function didTouch() {
    // This appears to be a touchscreen device.
    body.classList.add('touch');
    window.removeEventListener('touchstart', didTouch, false);
    touchscreen = true;
}, false);

//! Detect Platform
var detectedPlatform = "os-unknown";
if (navigator.appVersion.indexOf("Win")!=-1)     { detectedPlatform = "os-win"; }
if (navigator.appVersion.indexOf("Mac")!=-1)     { detectedPlatform = "os-mac"; }
if (navigator.appVersion.indexOf("X11")!=-1)     { detectedPlatform = "os-linux"; }
if (navigator.appVersion.indexOf("Linux")!=-1)   { detectedPlatform = "os-linux"; }
if (navigator.appVersion.indexOf("iPad")!=-1)    { detectedPlatform = "os-mac"; }
if (navigator.appVersion.indexOf("iPhone")!=-1)  { detectedPlatform = "os-mac"; }
if (navigator.appVersion.indexOf("Android")!=-1) { detectedPlatform = "os-mac"; }

body.classList.remove("os-unknown");
body.classList.add(detectedPlatform);

//! Detect Front Page/Canvas Element
var frontpage = null;
if (document.querySelector("canvas#intro-canvas")) {
    frontpage = true;
}

//! Detect WebGL (from http://www.studyjs.com/webgl/webglcontext.html)
var webgl = null;
if (frontpage) {
    var canvas = document.createElement('canvas');
    var webglContextParams = ['webgl', 'experimental-webgl', 'webkit-3d', 'moz-webgl'];
    var webglContext = null;
    for (var index = 0; index < webglContextParams.length; index++) {
        try {
            webglContext = canvas.getContext(webglContextParams[index]);
            if (webglContext) {
                //breaking as we got our context
                webgl = true;
                break;
            }
        } catch (E) {
            console.log(E);
        }
    }
}

// Helper function to load external scripts
function loadJS(id, url, callback) {
    var jsLoaded = document.getElementById(id);
    
    if (!jsLoaded) {
        var js = document.createElement("script");
        js.id = id;
        js.src = url;
        
        js.onload = function (){
            callback();
        };
        
        document.body.appendChild(js);
    }
}

// Lazy load images
document.addEventListener("DOMContentLoaded", function() {
    var lazyloadImages;    
    
    if ("IntersectionObserver" in window) {
        lazyloadImages = document.querySelectorAll(".lazy");
        var imageObserver = new IntersectionObserver(function(entries, observer) {
            entries.forEach(function(entry) {
                if (entry.isIntersecting) {
                    var image = entry.target;
                    image.src = image.dataset.src;
                    image.classList.remove("lazy");
                    imageObserver.unobserve(image);
                }
            });
        });
        
        lazyloadImages.forEach(function(image) {
            imageObserver.observe(image);
        });
    } else {  
        var lazyloadThrottleTimeout;
        lazyloadImages = document.querySelectorAll(".lazy");
        
        function lazyload () {
        if(lazyloadThrottleTimeout) {
            clearTimeout(lazyloadThrottleTimeout);
        }    
        
        lazyloadThrottleTimeout = setTimeout(function() {
            var scrollTop = window.pageYOffset;
            lazyloadImages.forEach(function(img) {
                if(img.offsetTop < (window.innerHeight + scrollTop)) {
                    img.src = img.dataset.src;
                    img.classList.remove('lazy');
                }
            });
            if(lazyloadImages.length == 0) { 
                document.removeEventListener("scroll", lazyload);
                window.removeEventListener("resize", lazyload);
                window.removeEventListener("orientationChange", lazyload);
            }
        }, 20);
        }
        
        document.addEventListener("scroll", lazyload);
        window.addEventListener("resize", lazyload);
        window.addEventListener("orientationChange", lazyload);
    }
});
