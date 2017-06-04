/*
common utilities
v 1.1.8
05/08/17
by JeD

*/

var doeaSPlib = doeaSPlib || {}; 

(function($, api) {

	/*
		props.buttons = [{
					class: "dialogButton",
					text: "Yes",
					numToPass: 1  
				}]

		props.phrase is the text that will show in the body of the dialog, can be text or jquery html object

		props.title is the text that will show in the title of the dialog

		props.cb is the callback that is fired after user clicks something in dialog

		props.buttonListner is the custom callback function for the buttons, if none is provided the default ootb functionality is used

		props.showClose true or false
	*/
	var sPoint = SP;
	var generateButtons = function(btnAry, buttonCB) {

		var buttons = [];

		window.customSPDialogListner4me = function(val, text) {

			var shouldCloseDialog;

			if(buttonCB) {
				shouldCloseDialog = buttonCB.call($, val, text);
			}

			if(shouldCloseDialog === undefined) {
				window.customSPDialogListner4me = null;
				SP.UI.ModalDialog.commonModalDialogClose(val, text);
			}
		};

		if (btnAry) {
		
			btnAry.forEach(function(item) {
				var btnClass = item.class || "dialogButton";

				buttons.push(
					$('<input/>', {
						type: 'button',
						value: item.text,
						'class': btnClass,
						onclick: "customSPDialogListner4me("+item.numToPass+", \""+item.text+"\");"
					})
				);
			});
		}

		return buttons;
	};
	var generateDialogHtml = function(props) {
		var parentEle = $('<div/>', {
			class: 'confirmationModal clearfix'
		});
		var buttonContainer = $('<div/>', {
			'class': 'buttons'
		});
		var buttons = generateButtons(props.buttons, props.buttonListner);

		
		if (buttons.length > 0) {
		
			buttonContainer.append(buttons);
		}

		parentEle.append(
			$('<p/>', {
				html: props.phrase
			}),
			buttonContainer
		);

		return parentEle.get()[0];
	};
	var cleanAndFire = function(props) {

		props.buttons = null;
		props.cb = null;

		sPoint.UI.ModalDialog.showModalDialog(props);
	};
	var ensureDefaults = function(props) {

		props.title = props.title || 'Confirmation';
		props.showClose = props.showClose || false;
	};
	var handleCB = function(obj, cb) {

		if (obj.cb) {
			
			obj.dialogReturnValueCallback = obj.cb;
			
		} else if (!obj.cb && cb) {
			obj.dialogReturnValueCallback = cb;
		}
	};
	var handleSetup = function(phrase) {

		var obj,
			dataType = Object.prototype.toString.call(phrase);

		if (dataType === '[object String]') {
			obj = {};
			ensureDefaults(obj);
			obj.phrase = phrase;
			obj.buttons = [
				{
					class: "dialogButton",
					text: "Yes",
					numToPass: 1  
				},
				{
					class: "dialogButton",
					text: "No",
					numToPass: 0
				}
			];

		} else if (dataType === '[object Object]') {
			obj = phrase;
			ensureDefaults(obj);

		} else {
			throw new Error('incorrect data type passed to api.confirmation function');
		}
		return obj;
	};
	
	api.confirmation = function(phrase, cb) {
		//cb will be passed val, text
		var confirmOptions = handleSetup(phrase);
		
		confirmOptions.html = generateDialogHtml(confirmOptions);			

		handleCB(confirmOptions, cb);

		cleanAndFire(confirmOptions);
	};
	api.customSPDialog = function(props) {

		//props is at top of closure

		ensureDefaults(props);
		handleCB(props);

		if (!props.html) {
			props.html = generateDialogHtml(props);
		}
		

		cleanAndFire(props);
	};
})(jQuery, doeaSPlib);

