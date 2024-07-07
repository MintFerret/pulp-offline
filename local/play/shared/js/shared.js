var print = console.log;
function isset(varvalue) {
	return !(typeof varvalue==='undefined' || varvalue===null);
}
function one(selector) { return document.querySelector(selector); }
function all(selector) { return document.querySelectorAll(selector); }
function wot(what) {
	// takes a string selector, existing node, node list, or array, and returns a node list or array
	var nodes = what;
	if (typeof what == 'string') {
		nodes = all(what);
	}
	else if (!(what instanceof NodeList || Array.isArray(what))) {
		nodes = [what];
	}
	// if (nodes.length==0) console.error('wot miss: ', what);
	return nodes;
}
function each(what, eachFunc) {
	var nodes = wot(what);
	for (var i=0; i<nodes.length; i++) {
		if (eachFunc(i,nodes[i])) break;
	}
}
(function(global) {
	// NOTE: this construction supports unbindAll()
	// document.body on down can be unbound in a
	// single call replacing the documet.body with 
	// a clone of itself but we need to special case
	// document and window bindings to track and 
	// unbind them manually
	
	// private
	var bindings = {};
	function pushBinding(node, eventName, eventHandler) {
		if (node==window || node==document) {
			var nodeName = node==window?'window':'document';
			if (!bindings[nodeName]) bindings[nodeName] = {};
			if (!bindings[nodeName][eventName]) bindings[nodeName][eventName] = [];
			// print(`pushed bindng ${nodeName}.${eventName}[${bindings[nodeName][eventName].length}]`);
			bindings[nodeName][eventName].push(eventHandler);
		}
	}
	function dropBinding(node, eventName, eventHandler) {
		if (node==window || node==document) {
			var nodeName = node==window?'window':'document';
			if (!bindings[nodeName]) return;
			if (!bindings[nodeName][eventName]) return;
			var i = bindings[nodeName][eventName].indexOf(eventHandler);
			if (i==-1) return;
			// print(`dropped bindng ${nodeName}.${eventName}[${i}]`);
			bindings[nodeName][eventName].splice(i, 1);
		}
	}
	
	// public
	function bind(what, eventNames, eventHandler) {
		var nodes = wot(what);
		eventNames = eventNames.split(/\s*,\s*/);
		for (var j=0; j<nodes.length; j++) {
			var node = nodes[j];
			for (var i=0; i<eventNames.length; i++) {
				var eventName = eventNames[i]
				node.addEventListener(eventName, eventHandler);
				pushBinding(node, eventName, eventHandler);
			}
		}
	}
	function unbind(what, eventNames, eventHandler) {
		var nodes = wot(what);
		eventNames = eventNames.split(/\s*,\s*/);
		for (var j=0; j<nodes.length; j++) {
			var node = nodes[j];
			for (var i=0; i<eventNames.length; i++) {
				var eventName = eventNames[i]
				node.removeEventListener(eventName, eventHandler);
				dropBinding(node, eventName, eventHandler);
			}
		}
	}
	function unbindAll() {
		// reset all but the document and window event listeners
		document.body.replaceWith(document.body.cloneNode(true));
		for (var nodeName in bindings) {
			var node = nodeName=='window'?window:document;
			for (var eventName in bindings[nodeName]) {
				var eventHandlers = bindings[nodeName][eventName];
				for (var i=eventHandlers.length-1; i>=0; i--) {
					unbind(node, eventName, eventHandlers[i]);
				}
			}
		}
	}
	
	global.bind = bind;
	global.unbind = unbind;
	global.unbindAll = unbindAll;
})(window);
function ready(eventHandler) { bind(document, 'DOMContentLoaded', eventHandler); }
function style(rules, id) {
	if (id) {
		var node = one('#'+id);
		if (node) node.parentNode.removeChild(node);
	}
	var node = document.createElement('style');
	if (id) node.id = id;
	node.type = 'text/css';
	node.appendChild(document.createTextNode(rules));
	document.head.appendChild(node);
}
function clone(obj) {
	return JSON.parse(JSON.stringify(obj));
}
function delay(s, callback) {
	return window.setTimeout(callback, s * 1000);
}
function repeat(s, callback) {
	return window.setInterval(callback, s * 1000);
}
function flash(what, s) {
	var nodes = wot(what);
	for (var j=0; j<nodes.length; j++) {
		var node = nodes[j];
		node.classList.add('flash');
		delay(s || 0.25, function() {
			node.classList.remove('flash');
		});
	}

}

function escapeRegExp(string) {
	return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); // $& means the whole matched string
}

