var Local = (function() {
	var L = {};
	
	function getCSRFToken() {
		var cookieName = 'csrftoken';
	    var cookieValue = null;
	    if (document.cookie && document.cookie !== '') {
	        var cookies = document.cookie.split(';');
	        for (var i = 0; i < cookies.length; i++) {
	            var cookie = cookies[i].trim();
	            if (cookie.substring(0, cookieName.length + 1) === (cookieName + '=')) {
	                cookieValue = decodeURIComponent(cookie.substring(cookieName.length + 1));
	                break;
	            }
	        }
	    }
	    return cookieValue;
	}
	
	L.get = function(path, callback) {
		var xhr = new XMLHttpRequest();
		if (callback) {
			xhr.addEventListener('load', function() {
				callback(this.responseText, this.status);
			});
		}
		xhr.open('GET', path);
		xhr.send();
	};
	
	L.put = function(path, data, callback) {
		var xhr = new XMLHttpRequest();
		if (callback) {
			xhr.addEventListener('load', function() {
				callback(this.responseText, this.status);
			});
		}
		xhr.open('POST', path);
	    xhr.setRequestHeader('Content-type', 'application/x-www-form-urlencoded');
	    xhr.setRequestHeader('X-CSRFToken', getCSRFToken());
		xhr.send('data='+encodeURIComponent(data));
	};
	
	L.delete = function(path, callback) {
		var xhr = new XMLHttpRequest();
		if (callback) {
			xhr.addEventListener('load', function() {
				callback(this.status);
			});
		}
		xhr.open('DELETE', path);
	    xhr.setRequestHeader('X-CSRFToken', getCSRFToken());
	    xhr.send();
	};
	
	return L;
})();
