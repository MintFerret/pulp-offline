print = printT = console.log;

math = Math;
math.rad = function(degrees) {
	return degrees * (Math.PI / 180);
};
math.deg = function(radians) {
	return radians / (Math.PI / 180);
};

var fatalError = false;
function assert(bool, message) {
	if (bool) return;
	fatalError = true;
	throw new Error(message);
}
function idx(index) {
	if (Number.isInteger(index)) return index-1;
	return index;
}

function isString(value) {
	return typeof value==='string'
}
function isTable(value) {
	return typeof value==='object'
}
function LuaTrue(bool) {
	if (typeof bool==='undefined' || bool===false || bool==null) return false;	
	return true;
}

function push(list,value) {
	list.push(value);
}
function pop(list) {
	return list.pop();
}
function copy(listOrHash) {
	var copy;
	if (Array.isArray(listOrHash)) {
		var len = listOrHash.length;
		copy = Array(len);
		for (var i=0; i<len; i++) {
			copy[i] = listOrHash[i];
		}
	}
	else {
		var keys = Object.keys(listOrHash);
		copy = {};
		for (var i=0; i<keys.length; i++) {
			var key = keys[i];
			copy[key] = listOrHash[key];
		}
	}
	return copy;
}

function LuaFloatToString(n) {
	if (n!=Math.floor(n)) {
		var s = n<0 ? -1 : 1;
		n = Math.abs(n).toFixed(8);
		n = Number(n.substring(0,8)) * s;
		if (n==Math.floor(n)) n = n.toFixed(1);
	}
	return n;
}
function join(list,glue) {
	// return list.join(glue);
	var str = '';
	var arr = [];
	for (var i=0; i<list.length; i++) {
		if (i) arr.push(glue);
		var item = list[i];
		if (typeof item=='number') {
			item = LuaFloatToString(item);
		}
		arr.push(item);
	}
	return arr.join('');
}
function substring(str,start,fin) {
	return str.substring(start-1,fin);
}
function split(str,delim) {
	return str.split(delim)
}
function match(str,pattern) {
	return str.match(new RegExp(pattern.replace('%s','\\s'))) ? true : false;
}
function ascii(str,pos) {
	return str.charCodeAt(pos-1);
}
function fromAscii(i) {
	return String.fromCharCode(i);
}
function random(min,max) {
	return Math.floor(Math.random() * (max - min + 1)) + min;
}

function getDatetime() {
	var now = new Date;
	var epoch = new Date('January 1, 2000 00:00:00 GMT+00:00');
	return {
		year : now.getFullYear(), // 1000-9999 (NOTE: different from Lua's 1900-10000)
		month : now.getMonth()+1, // 1-12
		day : now.getDate(), // 1-31
		weekday : now.getDay(), // 0-6
		hour : now.getHours(), // 0-23
		minute : now.getMinutes(), // 0-59
		second : now.getSeconds(), // 0-59
		millisecond : now.getMilliseconds(), // 0-999
		timestamp: Math.floor((now.getTime() - epoch.getTime()) / 1000), 
	};
}

function lpad(str,n,c) {
	return String(str).padStart(n,c);
}
function rpad(str,n,c) {
	return String(str).padEnd(n,c);
}

function fatal(message) {
	fatalError = true;
	throw new Error('Fatal: '+message+' ('+errorSource+':'+errorLine+')');
}
function warn(message) {
	print('Warning: '+message+' ('+errorSource+':'+errorLine+')')
}

var Color = {
	White:0,
	Black:1,
	Clear:2,
};

// --------------------------------------------------------
// not part of bridge but required to support drawing functions

var Renderer = {
	image: null,
	bitmap: null,
	stack:[],
	pixels:[],
};

function ColorToFillStyle(color) {
	switch(color) {
	case Color.White:
		return 'rgb(255,255,255)';
		break;
	case Color.Black:
		return 'rgb(0,0,0)';
		break;
	default: // Color.Clear
		return 'rgba(0,0,0,0.0)';
		break;
	}
}

function Bitmap(width, height, color) {
	this.width = width;
	this.height = height;
	this.color = Color.Black;
	this.backgroundColor = color;
	this.data = null;
	
	var canvas = document.createElement('canvas');
	canvas.width = width;
	canvas.height = height;
	var context = canvas.getContext('2d');
	
	this.canvas = canvas;
	this.context = context;
	
	this.commitData = function() {
		this.data = context.getImageData(0,0,width,height);
	}
	this.clear = function() {
		if (this.backgroundColor==Color.Clear) {
			context.clearRect(0,0,width,height);
		}
		else {
			context.fillStyle = ColorToFillStyle(this.backgroundColor);
			context.fillRect(0,0,width,height);
			context.fillStyle = ColorToFillStyle(this.color);
		}
		this.commitData();
	}
	this.fillRect = function(x,y,width,height) {
		context.fillStyle = ColorToFillStyle(this.color);
		context.fillRect(x,y,width,height);
		this.commitData();
	}
	
	this.toDataURL = function() {
		return canvas.toDataURL('image/png');
	};

	this.clear();
}

