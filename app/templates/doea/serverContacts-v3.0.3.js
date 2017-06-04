/*
Server Contacts
v3.0.3
01-19-17
requires:
common utilities
*/

var doeaSPlib = doeaSPlib || {};

//general
doeaSPlib.server = (function() {
	return {
		profileProperties: ['PreferredName','Bureau','JobTitle','Manager','WorkEmail',
		'WorkPhone', 'MobilePhone','OfficeNumber','BaseOfficeLocation', 'EmpPositionNumber', 'AccountName'],
		spSaveForm: function(formId, saveButtonValue) {
			if (!PreSaveItem()) {return false;}
			if (formId && SPClientForms.ClientFormManager.SubmitClientForm(formId)) {return false;}
			WebForm_DoPostBackWithOptions(new WebForm_PostBackOptions(saveButtonValue, "", true, "", "", false, true));
		}
	};
})();

//ajax
(function(api, $) {
	var s = api.server;

	var createlistitemtype = function(listName) {
		return 'SP.Data.' + 
			listName.charAt(0).toUpperCase() + 
			listName.slice(1) + 
			'ListItem';
	};
	var guidHexCodes = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', 'a', 'b', 'c', 'd', 'e', 'f'];
	var createGUID = function() {
		var result = '';

		for (var index = 0; index < 32; index++) {
		    var value = Math.floor(Math.random() * 16);

		    switch (index) {
		    case 8:
		        result += '-';
		        break;
		    case 12:
		        value = 4;
		        result += '-';
		        break;
		    case 16:
		        value = value & 3 | 8;
		        result += '-';
		        break;
		    case 20:
		        result += '-';
		        break;
		    }
		    result += guidHexCodes[value];
		}
		return result;
	};
	var checkUrlOrigin = (function() {

		var regCheck = function(urlString, addOn) {

			var correctUrlCheck = /^https\W.+\.com/;

			if (!correctUrlCheck.test(urlString)) {
				urlString = "https://fldoea.sharepoint.com" + urlString; 
			}
			return addToUrl(urlString, addOn);
		};
		var addToUrl = function(url, addToEnd) {

			return url + addToEnd;
		};

		return function(props, addOn) {
			var dataType = api.getDataType(props);

			if (dataType === '[object Object]') {
				props.configuredUrl = regCheck(props.url, addOn);
				return props;
			}
			if (dataType === '[object String]') {
				return regCheck(props, addOn);
			}

			//fell through so the incorrect datatype was passed to function, error
			api.issue('invalid data type passed to checkUrlOrigin function');
		};
	})();
	var listUrlConfigure = function(props) {

		if (!props.url || props.listUrl) {
			return;
		}

		checkUrlOrigin(props, "/_api/web");

		if (props.listGUID) {
			props.listUrl = props.configuredUrl += "/lists(guid'"+ props.listGUID +"')";
		} else if (props.listTitle) {
			props.listUrl = props.configuredUrl += "/lists/getbytitle('"+ props.listTitle +"')";
		}
		return props;
	};
	var listItemUrlConfigure = function(props) {
		//for create, update, delete
		var item = props.itemId || '';

		if (props.listItemUrl) {
			return;
		}

		listUrlConfigure(props);

		props.listItemUrl = props.listUrl += "/items("+ item +")";
		return props;
	};
	var getEntityType = function(props) {

		var entityData;

		if (props.listName) {
			entityData = createlistitemtype(props.listName);
			return $.Deferred().resolve(entityData);
		}

		return s.ajaxGetListInfo(props)
		.then(function(data) {
			return data.ListItemEntityTypeFullName;
		});
	};
	var nonDeleteProcess = function(props, headerData) {

		var item,
			header = headerData || {};

		return getEntityType(props)
		.then(function(type) {
			item = $.extend({
				'__metadata': {'type': type}
			}, props.infoToServer);

			return s.ajaxGetContext(props.url);
		}).then(function(context) {

			header['X-RequestDigest'] = context.FormDigestValue;
			header.Accept = 'application/json; odata=minimalmetadata';

			listItemUrlConfigure(props);

			return $.ajax({
				url: props.listItemUrl,
				type: 'POST',
				contentType: 'application/json;odata=verbose',
				data: JSON.stringify(item),
				headers: header
			});
		});
	};
	var deleteProcess = function(props, headerData, urlModifier) {

		var header = headerData || {};

		return s.ajaxGetContext(props.url)
		.then(function(context) {

			header['X-RequestDigest'] = context.FormDigestValue;
			header.Accept = 'application/json; odata=minimalmetadata';

			listItemUrlConfigure(props);

			if (urlModifier) {
				props.listItemUrl += urlModifier;
			}

			return $.ajax({
				url: props.listItemUrl,
				type: 'POST',
				contentType: 'application/json;odata=verbose',
				headers: header
			});
		});
	};
	var getPageInfo = function() {
		
		return _spPageContextInfo;
	};
	var parseBasePermissions = function(value) {
	    var permissions = new SP.BasePermissions();
	    permissions.initPropertiesFromJson(value);
	    var permLevels = [];
	    for(var permLevelName in SP.PermissionKind.prototype) {
	        if (SP.PermissionKind.hasOwnProperty(permLevelName)) {
	            var permLevel = SP.PermissionKind.parse(permLevelName);
	            if(permissions.has(permLevel)){
	                  permLevels.push(permLevelName);
	            }
	        }     
	    }
	    return permLevels;   
	};
	s.ajaxGetContext = function(url) {
		//response.FormDigestValue
		var urlChecked = checkUrlOrigin(url, "/_api/contextinfo");

		return $.ajax({
			url: urlChecked,
			method: "POST",
			headers: { "Accept": "application/json; odata=minimalmetadata" }
		});
	};
	s.ajaxGetData = function(url) {
		return $.ajax({
			url: url,
			type: 'GET',
			headers: {'Accept': 'application/json; odata=minimalmetadata'}
		});
	};
	s.ajaxGetAllResults = function(url, allResults) {

		return s.ajaxGetData(url)
		.then(function(response) {
			var url,
				data = allResults || [];
			
			response.value.forEach(function(item) {
				data.push(item);
			});
			if (response['odata.nextLink']) {
				url = response['odata.nextLink'];
				return s.ajaxGetAllResults(url, data);
			}
			return data;
		});
	};
	s.ajaxGetBatch = function(ArrayOfUrls, props) {
		// props = {
		// 	url: ,
		// 	context:
		// }
		var batchGUID = createGUID(),
			digestValue,
			batchBody,
			batchHeader,
			goingToUrl,
			batchContents = [];

		//get context
		if(props && props.context) {
			digestValue = props.context;
		} else {
			digestValue = document.getElementById('__REQUESTDIGEST').value;
		}

		//getUrl
		if(props && props.url) {
			//must be the whole url, "https://fldoea.sharepoint.com/sites/doeaspdev/routing"
			goingToUrl = props.url;
		} else {
			goingToUrl = getPageInfo().webAbsoluteUrl;
		}

		batchHeader = {
		'X-RequestDigest': digestValue,
		'Content-Type': 'multipart/mixed; boundary="batch_' + batchGUID + '"'
		};

		//batch (operation)
		ArrayOfUrls.forEach(function(item) {
			batchContents.push('--batch_' + batchGUID);
			batchContents.push('Content-Type: application/http');
			batchContents.push('Content-Transfer-Encoding: binary');
			batchContents.push('');
			batchContents.push('GET ' + item + ' HTTP/1.1');
			batchContents.push('Accept: application/json;odata=minimalmetadata');
			batchContents.push('');
		});

		batchContents.push('--batch_' + batchGUID + '--');

		batchBody = batchContents.join('\r\n');

		return $.ajax({
			url: goingToUrl + '/_api/$batch',
			type: 'POST',
			data: batchBody,
			headers: batchHeader
		}).then(function(response) {
			var parsedArray = [],
				responseToArray = response.split('\n');

			for (var currentLine = 0; currentLine < responseToArray.length; currentLine++) {
			  if (responseToArray[currentLine].charAt(0) === '{') {
				try {
				  // parse the JSON response...
				  var tryParseJson = JSON.parse(responseToArray[currentLine]);

				  parsedArray.push(tryParseJson);

				} catch (e) {
				  // don't do anything... just keep moving
				}
			  }
			}

			return parsedArray;

		});
	};
	s.ajaxGetListInfo = function(props) {
		//if you are pulling for rest create you need property - EntityTypeName
		//will accept listGUID or listTitle
		// {
		// 	url: '',
		// 	listGUID: 'dfdf-dfdfdaqfe-asdfasdf-ewf'
		// }
		listUrlConfigure(props);
		return this.ajaxGetData(props.listUrl);
	};
	s.ajaxPeopleSearch = function( requestQuery, currentResults ) {
		//returns employees only
		var allResults = currentResults || [],
			serverQueryData = {
				sourceid: "'213c743c-4c9b-4433-ad8c-6d4c9cd4d769'",
				startrow: 0,
				rowlimit: 500,
				TrimDuplicates: false,
				selectproperties: "'" + s.profileProperties.join(',') + "'"
			};
	 
			if ( typeof requestQuery === 'string' ) {
				serverQueryData.querytext = "'" + requestQuery + "'";
			} else{
			  //querytext: "'" + 'Bureau="'+ division + '"\''
				serverQueryData = $.extend({}, serverQueryData, requestQuery);
			}

		return $.ajax({
			url: 'https://fldoea.sharepoint.com/_api/search/query',
			type: 'GET',
			headers: {'Accept': 'application/json; odata=minimalmetadata'},
			data: serverQueryData
		})
		.then(function(empData) { //success function

			var relevantResults = empData.PrimaryQueryResult.RelevantResults;

			allResults = allResults.concat(relevantResults.Table.Rows);

			if (relevantResults.TotalRows > (serverQueryData.startrow + relevantResults.RowCount)) {
				serverQueryData.startrow = serverQueryData.startrow + relevantResults.RowCount;
				return s.ajaxPeopleSearch(serverQueryData, allResults);
			} else {
				return allResults;
			}
		},function() {  //fail function
			console.log(arguments);
		});
	};
	s.ajaxEnsureUser = function(acctName, siteURL, context) {
		//acctName should be i:0#.f|membership|user@domain.onmicrosoft.com link this
		var site = siteURL || getPageInfo().webAbsoluteUrl,
			endpointUrl = site + "/_api/web/ensureUser('" + encodeURIComponent(acctName) + "')";
		return $.ajax({       
		   url: endpointUrl,   
		   type: "POST",  
		   contentType: "application/json;odata=verbose",
		   headers: { 
			  "Accept": "application/json;odata=minimalmetadata",
			  "X-RequestDigest": context || document.getElementById('__REQUESTDIGEST').value
		   }
		});
	};
	s.ajaxGetSiteUserInfoByKey = function(key) {
		//key is i:0#.f|membership|user@domain.onmicrosoft.com
		var encodedKey = encodeURIComponent(key),
			url = getPageInfo().webAbsoluteUrl + "/_api/web/siteusers?"+
			"$filter=LoginName eq '"+ encodedKey +"'";
		return s.ajaxGetData(url);
	};
	s.ajaxGetItemsByCaml = function(properties) {
		//_api/web/lists/GetByTitle('1232312312')
		var query = { "query" :
			   {"__metadata": 
				{ "type": "SP.CamlQuery" },
					"ViewXml": properties.caml
				}
			},
			headerdata = {
				'Accept': 'application/json; odata=minimalmetadata',
				'Content-Type': 'application/json; odata=verbose',
				'X-RequestDigest': properties.context || document.getElementById('__REQUESTDIGEST').value
			};

		return $.ajax({
			url: properties.url + '/getitems',
			type: 'POST',
			data: JSON.stringify(query),
			headers: headerdata
		});
	};
	s.ajaxGetUserPermissions = function(props) {
		/*
			this function will give you an array of the permission a user has to a site or list/library
			for a site
			{
				type: site,
				url: "/sites/EA/routing", url of the site to check
				userEmail: blahblah@elderaffairs.org
			}
			for a list / library
			{
				type: list,    list or library
				url: "/sites/EA/routing", url of the site to check
				userEmail: blahblah@elderaffairs.org,
				listTitle: 'Route State'     listTitle or listGUID
			}
		*/
		var type = props.type ? props.type.toLowerCase() : null,
			toSend;

		props.encodedEmail = api.encodeAccountName(props.userEmail);

		if (type === 'site') {
			//getting site url
			checkUrlOrigin(props, "/_api/web");
			toSend = props.configuredUrl + "/getusereffectivepermissions(@user)?@user='"+props.encodedEmail+"'";
		} else if (type === 'list' || type === 'library') {
			//setting up list url
			listUrlConfigure(props);
			toSend = props.listUrl + "/getusereffectivepermissions(@user)?@user='"+props.encodedEmail+"'";
		} else {
			//didnot get enough data
			api.issue('incomplete data passed to ajaxGetUserPermissions');
		}



		return this.ajaxGetData(toSend)
		.then(function(response) {
			props.permissions = parseBasePermissions(response);
			return props;
		});
	};
	s.ajaxGetCurrentUserGroups = function(props) {
		// porps = {
		// 	userId: 9,
		// 	url: "/sites/EA/routing",
		// }
		//userid should be the id number of the person on the site - _spPageContextInfo.userId

		checkUrlOrigin(props, "/_api/web");

        return s.ajaxGetData(props.configuredUrl + "/GetUserbyId(" + props.userId + ")/Groups")
    	.then(function(groups){

    		var groupArray = [];

    		groups.value.forEach(function(item) {
    			groupArray.push(item.Title);
    		});

    		return groupArray;

        });
	};
	s.ajaxCreateItem = function(properties) {
		// listTitle or listGUID
		// {
		// 	listName: 'routeState', optional
		// 	listTitle: 'Route State'
		// 	url: "/sites/EA/routing",
		// 	infoToServer: {
		//    Title: 'Route '+ routeId +' progress tracker',
	 	//    TaskStatus: 'Draft',
	 	//    parentRouteID: routeId
		// }
		return nonDeleteProcess(properties);
	};
	s.ajaxUpdateItem = function(properties) {
		// listTitle or listGUID
		// {
		// 	listName: 'routeState', optional
		// 	listTitle: 'Route State'
		// 	url: "/sites/EA/routing",
		// 	itemId: 3,
		// 	infoToServer: {
		//    Title: 'Route '+ routeId +' progress tracker',
	 	//    TaskStatus: 'Draft',
	 	//    parentRouteID: routeId
		// }
		return nonDeleteProcess(properties, {
			"X-HTTP-Method": "MERGE",
			"If-Match": properties.etag || "*",
		});
	};
	s.ajaxDeleteItem = function (properties) {
		//****be warned if you use this function, the item you delete will be gone and unrecoverable!!!!****
		// listTitle or listGUID
		// doeaSPlib.server.ajaxCreateItem({
		//		listTitle: 'Route State'
		//		url: "/sites/EA/routing",
		//		itemId: 3
		// })
		return deleteProcess(properties, {
			'X-HTTP-Method' : 'DELETE',
			"If-Match": properties.etag || "*"
		});
	};
	s.ajaxRecycleItem = function (properties) {
		// listTitle or listGUID
		// doeaSPlib.server.ajaxCreateItem({
		//		listTitle: 'Route State'
		//		url: "/sites/EA/routing",
		//		itemId: 3
		// })
		return deleteProcess(properties, null, "/recycle");
	};
})(doeaSPlib, jQuery);