function syncSelect(select) {
	if (select.innerHTML.trim()=='') {
		select.innerHTML = `<li data-value="" class="selected">&nbsp;</li>`;
	}
	select.tabIndex = 0;
	
	var style = getComputedStyle(select.querySelector('li'));
	var host = document.createElement('span');
	host.style.visibility = 'hidden';
	host.style.font = style.font;
	host.style.fontFamily = style.fontFamily;
	host.style.fontSize = style.fontSize;
	host.style.tracking = style.tracking;
	host.classList.add('select-options');
	document.body.appendChild(host);
	
	var width = 0;
	each(select.querySelectorAll('li'), function(i,li) {
		host.innerHTML = li.innerHTML;
		if (host.offsetWidth>width) width = host.offsetWidth;
	});
	select.style.width = width + 'px';
	document.body.removeChild(host);
	
	var selected;
	var defaultValue = select.dataset ? select.dataset.value : null;
	if (defaultValue!=null) {
		selected = select.querySelector(`li[data-value="${defaultValue}"]`);
		if (!selected) {
			defaultValue = null;
		}
	}
	
	if (defaultValue==null) {
		selected = select.querySelector('li.selected');
		if (selected) {
			select.dataset.value = selected.dataset.value;
		}
		else {
			selected = select.querySelector('li:not(.group)');
			select.dataset.value = selected.dataset.value;
		}
	}
	selected.classList.add('selected');
	
	select.options = select.querySelectorAll('li:not(.label):not(.disabled)');
	each(select.options, function(i, node) {
		node.dataset.index = i;
	});
	select.dataset.selectedIndex = selected.dataset.index;
}
function bindSelect(select, eventName, onEvent) {
	select.tabIndex = 0;
	
	var backdrop = one('#select-backdrop');
	var options = one('#select-options');
	if (!backdrop) {
		backdrop = document.createElement('div');
		backdrop.id = 'select-backdrop';
		document.body.appendChild(backdrop);
		style(`
			#select-backdrop {
				display: none;
				position: fixed;
				top: 0;
				left: 0;
				right: 0;
				bottom: 0;
				z-index: 100000;
			}
			
			#select-options {
				display: none;
				position: absolute;
				z-index: 100001;
			}
		`, 'select-backdrop-style');
		
		options = document.createElement('ol');
		options.id = 'select-options';
		options.classList.add('select-options');
		document.body.appendChild(options);
		
		// use listener method instead of bind() to prevent this from being nuked by unbindAll()
		document.addEventListener('selectstart', function(event) {
			if (event.target==select || event.target==options || event.target.parentNode==options) {
				event.stopPropagation();
				event.preventDefault();
			}
		});
	}
	
	if (select.parentNode.nodeName=='LABEL' && select.parentNode.querySelector('input')==null) {
		bind(select.parentNode, 'mousedown', function(event) {
			select.dispatchEvent(new MouseEvent('mousedown'));
		});
	}
	
	syncSelect(select); // handles sizing and default value
	
	bind(select, 'mousedown', function(event) {
		select.classList.add('active');
		
		function dismiss(event) {			
			unbind(backdrop, 'mousedown', dismiss);
			unbind(document, 'keydown', keydown);
			select.classList.remove('active');
			backdrop.style.display = 'none';
			options.style.display = 'none';
		}
		function selectOption(li) {
			if (li.classList.contains('label') || li.classList.contains('disabled')) return;
			
			options.querySelector('li.selected').classList.remove('selected');
			li.classList.add('selected');
		}
		
		function tidy() {
			var old;
			old = options.querySelector('li.drag-over');
			if (old) old.classList.remove('drag-over');
			
			old = options.querySelector('li.highlighted');
			if (old) old.classList.remove('highlighted');
		}
		
		function highlight(li) {
			if (li.classList.contains('label') || li.classList.contains('disabled')) return;
			
			tidy();
			
			li.classList.add('highlighted');
			// scroll it into view
			options.scrollTop = li ? li.offsetTop - (li.offsetHeight * (maxItems - 0.5) / 2) : 0;
		}
		
		function getFocused() {
			return options.querySelector('li.drag-over') || options.querySelector('li.highlighted') || options.querySelector('li.selected');
		}
		
		var selectBuffer = '';
		var selectBufferId;
		function keydown(event) {
			// TODO: up/down need to skip over groups
			if (event.keyCode==38) { // up
				var selected = getFocused();
				var prev = selected && selected.previousElementSibling;
				while (prev && (prev.classList.contains('label') || prev.classList.contains('disabled'))) prev = prev.previousElementSibling;
				if (prev) highlight(prev);
			}
			else if (event.keyCode==40) { // down
				var selected = getFocused();
				var next = selected && selected.nextElementSibling;
				while (next && (next.classList.contains('label') || next.classList.contains('disabled'))) next = next.nextElementSibling;
				if (next) highlight(next);
			}
			else if (event.keyCode==27) { // esc
				dismiss(event);
			}
			else if (event.keyCode==13) { // return
				var selected = getFocused();
				if (selected) selectOption(selected);
				blur(event);
			}
			else {
				if (event.key.length>1) return;
				
				// match chars
				if (selectBufferId) {
					window.clearInterval(selectBufferId);
					selectBufferId = null;
				}
				selectBufferId = delay(0.5, function() {
					selectBuffer = '';
				});
				selectBuffer += event.key;
				// print(selectBuffer);
				
				var re = new RegExp('^'+escapeRegExp(selectBuffer), 'iu');
				each(options.querySelectorAll('li'), function(i,li) {
					if (li.innerText.match(re)) {
						highlight(li);
						return true;
					}
				});
			}
			event.stopPropagation();
			event.preventDefault();
		}
		function blur(event) {
			var oldValue = select.dataset.value;
			var selected = options.querySelector('li.selected');
			if (selected) {
				var newValue = selected.dataset.value;
				setSelectValue(select, newValue);
			
				select.dispatchEvent(new Event('select'));
				if (oldValue!=newValue) {
					select.dispatchEvent(new Event('change'));
				}
			}
			dismiss(event);
		}
		
		var bounds = select.getBoundingClientRect();
		options.innerHTML = select.innerHTML;
		options.dataset.selectId = select.id;

		var style = getComputedStyle(options);
		var maxItems = parseInt(style.getPropertyValue('--ui-max-select-options') || 0);
		
		backdrop.style.display = 'block';
		options.style.display = 'block';

		bind(document, 'keydown', keydown);
		
		var items = options.querySelectorAll('li');
		if (maxItems && items.length > maxItems) options.classList.add('scrollable');
		else options.classList.remove('scrollable');
		
		var selected = options.querySelector('li.selected');
		options.scrollTop = selected ? selected.offsetTop - (selected.offsetHeight * (maxItems - 0.5) / 2) : 0;

		var offsetX = bounds.left + window.scrollX + -16;
		var offsetY = bounds.top + window.scrollY;
		
		// position under cursor
		offsetY -= selected ? selected.offsetTop : 0;
		offsetY += options.scrollTop;
		
		// keep in bounds
		var safeSize = 16;
		if (offsetX + options.offsetWidth > window.innerWidth + window.scrollX - safeSize) offsetX = window.innerWidth + window.scrollX - options.offsetWidth - safeSize;
		else if (offsetX < safeSize) offsetX = safeSize;
		
		if (offsetY + options.offsetHeight > window.innerHeight + window.scrollY - safeSize) offsetY = window.innerHeight + window.scrollY - options.offsetHeight - safeSize;
		else if (offsetY < safeSize) offsetY = safeSize;
		
		options.style.top = offsetY + 'px';
		options.style.left = offsetX + 'px';	
		
		// click drag release nukes hover styles in Safari :weary:
		bind(items, 'mouseenter', function(event) {
			tidy();
			event.target.classList.add('drag-over');
		});
		bind(items, 'mouseout', function(event) {
			event.target.classList.remove('drag-over');
		});
		
		delay(0.25, function() {
			bind(backdrop, 'mousedown', dismiss);
			bind(items, 'mouseup', function(event) {
				selectOption(event.target);
				blur(event);
			});
		});
		
		event.stopPropagation();
	});
	if (eventName && onEvent) bind(select, eventName, onEvent);
}
function getSelectValue(select) {
	return select.dataset.value;
}
function setSelectValue(select, value) {
	var selected = select.querySelector('li.selected');
	if (selected) selected.classList.remove('selected');
	selected = select.querySelector(`li[data-value="${value}"]`);
	if (selected) {
		selected.classList.add('selected');
		select.dataset.selectedIndex = selected.dataset.index;
	}
	select.dataset.value = value;
}
function getSelectedIndex(select) {
	return parseInt(select.dataset.selectedIndex);
}
function setSelectedIndex(select, i) {
	var selected = select.options[i];
	setSelectValue(select, selected.dataset.value);
}
function getSelectLength(select) {
	return select.options.length;
}

