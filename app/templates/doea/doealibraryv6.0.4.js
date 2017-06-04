/*
doeaLibrary
version 6.0.4
updated 04/03/16
*/

var doeaSPlib = doeaSPlib || {};

(function ($, api) {

	var privateAPI = {
		ensureServerContacts: function() {
			if(doeaSPlib.server){
				return $.Deferred().resolve();
			}
			return $.getScript("https://fldoea.sharepoint.com/Scripts/serverContacts.js");
		},
		dateDiff: { //d1 should be today date, generally
			inDays: function(d1, d2) {
		        var t2 = d2.getTime(),
		        	t1 = d1.getTime();

		        return parseInt((t2-t1)/(24*3600*1000));
		    },
		    inWeeks: function(d1, d2) {
		        var t2 = d2.getTime(),
		        	t1 = d1.getTime();

		        return parseInt((t2-t1)/(24*3600*1000*7));
		    },
		    inMonths: function(d1, d2) {
		        var d1Y = d1.getFullYear(),
		        	d2Y = d2.getFullYear(),
		        	d1M = d1.getMonth(),
		        	d2M = d2.getMonth();

		        return (d2M+12*d2Y)-(d1M+12*d1Y);
		    },

		    inYears: function(d1, d2) {
		        return d2.getFullYear()-d1.getFullYear();
		    }
		},
		cleanSearchData: function(results, needProps) {
			var ii,cleanProps,properties,totalItems;

			return results.map(function(item) {
                cleanProps = {};
                properties = item.Cells;
                totalItems = properties.length;

                for (ii = 0; ii < totalItems; ii++) {
                    if( needProps.indexOf(properties[ii].Key) !== -1){
                        cleanProps[properties[ii].Key] = properties[ii].Value;
                    }
                    continue;
                }
                return cleanProps;
            });
		},
		compareSepDate: function(numberOfDaysAcceptable, sourceArray, offBoardArray) {
			//numberOfDaysAcceptable means user will be kept if seperation date minus
			//today is greater than or equal to, return new array
			var today = new Date();
			var newEmpArray = sourceArray.reduce(function(employees, sourceEmp) {
				var empPositionNum = sourceEmp.EmpPositionNumber,
					keepSourceEmployee = true;

				offBoardArray.some(function(offBoardEmp) {
					if( empPositionNum === offBoardEmp.Position_x0020_Number ){
						//user found in off boarding list

						var seperationDate = new Date(offBoardEmp.Separation_x0020_Date.toISOString()),
						    tilSeperationDate = privateAPI.dateDiff.inDays(today, seperationDate),
						    emailMatch = sourceEmp.WorkEmail.toLowerCase() === offBoardEmp.Email.toLowerCase();


						if( emailMatch &&
						    numberOfDaysAcceptable >= tilSeperationDate ){

							keepSourceEmployee = false;
						    return true; //dont keep source employee this employ
						}
					}
				});

				if(keepSourceEmployee){
					employees.push(sourceEmp);
				}
				return employees;
			}, []);
			return newEmpArray;
		}
	}; //end private

	api.userInfoRetriever = (function(priLib, lib) {

		var propsWeUse = ['PreferredName','SPS-JobTitle','WorkPhone','OfficeNumber',
			'WorkEmail','doeaSpecialAccount','SPS-Department','AccountName','SPS-Location',
			'PositionID','Manager','Office', "LastName", "FirstName"];

		var userPropsCleaner = function (props) {
			var propertiesObj = {};

			props.forEach(function(item) {

				if ( propsWeUse.indexOf(item.Key) === -1 ) {
					return;
				}
				if ( item.Key === "PreferredName" ) {
	        		propertiesObj.DisplayName = item.Value || 'None';
	        	}
	        	if ( item.Key === "SPS-JobTitle" ) {
	        		propertiesObj.JobTitle = item.Value || 'None';
	        	}
	        	if ( item.Key === "SPS-Department" ) {
	        		propertiesObj.Department = item.Value || 'None';
	        	}
	        	if ( item.Key === "SPS-Location" ) {
	        		propertiesObj.Location = item.Value || 'None';
	        	}

	        	propertiesObj[item.Key] = item.Value || 'None';

			});
			
        	return propertiesObj;
    	};

		return function(acct) {

			var user = acct || lib.spPageInfo().userLoginName,
				doesUserNameNeedLeader = user.substr(0, 18) !== 'i:0#.f|membership|',
				url = '';

			if(doesUserNameNeedLeader){
				user = 'i:0#.f|membership|' + user;
			}

			var formattedUserName = encodeURIComponent(user);

			url += "https://fldoea.sharepoint.com/_api/sp.userprofiles.peoplemanager";
			url += "/getpropertiesfor(@v)?@v='" + formattedUserName +"'";
			url += '&$select=UserProfileProperties';

	        return priLib.ensureServerContacts()
	        .then(function() {
	        	return lib.server.ajaxGetData(url);
	        }).then(function(properties){ //success

	        	if (properties['odata.null'] === true) {

	        		return 'User Not Found';

	        	} else{

	        		return userPropsCleaner(properties.UserProfileProperties);

	        	}

	        }).fail(function(sender, args) {
	        	return args.getMessage();
	        });
		};
	})(privateAPI, api); //end userInfoRetriever
	api.formBanner = (function(lib) {
		
		var printBannerToScreen = function(user, fieldToAppendTo) {
			var bannerHTML = '<div id="formInfoBanner"><h2 id="formUserInfoName">'+ user.PreferredName +
				'</h2><div id="formInfoListContainer"><ul id="formUserInfoLeft"><li>'+ user['SPS-JobTitle'] +
				'</li><li>'+ user['SPS-Department'] +'</li><li class="supervisorField"></li></ul>'+
				'<ul id="formUserInfoRight"><li>'+ user.WorkEmail + '</li><li>'+ user.WorkPhone +'</li><li>'+ 
				user.Office +'</li></ul><div style="clear: both;"></div></div>'+
				'<span id="formDisclaimer">If any of this information is incorrect please create a Help Desk Ticket.</span></div>';

			fieldToAppendTo.before(bannerHTML);
		};
		var updateManagerName = function(textToShow) {

			$('ul#formUserInfoLeft')
				.find('li.supervisorField')
				.text('Supervisor: ' + textToShow);
		};

		return function(element) {
			/*
			this function is for the DOEA form banner to activate it place 
			a div on a form page with an ID of formTitleBanner, and <h1> 
			with the title of the form it compamion css file is bannerstyles.css,
			that file will need to parsed as well example  
			<div id="formTitleBanner"><h1>Employee of the Month Nominations</h1></div>
			*/
			var isElementJquery = element instanceof jQuery;

			if ( !isElementJquery ) {
				throw new Error('jQuery object not passed to formBanner function');	
			}

			return this.userInfoRetriever()
			.then(function(userProps) { 

				var user = userProps;

				printBannerToScreen(userProps, element);


				//is manager field blank
				if ( userProps.Manager === 'None' ) {
					
					updateManagerName('None');
					return user;
				}

				//not blank
				return lib.userInfoRetriever(userProps.Manager)
				.then(function(manprops) { //succcess
					var managerName;

					user.managerProps = manprops;

					managerName = manprops === 'User Not Found' ? 'None' : manprops.PreferredName;
						
					updateManagerName(managerName);

					return user;

				}, function() { //fail

					updateManagerName('None');
					return user;
				});
			});
		};
	})(api); // end of formBanner
	api.pageEditModeTest = function() {

		if ($('#MSOLayout_InDesignMode').val() === '1') {
			return false;
		} else{
			return true;
		}
	}; //end edit mode test
	api.hideRibbon = (function() {
		
		var heightCheck = function() {
			var currentHeight = parseInt(ribbon.style.height, 10);
			if ( currentHeight !== 0 ) {
	            SelectRibbonTab("Ribbon.Read", true);

	            setTimeout(heightCheck, 300);
			}
		};
		var ribbon;

		return function() {
			
			ribbon = document.getElementById('s4-ribbonrow');

			//hide ribbon
			ribbon.style.display = "none";

			// Set the tab to the �Browse� tab
			SelectRibbonTab("Ribbon.Read", true);

			setTimeout(heightCheck, 700);
		};
	})(); //end hide ribbon
	api.URLparameters = function(parastring) {
		//pass location.search

		var parse = function(params, pairs) {
            var pair = pairs[0],
            	parts = pair.split('='),
            	key = decodeURIComponent(parts[0]),
            	value = decodeURIComponent(parts.slice(1).join('='));

            // Handle multiple parameters of the same name
            if (typeof params[key] === "undefined") {
              params[key] = value;
            } else {
              params[key] = [].concat(params[key], value);
            }

            return pairs.length === 1 ? params : parse(params, pairs.slice(1));
          };

          // Get rid of leading ?
          return parastring.length === 0 ? {} : parse({}, parastring.substr(1).split('&'));
	}; // end URL parameters
	api.employeeInfoByPosNum = (function(priLib, lib) {

		var getUserData = function(posNumber) {
			return lib.server.ajaxPeopleSearch("EmpPositionNumber=\""+ posNumber + "\"")
			.then(function(results) {
				if ( results.length === 0 ) {
					return getSupervisorID(posNumber);
				}
				return checkOffBoarding(results);
			});
		};
		var checkOffBoarding = function(userData) {
			//userData is an array of objs
			var cleanInfo = priLib.cleanSearchData(userData, lib.server.profileProperties),
				positionNumbersQuery = '<Value Type="Text">'+ cleanInfo[0].EmpPositionNumber +'</Value>';
			
			return lib.server.jsomOffBoardByPosNum([positionNumbersQuery])
			.then(function(offBoardingResults) {
				var count = offBoardingResults.length;

				if ( count === 0 ) {
					return cleanInfo[0];
				}

				var afterOffBoarding = priLib.compareSepDate(7, cleanInfo, offBoardingResults);
				if (afterOffBoarding.length === 0 ) {
					return getSupervisorID(cleanInfo[0].EmpPositionNumber);
				}
				return afterOffBoarding[0];
			});
		};
		var getSupervisorID = function(posNumber) {
			var positionNumbersQuery = '<Value Type="Text">'+ posNumber +'</Value>';

			return lib.server.jsomGetPosDataByPosNum([positionNumbersQuery], ['Position_Number'])
			.then(function(results) {
				var count = results.length,
					supervisorPosNum;

				if (count === 0) {
					return null;
				}
				
				supervisorPosNum = results[0].Position_Number;

				return getUserData(supervisorPosNum);


			});
		};

		return function(positionNumbers) {
			//this function accepts a string single position number
			//or an array of string position numbers
			//and returns an array if the info for first non offboarding staff
			
			return priLib.ensureServerContacts()
			.then(function() {

				var aryOfReturnDefs = [],
					dataType = Object.prototype.toString.call(positionNumbers);

				if (dataType === '[object String]') {
					
					aryOfReturnDefs.push( getUserData(positionNumbers) );

				} else if (dataType === '[object Array]') {
					positionNumbers.forEach(function(num) {
						aryOfReturnDefs.push( getUserData(num) );						
					});
				}


	        	return $.when.apply($, aryOfReturnDefs)
	        	.then(function() {
	        		return lib.argsConverter(arguments);
	        	});
			});
		};
	})(privateAPI, api);
	api.staffDirectory = (function(priLib, lib) {
		var createProfileURL = function(prefferedName, emailAddy) {

	    	return '<a href="https://fldoea-my.sharepoint.com/PersonImmersive.aspx?accountname='+
            'i%3A0%23%2Ef%7Cmembership%7C'+ emailAddy.substr(0, emailAddy.indexOf('@')) +'%40elderaffairs%2Eorg">' +
            prefferedName + '</a>';
		};
        var createTR = function (info) {

        	var tr = '<tr>';
        	tr += '<td>'+ createProfileURL(info.PreferredName, info.WorkEmail) +'</td>';
        	tr += '<td>'+ info.JobTitle +'</td>';
        	tr += '<td>'+ info.WorkPhone +'</td>';
        	tr += '<td>'+ info.WorkEmail +'</td>';
        	tr += '<td>'+ info.OfficeNumber +'</td>';
        	tr += '</tr>';

        	return tr;
        };
		var prepareDataForTable = function(results) {
		    var trsToAppend = [];

		    results.forEach(function(item) {
		    	trsToAppend.push( createTR(item) );
		    });

		    return trsToAppend;
		};
		return function(dirProps) {
			//dirProps needs to be an object with element (to append to), division to search on, and query if you need (it must be query: {what you want to change}) 
			if (lib.pageEditModeTest()) {

	            if (typeof dirProps !== "object") { //if arguments are not object then alert
	                alert('The argument to stafDir should be a object with 2 properties: element and division');
	            } else{

	            	return priLib.ensureServerContacts()
	        		.then(function() {
	                	return lib.server.ajaxPeopleSearch("Bureau=\""+ dirProps.division + "\"");
	            	}).then(function(data) {  
	            		var neededProps = lib.server.profileProperties,
	        			    staff;

	        			staff = priLib.cleanSearchData(data, neededProps);

	                    dirProps.element.append($('<tbody>' + prepareDataForTable(staff).join('') + '</tbody>'));
	                });
	            }

	        } else{
		    	dirProps.element.children('tbody').remove();
		    }	    
		};
	})(privateAPI, api); // end staff directory
	api.orgDirectory = (function(priLib, lib) {
		
	    var createHeaderRows = function(html, classText) {
	        var span = $('<span/>').html(html),
	            td = $('<td/>', {
	                    'colspan': 4,
	                    'class': classText,
	                    html: span
	            });


	        return $('<tr/>').append(td);
	    };
	    var supervisorTRs = function(staffArray) {
	        var rows = [];

	        rows.push( createHeaderRows('Supervisor', 'header') );

	        rows = rows.concat( staffDataToTR(staffArray) );

	        return rows;
	    };
	    var staffDataToTR = function(staffArray) {
	        return staffArray.map(function(data) {
	            return $('<tr/>').append(
	                $('<td/>').html(data.PreferredName),
	                $('<td/>').html(data.JobTitle),
	                $('<td/>').html(data.WorkPhone),
	                $('<td/>').html(data.OfficeNumber)
	            );
	        });
	    };
	    var staffTRs = function(staffObj) {
	        var rows = [],
	            staffSubHeaders = Object.keys(staffObj);

	        staffSubHeaders.sort();

	        rows.push( createHeaderRows('Staff', 'header') );

	        staffSubHeaders.forEach(function(subheading) {
	            if(subheading !== 'default'){
	                rows.push( createHeaderRows(subheading, 'subHeader') );
	            }
	            var currentSub = staffObj[subheading];
	            rows = rows.concat( staffDataToTR(currentSub) );

	        });
	        return rows;
	    };
		var createElements = function(structureStaff) {

		    var tableRows = [];
		    if(structureStaff.supervisor.length > 0){
		        var superRows = supervisorTRs(structureStaff.supervisor);
		        
		        tableRows = tableRows.concat(superRows);
		    }
		    var staffRows = staffTRs(structureStaff.staff);

		    tableRows = tableRows.concat(staffRows);

		    return tableRows;
		};
		var findMatchInfo = function(empData, currentEmp) {
		    var matchInfo;
		    empData.some(function(employee) {
		        if( employee.EmpPositionNumber === currentEmp.Title ){
		            matchInfo = employee;
		            return true;
		        }
		    });
		    return matchInfo || null;
		};
		var sorter = function(a, b) {
			if (a.PreferredName.toLowerCase() < b.PreferredName.toLowerCase()) {return -1;}
			if (a.PreferredName.toLowerCase() > b.PreferredName.toLowerCase()) {return 1;}
			return 0;
		};
		var finishAndPrint = function(empData, posData, domElement) {

    		var	staffStructured = {
    			    supervisor: [],
    			    staff: {
    			        default: []
    			    }
    			};
    		
    		posData.forEach(function(currentItem) {
    			var emp = findMatchInfo(empData, currentItem);

    			if(!currentItem.Role && emp) {
    			    //no roll
    			    staffStructured.staff.default.push(emp);
    			    return;
    			}
    			//role is present
    			if(currentItem.Role === 'Supervisor' && emp){
    			    staffStructured.supervisor.push(emp);
    			    return;
    			}
    			if( !staffStructured.staff[currentItem.Role] && emp ){
    			    staffStructured.staff[currentItem.Role] = [];
    			}
    			if(emp){
    			    staffStructured.staff[currentItem.Role].push(emp);
    			    return;   
    			}
    		});

			if ( staffStructured.length > 0 ) {
				staffStructured.supervisor.sort(sorter);
			}

			for (var prop in staffStructured.staff) {
				if (staffStructured.staff[prop].length > 0) {
					staffStructured.staff[prop].sort(sorter);
				}
			}

			//print to screen
			var rowsForScreen = createElements(staffStructured),
				tbody = $('<tbody/>');
				
			tbody.append(rowsForScreen);
			domElement.append(tbody);
		};
		return function(dirProps) {
			var positionNumbersQuery,
			    cleanEmpResults;

	    	return priLib.ensureServerContacts()
			.then(function() {
	        	return lib.server.ajaxPeopleSearch("Bureau=\""+ dirProps.division + "\"");
	    	}).then(function(data) {
	    		var positionNumbers = [],
	    			positionInfoColumns = ['Title','Role'];

	    		if( data.length === 0 ) {
	    			return $.Deferred().reject('No matches found');
	    		}
	    		
	    		cleanEmpResults = priLib.cleanSearchData(data, lib.server.profileProperties);

	    		positionNumbersQuery = cleanEmpResults.reduce(function(numbers, info) {
	    		    if(positionNumbers.indexOf(info.EmpPositionNumber) === -1){
	    		        //number not found, no dups
	    		        numbers.push( '<Value Type="Text">'+ info.EmpPositionNumber +'</Value>' );
	    		        positionNumbers.push(info.EmpPositionNumber);
	    		    }
	    		    return numbers;
	    		}, []);

	    		return $.when(
	    			lib.server.jsomOffBoardByPosNum(positionNumbersQuery),
	    			lib.server.jsomGetPosDataByPosNum(positionNumbersQuery, positionInfoColumns)
	    		);

	    	}).then(function(offBoardingResults, positionInfoResults) {
	    		
	    		var count = offBoardingResults.length,
	    			afterOffBoarding;

	    		if( count === 0 ){
	    			finishAndPrint(cleanEmpResults, positionInfoResults, dirProps.element); //no matches for off boarding finish
	    			return;
	    		}

	    		afterOffBoarding = priLib.compareSepDate(1, cleanEmpResults, offBoardingResults);

	    		finishAndPrint(afterOffBoarding, positionInfoResults, dirProps.element);
	    		return;

	    	});
		};
	})(privateAPI, api);
	api.waitForScriptsReady = function(scriptName) {
        var def = $.Deferred();

        ExecuteOrDelayUntilScriptLoaded(function() {
            return def.resolve('Ready');
        }, scriptName);

        return def.promise();
	};
	api.spPageInfo = function() {

		return window._spPageContextInfo;
	};
	api.spGotoUrl = function(url) {

		STSNavigate(url);
	};
	api.spSearchResultsCleaner = function(results, neededProps) {
		if (!neededProps) {
			// nothing to compare to
			throw new Error('Need array to compare to.');
		}
		return privateAPI.cleanSearchData(results, neededProps);
	};
	api.peoplePicker = {
		getPickerField: function(container, parentAttr, returnId) {
			//return id is a boolean for field id or just field
			//put class on the container div and pass that in
			var personField = container
				.find(parentAttr)
				.children('div')
				.children('div');

			if (returnId) {
				var fieldId = personField.length > 0 ? 
					personField.attr('id') :
					null;
				return fieldId;
			}

			return personField;		
		},
		removeObjRef: function(personFieldId) {
			if (SPClientPeoplePicker.SPClientPeoplePickerDict[personFieldId]) {
				delete SPClientPeoplePicker.SPClientPeoplePickerDict[personFieldId];
			}
			return SPClientPeoplePicker.SPClientPeoplePickerDict;
		},
		removeUsers: function(personFieldId, allUsers) {
			//personFieldId is the id of the person div (formPersonPicker1_TopSpan)
			//allUsers is a boolean if true all users all deleted, else just one on far right
			var currentPickerField = SPClientPeoplePicker.SPClientPeoplePickerDict[ personFieldId ],
				totalUsers = this.getUsersInfo(personFieldId).length;
			if (allUsers && totalUsers > 0) {
				$('#'+ personFieldId.replace('$', '\\$'))
				.find('span.sp-peoplepicker-userSpan')
				.each(function() {
					currentPickerField.DeleteProcessedUser(this);
				});
				return currentPickerField;
			} 
			if (totalUsers > 0) {
				currentPickerField.DeleteProcessedUser();
				return currentPickerField;
			}		
		},
		addUser: function(personFieldId, userProp1, userProp2, resolveUser) {
			//userProp1 should be AccountName, userProps2 PreferredName
			//or they can both be email
			var personObj = SPClientPeoplePicker.BuildUnresolvedEntity(userProp1, userProp2),
				pickerField = SPClientPeoplePicker.SPClientPeoplePickerDict[ personFieldId ],
				shouldUserBeResolved = resolveUser || true;	

			pickerField.AddUnresolvedUser(personObj, shouldUserBeResolved);
			return pickerField;
		},
		getUsersInfo: function(personFieldId) {
			//personFieldId is the id of the person div (formPersonPicker1_TopSpan)
			return SPClientPeoplePicker.SPClientPeoplePickerDict[ personFieldId ].GetAllUserInfo();
		},
		notifiyPeoplePickersReady: function() {
			function test() {
				if ($.isEmptyObject(peoplePickers)) {
					setTimeout(test, 300);
				} 
				else {
					def.resolve(peoplePickers);
				}
			}
			var def = $.Deferred(),
				peoplePickers;

			return api.waitForScriptsReady('clientpeoplepicker.js')
			.then(function() {
				peoplePickers = SPClientPeoplePicker.SPClientPeoplePickerDict;
				test();
				return def.promise();
			});
		},
		initializePeoplePicker: function(options) {
			/*need 
				<SharePoint:ScriptLink name="" runat="server" LoadAfterUI="true" Localizable="false" />
		   		clienttemplates.js
				clientforms.js
				clientpeoplepicker.js
				autofill.js
				sp.js
				sp.runtime.js
				sp.core.js
		   */
		   // Create a schema to store picker properties, and set the properties.
		   var schema = {};
		   schema.PrincipalAccountType = options.type || 'User,DL,SecGroup,SPGroup';
		   schema.SearchPrincipalSource = options.Search || 15;
		   schema.ResolvePrincipalSource = options.Resolve || 15;
		   schema.AllowMultipleValues = options.MultipleValues || false;
		   schema.MaximumEntitySuggestions = options.EntitySuggestions || 50;
		   schema.Width = options.width || '250px';

		   // Render and initialize the picker. 
		   // Pass the ID of the DOM element that contains the picker, an array of initial
		   // PickerEntity objects to set the picker value, and a schema that defines
		   // picker properties.
		   SPClientPeoplePicker_InitStandaloneControlWrapper(options.elementId, null, schema);
		}
	};
	api.buttonHandlers = {
		sameElementClicked: function(element) {
			if ( privateAPI.elementClicked && privateAPI.elementClicked === element ) {
					return true;
			} else{
				privateAPI.elementClicked = element;
				return false;
			}
		}
	};

})(jQuery, doeaSPlib);