(function ($, api) {

api.issue = function(message) {

	throw new Error(message);
};
api.getDataType = function(item) {

	return Object.prototype.toString.call(item);
};
api.elementTagName = function(element) {
	var ele;
	if (element instanceof $) {
		ele = element.prop('tagName');
	}else {
		ele = element.tagName;
	}

	return ele.toLowerCase();
};
api.arrayDiff = function(a1, a2, onBoth) {
	//a1 is the newer array and differences to it will be returned unless
	//onBoth is true then all differences between both will be returned
	var count1 = a1.length,
		count2 = a2.length,
		difference = [],
		ii;

	for(ii = 0; ii < count1; ii++) {
		if (a2.indexOf(a1[ii]) === -1) {
			difference.push(a1[ii]);
		}
	}
	if (onBoth) {
		for(ii = 0; ii < count2; ii++) {
			if (a1.indexOf(a2[ii]) === -1) {
				difference.push(a2[ii]);
			}
		}
	}
	return difference;
};
api.argsConverter = function(args, startAt) {
	var giveBack = [],
		numberToStartAt,
		total = args.length;
	for (numberToStartAt = startAt || 0; numberToStartAt < total; numberToStartAt++){
		giveBack.push(args[numberToStartAt]);
	  }
	  return giveBack;
};
api.arrayInsertAtIndex = function(array, index) {
	//all items past index will be inserted starting at index number
	var arrayToInsert = Array.prototype.splice.apply(arguments, [2]);
	Array.prototype.splice.apply(array, [index, 0].concat(arrayToInsert));
	return array;
};
api.arrayRemoveAtIndex = function(array, index) {
	Array.prototype.splice.apply(array, [index, 1]);
	return array;
};
api.arrayRemoveDuplicates = function(ary) {
    var seen = {},
    	out = [],
    	len = ary.length,
    	j = 0,
    	item;
    for(var i = 0; i < len; i++) {
		item = ary[i];
		if(seen[item] !== 1) {
		   seen[item] = 1;
		   out[j++] = item;
		}
    }
    return out;
};
api.firstLetterCaps = function(str) {

	return str.charAt(0).toUpperCase() + str.slice(1);
};
api.encodeAccountName = function(acctName) {
	var check = /^i:0\#\.f\|membership\|/,
		formattedName;

	if (check.test(acctName)) {
		formattedName = acctName;
	} else {
		formattedName = 'i:0#.f|membership|' + acctName;
	}

	return encodeURIComponent(formattedName);
};
api.getListColumns = function(siteUrl, listId, includeAll) {
	//includeAll is for hidden and readOnly
	var includeOthers = includeAll || false,
		url = siteUrl + "/_api/web/lists(guid'"+listId+"')/fields?$filter=Hidden eq "+includeOthers+" and ReadOnlyField eq "+ includeOthers;

	return api.server.ajaxGetData(url);
};
api.promiseDelay = function(time) {
	var def = $.Deferred(),
		amount = time || 5000;

	setTimeout(function() {
		def.resolve();
	}, amount);
	return def.promise();
};
api.cookies = (function() {

	function extend () {
		var i = 0;
		var result = {};
		for (; i < arguments.length; i++) {
			var attributes = arguments[ i ];
			for (var key in attributes) {
				result[key] = attributes[key];
			}
		}
		return result;
	}

	function init (converter) {
		function api (key, value, attributes) {
			var result;
			if (typeof document === 'undefined') {
				return;
			}

			// Write

			if (arguments.length > 1) {
				attributes = extend({
					path: '/'
				}, api.defaults, attributes);

				if (typeof attributes.expires === 'number') {
					var expires = new Date();
					expires.setMilliseconds(expires.getMilliseconds() + attributes.expires * 864e+5);
					attributes.expires = expires;
				}

				try {
					result = JSON.stringify(value);
					if (/^[\{\[]/.test(result)) {
						value = result;
					}
				} catch (e) {}

				if (!converter.write) {
					value = encodeURIComponent(String(value))
						.replace(/%(23|24|26|2B|3A|3C|3E|3D|2F|3F|40|5B|5D|5E|60|7B|7D|7C)/g, decodeURIComponent);
				} else {
					value = converter.write(value, key);
				}

				key = encodeURIComponent(String(key));
				key = key.replace(/%(23|24|26|2B|5E|60|7C)/g, decodeURIComponent);
				key = key.replace(/[\(\)]/g, escape);

				return (document.cookie = [
					key, '=', value,
					attributes.expires ? '; expires=' + attributes.expires.toUTCString() : '', // use expires attribute, max-age is not supported by IE
					attributes.path ? '; path=' + attributes.path : '',
					attributes.domain ? '; domain=' + attributes.domain : '',
					attributes.secure ? '; secure' : ''
				].join(''));
			}

			// Read

			if (!key) {
				result = {};
			}

			// To prevent the for loop in the first place assign an empty array
			// in case there are no cookies at all. Also prevents odd result when
			// calling "get()"
			var cookies = document.cookie ? document.cookie.split('; ') : [];
			var rdecode = /(%[0-9A-Z]{2})+/g;
			var i = 0;

			for (; i < cookies.length; i++) {
				var parts = cookies[i].split('=');
				var cookie = parts.slice(1).join('=');

				if (cookie.charAt(0) === '"') {
					cookie = cookie.slice(1, -1);
				}

				try {
					var name = parts[0].replace(rdecode, decodeURIComponent);
					cookie = converter.read ?
						converter.read(cookie, name) : converter(cookie, name) ||
						cookie.replace(rdecode, decodeURIComponent);

					if (this.json) {
						try {
							cookie = JSON.parse(cookie);
						} catch (e) {}
					}

					if (key === name) {
						result = cookie;
						break;
					}

					if (!key) {
						result[name] = cookie;
					}
				} catch (e) {}
			}

			return result;
		}

		api.set = api;
		api.get = function (key) {
			return api.call(api, key);
		};
		api.getJSON = function () {
			return api.apply({
				json: true
			}, [].slice.call(arguments));
		};
		api.defaults = {};

		api.remove = function (key, attributes) {
			api(key, '', extend(attributes, {
				expires: -1
			}));
		};

		api.withConverter = init;

		return api;
	}

	return init(function () {});
})();
api.sesStorage = {
	//frontEnd to session Storage
	storageAdaptor: sessionStorage,

	toType: function(obj) {
		return ({}).toString.call(obj).match(/\s([a-z|A-Z]+)/)[1].toLowerCase();
	},

	getItem: function(key) {
		var item = this.storageAdaptor.getItem(key);

		try {
			item = JSON.parse(item);
		} catch (e) {}

		return item;
	},
	setItem: function(key, value) {
		var type = this.toType(value);

		if (/object|array/.test(type)) {
			value = JSON.stringify(value);
		}

		this.storageAdaptor.setItem(key, value);
	},
	removeItem: function(key) {
		this.storageAdaptor.removeItem(key);
	}
};
api.sublish = (function() {
	var cache = {};
	return {
		publish: function(id) {
			var args = api.argsConverter(arguments, 1),
				ii,
				total;
			if (!cache[id]) {
				cache[id] = [];
			}
			total = cache[id].length;
			for (ii=0; ii < total; ii++) {
				cache[id][ii].apply(api, args);
			}

		},
		subscribe: function(id, fn) {
			if (!cache[id]) {
				cache[id] = [fn];
			} else {
				cache[id].push(fn);
			}
		},
		unsubscribe: function(id, fn) {
			var ii,
				total;
			if (!cache[id]) {
				return;
			}
			total = cache[id].length;
			for(ii = 0; ii < total; ii++){
				if (cache[id][ii] === fn) {
					cache[id].splice(ii, 1);
				}
			}
		},
		clear: function(id) {
			if (!cache[id]) {
				return;
			}
			cache[id] = [];
		}
	};
})();
api.exportToCSV = function exportToCsv(filename, rows) {
    /*
        rows should be
        exportToCsv('export.csv', [
            ['name','description'],	
            ['david','123'],
            ['jona','""'],
            ['a','b'],

        ])
    
    */
    var processRow = function (row) {
        var finalVal = '';
        for (var j = 0; j < row.length; j++) {
            var innerValue = row[j] === null ? '' : row[j].toString();
            if (row[j] instanceof Date) {
                innerValue = row[j].toLocaleString();
            };
            var result = innerValue.replace(/"/g, '""');
            if (result.search(/("|,|\n)/g) >= 0)
                result = '"' + result + '"';
            if (j > 0)
                finalVal += ',';
            finalVal += result;
        }
        return finalVal + '\r\n';
    };

    var csvFile = '';
    for (var i = 0; i < rows.length; i++) {
        csvFile += processRow(rows[i]);
    }

    var blob = new Blob([csvFile], { type: 'text/csv;charset=utf-8;' });
    if (navigator.msSaveBlob) { // IE 10+
        navigator.msSaveBlob(blob, filename);
    } else {
        var link = document.createElement("a");
        if (link.download !== undefined) { // feature detection
            // Browsers that support HTML5 download attribute
            var url = URL.createObjectURL(blob);
            link.setAttribute("href", url);
            link.setAttribute("download", filename);
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }
    }
};

})(jQuery, doeaSPlib);