function setupContext(id) { 
	var roomWidth = roomTilesWide * tileWidth;
	var roomHeight = roomTilesHigh * tileHeight;
	
	var container = document.getElementById(id);
	var wrapper = document.createElement('i');
	var backing = document.createElement('b');
	var image = document.createElement('img');
	var scale = 2;
	image.width = roomWidth * scale;
	image.height = roomHeight * scale;
	container.appendChild(wrapper);
	wrapper.appendChild(backing);
	backing.appendChild(image);
	
	Renderer.image = image;
	Renderer.bitmap = Renderer.stack[0] = new Bitmap(roomWidth,roomHeight,Color.Black);
	
	Renderer.pixels[Color.White] = new Bitmap(1,1,Color.White);
	Renderer.pixels[Color.Black] = new Bitmap(1,1,Color.Black);
	Renderer.pixels[Color.Clear] = new Bitmap(1,1,Color.Clear);
}
function renderContext() {
	Renderer.image.src = Renderer.bitmap.toDataURL();
}

// --------------------------------------------------------

function pushContext(bitmap) {
	Renderer.stack.push(bitmap);
	Renderer.bitmap = bitmap;
}
function popContext() {
	Renderer.bitmap.commitData();
	Renderer.stack.pop();
	Renderer.bitmap = Renderer.stack[Renderer.stack.length-1];
}
function clearContext() {
	Renderer.bitmap.clear();
}
function setColor(color) {
	Renderer.bitmap.color = color;
	Renderer.bitmap.context.fillStyle = ColorToFillStyle(color);
}
function setBackgroundColor(color) {
	Renderer.bitmap.backgroundColor = color;
}
function drawPixel(x,y) {
	Renderer.bitmap.context.putImageData(Renderer.pixels[Renderer.bitmap.color].data,x|0,y|0);
}
function newBitmap(width,height,color) {
	return new Bitmap(width|0,height|0,color);
}
function drawBitmap(bitmap,x,y) {
	Renderer.bitmap.context.drawImage(bitmap.canvas,x|0,y|0);
}
function tileBitmap(bitmap,x,y,width,height) {
	var w = bitmap.width;
	var h = bitmap.height;
	var cols = Math.ceil(width / w);
	var rows = Math.ceil(height / h);
	var context = Renderer.bitmap.context;
	var image = bitmap.canvas;
	x |= 0;
	y |= 0;
	for (var oy=0; oy<rows; oy++) {
		for (var ox=0; ox<cols; ox++) {
			context.drawImage(image,x+ox*w,y+oy*h);
		}
	}
}
function clearBitmap(bitmap) {
	bitmap.clear();
}
function fillRect(x,y,width,height) {
	Renderer.bitmap.fillRect(x|0,y|0,width|0,height|0);
}
function setClipRect(x,y,width,height) {
	var context = Renderer.bitmap.context;
	context.save();

	var region = new Path2D();
	region.rect(x|0,y|0,width|0,height|0);
	context.clip(region);
}
function clearClipRect() {
	Renderer.bitmap.context.restore();
}

function invert(flag) {
	if (flag) Renderer.image.parentNode.classList.add('invert');
	else Renderer.image.parentNode.classList.remove('invert');
}
function offset(ox,oy) {
	Renderer.image.style.top = (oy|0)+'px';
	Renderer.image.style.left = (ox|0)+'px';
}

// --------------------------------------------------------

function newVoice(type,a,d,s,r,v) {
	return new Voice(type, {
		attack: a,
		decay: d,
		sustain: s,
		release: r,
		volume: v,
	});
}
function setEnvelope(voice, a,d,s,r,v) {
	voice.envelope.attack = a;
	voice.envelope.decay = d;
	voice.envelope.sustain = s;
	voice.envelope.release = r;
	voice.envelope.volume = v;
}
function setVolume(voice,v) {
	voice.setVolume(v);
}
function playNote(voice,pitch,dur,when) {
	// var now = audioTime();
	// var offset = now - when;
	// if (offset>0) warn(`Missed playNote() time (${Math.floor(when*1000)}ms) by ${Math.floor(offset*1000)}ms. Try reducing your bpm.`);
	voice.playNote(pitch, dur, when);
}
function stopNote(voice) {
	voice.stop();
}
function audioTime() {
	return Playhead.getCurrentTime()
}
function resetTime() {
	Playhead.resetTime()
}

// --------------------------------------------------------

function getFile(path) {
	// TODO: unused for now
}
function putFile(path, text) {
	Local.put(path, text, null);
}
function putJson(path, table) {
	putFile(path, JSON.stringify(table));
}
function deleteFile(path) {
	Local.delete(path, null);
}

function loadStore() {
	var s = window.localStorage.getItem('store-'+currentGameId);
	store = s ? JSON.parse(s) : {};
}
function saveStore() {
	if (modifiedStore) {
		window.localStorage.setItem('store-'+currentGameId, JSON.stringify(store)); 
		modifiedStore = false;
	}
}

// --------------------------------------------------------
var crankAbsolute = 0;
var crankRelative = 0;
var crankDocked = true;
function crank() {
	return {
		absolute: crankAbsolute,
		relative: crankRelative,
		docked: crankDocked,
	};
}
var motionX = 0.0;
var motionY = 1.0;
var motionZ = 0.0;
function motion() {
	return {
		x: motionX,
		y: motionY,
		z: motionZ,
	};
}

function startAccelerometer(){}
function stopAccelerometer(){}

// --------------------------------------------------------
function applyOverrides() { // called after runtime.js is loaded
	function LuaAdd(a,b) {
		if (typeof a==='string' || typeof b==='string') {
			fatal("PulpScript does not support string concatenation");
		}
		return a + b;
	}
	Action.add = function(args) {
		var varname = args[idx(2)];
		setVarValue(varname, LuaAdd(getVarValue(varname), doValue(args[idx(3)])))
	}
}