var undoHistory = [];
var undoIndex = -1;
var undoTopIndex = -1;
var undoMaxSteps = 100;
var saveIndex = -1;

var isDirty = false;
var saveButton = null;
function markDirty() {
	isDirty = true;
	if (saveButton) saveButton.classList.add('dirty');
}
function clearDirty() {
	isDirty = false;
	if (saveButton) saveButton.classList.remove('dirty');
}
function markSaved() {
	clearDirty();
	saveIndex = undoIndex;
	for (var i=0; i<=undoTopIndex; i++) {
		if (i==saveIndex) continue;
		undoHistory[i].clean = false;
	}
}

function resetHistory() {
	// print(`resetHistory()`);
	undoHistory = [];
	undoIndex = -1;
	undoTopIndex = -1;
	clearDirty();
}
function pushHistory(label,redoFunc,undoFunc,skipInitialRedo,uiOnly) {
	// print(`pushHistory(${label})`);
	var action = {
		name:label,
		redo:redoFunc,
		undo:undoFunc,
		clean:!isDirty, // before
		dirty:!uiOnly,	// after
	};
	undoHistory[++undoIndex] = action;
	
	var undoSteps = undoHistory.length;
	if (undoSteps>undoMaxSteps) {
		var trim = undoSteps - undoMaxSteps;
		undoHistory.splice(0,trim);
		undoIndex -= trim;
	}
	
	undoTopIndex = undoIndex;
	
	if (!skipInitialRedo) {
		// print(`do ${action.name}`);
		action.redo();
	}
	if (action.dirty) markDirty();
}
function stepHistory(step) {
	if (step<0) {
		if (undoIndex>-1) {
			var action = undoHistory[undoIndex--];
			// print(`undo ${action.name}`);
			action.undo();
			if (action.clean) clearDirty();
			else if (action.dirty) markDirty();
		}
	}
	else {
		if (undoIndex<undoTopIndex) {
			var action = undoHistory[++undoIndex];
			// print(`redo ${action.name}`);
			action.redo();
			if (action.dirty) markDirty();
		}
	}
	if (undoIndex==saveIndex) clearDirty();
}
function undo() {
	// print(undoIndex);
	stepHistory(-1);
	// print(undoHistory);
}
function redo() {
	// print(undoIndex);
	stepHistory(1);
	// print(undoHistory);
}