//jsom
(function(s, $) {
	var waitForScriptsReady = function(scriptName) {
		var def = $.Deferred();

		ExecuteOrDelayUntilScriptLoaded(function() {
			return def.resolve('Ready');
		}, scriptName);

		return def.promise();
	};
	var clearRequestDigest = function() {
		//this function was to clear the web manager when a taxonomy field was on the dom and you couldnt use jsom across site collections
		//the issue seems to be fixed 7/26/16 and i am commenting out the places where it is call in this file
		var manager = Sys.Net.WebRequestManager;
		if (manager._events !== null &&
			manager._events._list !== null) { 
			var invokingRequests = manager._events._list.invokingRequest; 

			while( invokingRequests !== null && invokingRequests.length > 0) 
			{ 
				manager.remove_invokingRequest(invokingRequests[0]); 
			} 
		}
	};
	var jsomToObj = function(spItemCollection) {
		var cleanArray = [],
			itemsToTranform;

		if (spItemCollection.context) {
			itemsToTranform = spItemCollection.listItems;
		} else {
			itemsToTranform = spItemCollection;
		}

		if (itemsToTranform.getEnumerator) {
			var enumerableResponse = itemsToTranform.getEnumerator();

			while (enumerableResponse.moveNext()) {
				cleanArray.push(
					enumerableResponse.get_current().get_fieldValues()
				);
			}

			return cleanArray;
		}

		itemsToTranform.forEach(function(item) {
			cleanArray.push(item.get_fieldValues());
		});
		return cleanArray;
	};

	s.jsomListItemRequest = function(props) {
		//props is obj {url, listId, query, columnsToInclude}
		return waitForScriptsReady('SP.js')
		.then(function() {
			//clearRequestDigest();

			var clientContext = props.url ? new SP.ClientContext(props.url) : new SP.ClientContext.get_current(),
				list = clientContext.get_web().get_lists().getById( props.listId ),
				camlQuery = new SP.CamlQuery(),
				pagingSetup,
				listItemCollection;

			if (props.position) {
				//position should be listItems.get_listItemCollectionPosition().get_pagingInfo()
				//to go forwards listItems.get_listItemCollectionPosition().get_pagingInfo()
				//to go backwards previousPagingInfo = "PagedPrev=TRUE&Paged=TRUE&p_ID=" + spItems.itemAt(0).get_item('ID'); 
				pagingSetup = new SP.ListItemCollectionPosition();
				pagingSetup.set_pagingInfo(props.position);
				camlQuery.set_listItemCollectionPosition(pagingSetup);
			}
			if (props.folderRelativeUrl) {
				//server relative url to scope the query, so it will only look in a certain folder
				camlQuery.set_folderServerRelativeUrl(props.folderRelativeUrl);
			}

			camlQuery.set_viewXml(props.query);
			listItemCollection = list.getItems(camlQuery);

			if (props.columnsToInclude) {
				clientContext.load(listItemCollection, 'Include('+ props.columnsToInclude.join(',') +')');
			}else { 
				clientContext.load(listItemCollection);
			}

			

			return s.jsomSendDataToServer({
				context: clientContext,
				listItems: listItemCollection
			});
		});
	};
	s.jsomEnsureUser = function(user, url) {
		//user can be an object or array
		var datatype = Object.prototype.toString.call(user),
			startStringCheck = /^i:0#\.f\|membership\|/,
			verifiedUsers = [],
			usersToVerify,
			def = $.Deferred(),
			context,
			userLogin,
			web,
			temp;

		if (datatype === '[object Object]') {
			usersToVerify = [user];
		}
		if (datatype === '[object Array]') {
			usersToVerify = user;
		}
		if (!usersToVerify) {
			// never got set so the wrong datatype was passed
			throw new Error('an object or array must be the parameter to jsomEnsureUser');
		}
		context = url ? new SP.ClientContext(url) : new SP.ClientContext.get_current();
		web = context.get_web();


		usersToVerify.forEach(function(userData, index) {
			//i:0#.f|membership|
			userLogin = userData.AccountName || userData.WorkEmail;

			if (!startStringCheck.test(userLogin)) {
				userData.AccountName = 'i:0#.f|membership|'+userLogin.toLowerCase();
				userLogin = userData.AccountName;
			}

			temp = web.ensureUser(userLogin);
			verifiedUsers[index] = temp;
			context.load(verifiedUsers[index]);
		});

		this.jsomSendDataToServer({
			context: context
		}).then(function() {
			var giveBackValue,
				userTemp;

			usersToVerify.forEach(function(user, index) {
				userTemp = verifiedUsers[index]; 
				user.id = userTemp.get_id();
				if (!user.WorkEmail) {
					user.WorkEmail = userTemp.get_email();
				}
				if (!user.PreferredName) {
					user.PreferredName = userTemp.get_title();
				}
			});
			giveBackValue = datatype === '[object Object]' ? usersToVerify[0] : usersToVerify;
			def.resolve(giveBackValue);
		}).fail(function() {
			def.reject();
		});

		return def.promise();
	};
	s.jsomGetItemsById = function(props) {
		//props is obj {url, listId || listName, arrayOfIDs, numberToStartAt columnsToInclude}

		return waitForScriptsReady('SP.js')
		.then(function() {
			//clearRequestDigest();

			var clientContext = props.url ? new SP.ClientContext(props.url) : new SP.ClientContext.get_current(),
				arrayOfResults = props.previousResults || [],
				totalItemsPerTrip = props.maxPerTrip || 200,
				totalItemsToGet = props.arrayOfIDs.length,
				ii = props.numberToStartAt || 0,
				listItemCollection = [],
				list = clientContext.get_web().get_lists();

			if (props.listId) {
				list = list.getById( props.listId );
			} else {
				list = list.getByTitle( props.listName );
			}

			while (ii < totalItemsToGet) {
				var item = list.getItemById( props.arrayOfIDs[ii] );
				if (props.columnsToInclude) {
					//Include('properties') does not work here;
					clientContext.load (item, props.columnsToInclude);
				}else { 
					clientContext.load(item);
				}
				listItemCollection.push( item );
				
				if ( listItemCollection.length === totalItemsPerTrip ) {
					ii++;
					break;
				} else {
					ii++;
					continue;
				}
			}   

			return s.jsomSendDataToServer({
				context: clientContext,
				listItems: listItemCollection
			}).then(function(data) {
				var cleanedResults = jsomToObj(data.listItems),
					combinedArray = arrayOfResults.concat( cleanedResults );
					
				if ( ii < totalItemsToGet ) {
					props.numberToStartAt = ii;
					props.previousResults = combinedArray;
					return s.jsomGetItemsById(props);
				}

				return combinedArray;
			}).fail(function() {
				var errorObj = arguments;
			});
		});
	};
	s.jsomGetFilesByRelativeUrl = function(props) {
		//props is obj {url, fileRefs, numberToStartAt columnsToInclude}

		return waitForScriptsReady('SP.js')
		.then(function() {
			//clearRequestDigest();

			var clientContext = props.url ? new SP.ClientContext(props.url) : new SP.ClientContext.get_current(),
				web = clientContext.get_web(),
				totalItemsToGet = props.fileRefs.length,
				ii = 0,
				fileObjCollection = [];

			while (ii < totalItemsToGet) {
				var file = web.getFileByServerRelativeUrl(props.fileRefs[ii]);
				if (props.columnsToInclude) {
					//Include('properties') does not work here;
					clientContext.load (file, props.columnsToInclude);
				}else { 
					clientContext.load(file);
				}
				fileObjCollection.push( file );
				ii++;
			}   

			return s.jsomSendDataToServer({
				context: clientContext,
				files: fileObjCollection
			}).then(function(data) {
				return data;
			}).fail(function() {
				var errorObj = arguments;
			});
		});
	};
	s.jsomOffBoardByPosNum = function(arrayOfValues, numberToStartAt, results) {
		//arrayOfValues must be array of <Value Type="Text">'+ EmpPositionNumber +'</Value>'
		//gets data from the off boarding list of on off boarding site
		var totalItems = arrayOfValues.length,
			totalPerTrip = 55,
			allResults = results || [],
			valuesForQuery = [],
			ii = numberToStartAt || 0;

		while ( ii < totalItems ) {
			
			valuesForQuery.push( arrayOfValues[ii] );
			
			if ( valuesForQuery.length === totalPerTrip ) {
				ii++;
				break;
			} else {
				ii++;
				continue;
			}
		} 

		var query = '<View>' +
						'<Query>' +
							'<Where>' +
								'<In>' +
									'<FieldRef Name="Position_x0020_Number"/>' +
									'<Values>' +
										valuesForQuery.join('') +
									'</Values>' +
								'</In>' +
							'</Where>' +
						'</Query>' +
					'</View>';

		return s.jsomListItemRequest({
			url: '/AdminSupport/InformationSystems/HelpDesk/onoffb',
			listId: '719CA0E0-E017-4DFF-B04B-6CD1CE9B7BC5',
			query: query,
			columnsToInclude: ['Title','FirstName', 'Email','Separation_x0020_Date', 'Position_x0020_Number']
		}).then(function(response) {
			var cleanResults = jsomToObj(response),
				combinedArray = allResults.concat(cleanResults);

			if ( ii < totalItems ) {
				s.jsomOffBoardByPosNum(arrayOfValues, ii, combinedArray);
			}

			return combinedArray;
		});
	};
	s.jsomGetPosDataByPosNum = function(arrayOfValues, columnsNeeded, numberToStartAt, results) {
		//arrayOfValues must be array of <Value Type="Text">'+ EmpPositionNumber +'</Value>'
		//gets data from position number map in the root of enterprise applications
		var totalItems = arrayOfValues.length,
			totalPerTrip = 55,
			allResults = results || [],
			valuesForQuery = [],
			ii = numberToStartAt || 0;

		while ( ii < totalItems ) {
			
			valuesForQuery.push( arrayOfValues[ii] );
			
			if ( valuesForQuery.length === totalPerTrip ) {
				ii++;
				break;
			} else {
				ii++;
				continue;
			}
		} 

		var query = '<View>' +
						'<Query>' +
							'<Where>' +
								'<In>' +
									'<FieldRef Name="Title"/>' +
									'<Values>' +
										valuesForQuery.join('') +
									'</Values>' +
								'</In>' +
							'</Where>' +
						'</Query>' +
					'</View>';

		return s.jsomListItemRequest({
			url: '/sites/EA',
			listId: '11B668BE-0B7D-451B-B25C-6212A2217B3B',
			query: query,
			columnsToInclude: columnsNeeded
		}).then(function(response) {
			var cleanResults = jsomToObj(response),
				combinedArray = allResults.concat(cleanResults);

			if ( ii < totalItems ) {
				s.jsomOffBoardByPosNum(arrayOfValues, ii, combinedArray);
			}

			return combinedArray;
		});
	};
	s.getDepartmentDivisions = function() {
		//item.IsAvailableForTagging
		return this.jsomTaxonomyRequest('2cd8be83-3036-4659-bcfc-fb2d528fdd09')
		.then(function(response) {
			var sortAtoZ = function(ary) {
				return ary.sort(function aToZ(a, b) {
					var nameA=a.Name.toLowerCase(), nameB=b.Name.toLowerCase();
					if (nameA < nameB) {//sort string ascending
					  return -1;
					}
					if (nameA > nameB) {
					  return 1;
					}
					 return 0; //default return value (no sorting)
				});
			};
			var enumerableTerms = response.terms.getEnumerator(),
				divisions = [];

			while (enumerableTerms.moveNext()) {
				var currentTerm = enumerableTerms.get_current();

				divisions.push(currentTerm.get_objectData().get_properties());
			}
			divisions = sortAtoZ(divisions);
			return divisions;
		});
	};
	s.jsomTaxonomyRequest = function(termSetID) {
		//item.IsAvailableForTagging
		return waitForScriptsReady('sp.taxonomy.js')
		.then(function() {
			//clearRequestDigest();

			var clientContext = new SP.ClientContext.get_current(),
				taxonomySession = SP.Taxonomy.TaxonomySession.getTaxonomySession(clientContext),
				termStore = taxonomySession.get_termStores().getById("5b7c889a745c4087bccb796372e50d36"),
				termSet = termStore.getTermSet(termSetID),
				terms = termSet.getAllTerms();
				
				clientContext.load(terms, 'Include(CustomProperties, Id,'+
					'IsAvailableForTagging, LocalCustomProperties, Name, PathOfTerm)');

			return s.jsomSendDataToServer({
				context: clientContext,
				terms: terms
			});
		});
	};
	s.jsomSendDataToServer = function(serverData) {
		var def = $.Deferred();
				
		serverData.context.executeQueryAsync(
			function() {
				//success
				def.resolve(serverData);
			},
			function() {
				def.reject(arguments);
			}
		); //end QueryAsync
		return def.promise();
	};
	s.jsomListItemDataExtractor = function(listItemCollection) {
		
		return jsomToObj(listItemCollection);
	};
})(doeaSPlib.server, jQuery);