function Sequence() {
	var self = this;
	self.todo = [];
	self.offset = 0;
	
	var SequenceType = {
		None:0,
		Get:1,
		Put:2,
	};
	
	function add(todo) {
		self.todo.splice(self.offset,0,todo);
		self.offset += 1;
	}
	
	self.then = function(callback) {
		add({
			sequence:self,
			type:SequenceType.None,
			callback:callback,
		});
	};
	self.get = function(url, callback) {
		add({
			sequence:self,
			type:SequenceType.Get,
			url:url,
			callback:callback,
		});
	};
	self.put = function(url, data, callback) {
		add({
			sequence:self,
			type:SequenceType.Put,
			url:url,
			data:data,
			callback:callback,
		});
	};
	
	function next() {
		if (self.todo.length>0) {
			var todo = self.todo.shift();
			self.offset = 0;
			
			var url = todo.url;
			var data = todo.data;
			
			if (typeof url==='function') url = url();
			if (typeof data==='function') data = data();
			
			var callback = function(text) {
				if (todo.callback) todo.callback(text);
				next();
			};
			
			if (todo.type==SequenceType.None) {
				callback();
			}
			else if (todo.type==SequenceType.Put) {
				Local.put(url, data, callback);
			}
			else {
				Local.get(url, callback);
			}
		}
		else if (self.callback) {
			self.callback();
		}
	}
	
	self.run = function(callback) {
		self.callback = callback;
		next();
	};
	
	return self;
}

let cmdKey = navigator.platform.match(/mac/i) ? 'metaKey' : 'ctrlKey';

// only desktop WebKit is compatible currently :(
ready(function() {
	var compatible = navigator.userAgent.match(/webkit/i)!=null && navigator.userAgent.match(/mobile/i)==null;
	if (sessionStorage.getItem('overrideCompatible')=='true') compatible = true;
	
	if (compatible) document.body.classList.add('compatible');
	else bind('#compatibility-banner', 'click', function() {
		document.body.classList.add('compatible'); // TODO: store
		sessionStorage.setItem('overrideCompatible', true);
	});
	
	if (cmdKey=='ctrlKey') {
		each('.has-key-command', function(i,node) {
			node.title = node.ariaLabel = node.title.replace(/⌘/g, 'Ctrl').replace(/⇧/g, 'Shift').replace(/⌥/g, 'Alt');
		});
	}
});