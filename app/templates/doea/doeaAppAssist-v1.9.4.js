/*
Application Assist functions
v 1.9.4
12/27/16
by JeD

requires
moment.js
numeral.js
server contacts.js
sp.js

*/

var doeaSPlib = doeaSPlib || {}; 

(function ($, api, SP) {

if (!api.waitForScriptsReady) {
	api.waitForScriptsReady = function(scriptName) {
		var def = $.Deferred();

		ExecuteOrDelayUntilScriptLoaded(function() {
			return def.resolve('Ready');
		}, scriptName);

		return def.promise();
	}; // end of wait for Script Ready
}

if (!api.buttonHandlers) {
	api.buttonHandlers = (function() {
		var elementClicked;
		return {
			sameElementClicked: function(element) {
				if ( elementClicked && elementClicked === element ) {
						return true;
				} else{
					elementClicked = element;
					return false;
				}
			}
		};
	})();
}

if (!api.peoplePicker) {
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
			var pp = SPClientPeoplePicker;
			if (pp.SPClientPeoplePickerDict[personFieldId]) {
				delete pp.SPClientPeoplePickerDict[personFieldId];
			}
			return pp.SPClientPeoplePickerDict;
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
			var pp = SPClientPeoplePicker,
				personObj = pp.BuildUnresolvedEntity(userProp1, userProp2),
				pickerField = pp.SPClientPeoplePickerDict[ personFieldId ],
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
}

api.termPicker = (function() {
	var taxFields = {};
	return {
		setField: function(fieldId, termLabel, termId) {
			var field = this.getField(fieldId);
			field.setRawText(termLabel +'|'+ termId);
			field.retrieveTerms();
			return true;
		},
		removeTerm: function(fieldId, allTerms, termLabel, termId) {
			//all terms is a bool 
			var field = this.getField(fieldId),
				termCorrected,
				termsInField,
				termsForField;

			if (allTerms) {
				field.setRawText('');
			} else {
				termCorrected = termLabel +'|'+ termId;
				termsInField = field.getRawText().split(';');
				termsForField = termsInField.filter(function(item) {
					return item !== termCorrected;
				});
				field.setRawText(
					termsForField.join(';')
				);
			}

			field.retrieveTerms();
			return true;
		},
		getField: function(id) {
			if (!taxFields[id]) {
				//id will have the word container in it
				taxFields[id] = new Microsoft.SharePoint.Taxonomy.ControlObject(
					document.getElementById(id)
				);
			}
			return taxFields[id];
		}
	};
})();
api.workflow = (function($) {
	/*
	  12/30/16
	  v1.2.1
		status codes
		6 - completed
		5 - terminated
		1 - started

		siteUrl are relative "/sites/JedDevSite/"
	*/
	var privateAPI = {
		sPoint: SP,
		notRunning13FlowNum: [5,6],
		loopFlows: function(items, cb) {
			var ii,
				count = items.get_count();

			for (ii = 0; ii < count; ii++) {
				if ( cb.call(items.getItemAtIndex(ii)) === false) {
					break;
				}
			}
		},
		getFlowManager: function() {
			this.context = this.props.url ? 
				new privateAPI.sPoint.ClientContext(this.props.url) : 
				new privateAPI.sPoint.ClientContext.get_current();

			this.serviceManager = privateAPI.sPoint
				.WorkflowServices
				.WorkflowServicesManager
				.newObject(this.context, this.context.get_web());
			return this;
		},
		getFlowService: function(service) {

			if (!this.context) {
				privateAPI.getFlowManager.call(this);
			}
			if (service === 'instance') {
				this.instanceService = this.serviceManager.getWorkflowInstanceService(); 
			}
			if (service === 'subscription') {
				this.subscriptionService = this.serviceManager.getWorkflowSubscriptionService(); 
			}
			if (service === 'interop') {
				this.interopService = this.serviceManager.getWorkflowInteropService(); 
			}
			return this;
		},
		subscriptBase: function(subsFromWhere, url, listId) {
			var def = $.Deferred();

			if (!this.subscriptionService) {
				privateAPI.getFlowService.call(this, 'subscription');
			}
			if (subsFromWhere === 'list') {
				this.subscription = this.subscriptionService.enumerateSubscriptionsByList(this.props.listId);
			}
			if (subsFromWhere === 'web') {
				this.subscription = this.subscriptionService.enumerateSubscriptions();
			}
			this.context.load(this.subscription);
			this.context.executeQueryAsync(
		        function() {
		        	//success
		            def.resolve(this);
		        },
		        function() {
		        	var args = arguments;
		            def.reject('error');
		        }
		    );
			return def.promise();
		},
		getSubscriptions: function(fromWhere) {
			//returns workflows subscriptions attached to list
			var self = this;
			return privateAPI.subscriptBase.call(
				self,
				fromWhere,
				self.props.url || null,
				self.props.listId || null
			).then(function() {
				var subName = self.props.name;

				privateAPI.loopFlows(self.subscription, function() {
					if (this.get_name() === subName) {
						self.subscription = this;
						return false;
					}
				});
				return self;
			});
		},
		getInstancesByItemId: function() {
			//returns instances of workflows on list item
			var self = this,
				def = $.Deferred(),
				instancesOnListItem;

			privateAPI.getFlowService.call(self, 'instance');
			instancesOnListItem = self.instanceService.enumerateInstancesForListItem(self.props.listId, self.props.itemId);
			self.context.load(instancesOnListItem);


			self.context.executeQueryAsync(
		        function() {
		            //success
		            self.instances = [];
		            privateAPI.loopFlows(instancesOnListItem, function() {
		            	self.instances.push(this);
		            });
		            def.resolve(self);
		        },
		        function() {
		        	var args = arguments;
		            def.reject('error');
		        }
		    );

			return def.promise();
		},
		getInstancesBySubscription: function(place) {
			//returns instances running workflows based on subscription
			var self = this,
				def = $.Deferred(),
				instancesOfSub;


			privateAPI.getFlowService.call(self, 'subscription');

			privateAPI.getSubscriptions.call(self, place)
			.then(function() {
				privateAPI.getFlowService.call(self, 'instance');
				instancesOfSub = self.instanceService.enumerate(self.subscription);
				self.context.load(instancesOfSub);

				self.context.executeQueryAsync(
			        function() {
			            //success
			            self.instances = [];
			            privateAPI.loopFlows(instancesOfSub, function() {
			            	self.instances.push(this);
			            });
			            def.resolve(self);
			        },
			        function() {
			        	var args = arguments;
			            def.reject('error');
			        }
			    );
			});
			return def.promise();
		},
		recurseStart13Flow: function() {
			var self = this,
				def = $.Deferred(),
				items = self.props.itemInfo,
				dataType = Object.prototype.toString.call(items),
				lastArrayItem,
				totalToBeStarted,
				index,
				currentCount = 0;

			if (dataType === '[object Object]') {
				items = [items];
			}

			privateAPI.getFlowService.call(self, 'instance');

			totalToBeStarted = items.length;
			lastArrayItem = totalToBeStarted - 1;

			for (index = self.props.totalStarted || 0; index < totalToBeStarted; index++) {
				self.instanceService.startWorkflowOnListItem(
					self.subscription,
					items[index].itemId,
					items[index].payload || {}
				);
				currentCount++;
				if (currentCount === 50 || index === lastArrayItem) {
					index++;
					self.props.totalStarted = index;
					break;
				}
			}

			self.context.executeQueryAsync(
		        function() {
		            //success
		            def.resolve(self);
		        },
		        function() {
		        	var args = arguments;
		            def.reject('error');
		        }
		    );

			return def.promise();
		},
		interopActionLoop: function(itemArray, cb) {
			var def = $.Deferred(),
				self = this,
				props = self.props,
				totalToBeLooped = itemArray.length,
				lastArrayItem = totalToBeLooped - 1,
				currentCount = 0,
				index;


			for (index = props.totalLooped || 0; index < totalToBeLooped; index++) {
				cb.call(self, itemArray[index]);
				currentCount++;
				if (currentCount === 40 || index === lastArrayItem) {
					index++;
					props.totalLooped = index;
					break;
				}
			}

			if (currentCount > 0) {
				self.context.executeQueryAsync(
					function() {
						def.resolve(self);
					},
					function() {
						//fail
						var args = arguments;
						def.reject('error');
					}
				);
			} else {
				def.resolve(self);
			}
			return def.promise();
		}
	};

	var flowProto = {
		stop13FlowOnListItem: function(listId, itemId, flowName, siteUrl) {
			//if you provide the workflow name it will only stop the workflow with the matching name
			//else it will stop all workflows on the list item
			var def = $.Deferred(),
				self = this,
				requests = [];

			self.props = {};
			self.props.listId = listId;
			self.props.itemId = itemId;
			self.props.url = siteUrl;
			
			if (flowName) {
				self.props.name = flowName;
				requests.push(privateAPI.getSubscriptions.call(self,'list'));
			}
			requests.push(privateAPI.getInstancesByItemId.call(self));

			$.when.apply(this, requests)
			.then(function() {
				var runningCount = 0,
					status,
					subId,
					instanceId,
					logicFunc;

				if (requests.length === 1) {
					logicFunc = function(item) {
						status = item.get_status();
						if (privateAPI.notRunning13FlowNum.indexOf(status) === -1) {
							self.instanceService.terminateWorkflow(item);
							runningCount++;
						}
					};
				} else {
					subId = self.subscription.get_id().toString();
					logicFunc = function(item) {
						status = item.get_status();
						instanceId = item.get_workflowSubscriptionId().toString();
						if (privateAPI.notRunning13FlowNum.indexOf(status) === -1 &&
							instanceId === subId) {
							self.instanceService.terminateWorkflow(item);
							runningCount++;
						}
					};
				}
				self.instances.forEach(logicFunc);

				self.props.wfStopped = runningCount;

				if (runningCount > 0) {
					self.context.executeQueryAsync(
				        function() {
				            //success
				            def.resolve(self);
				        },
				        function() {
				        	var args = arguments;
				            def.reject('error');
				        }
				    );
				} else {
					def.resolve(self);
				}
			});
			return def.promise();
		},
		stopSite13Flow: function(flowName, siteUrl) {
			//flowName is the name of the workflow
			//relative url of site where the flow lives
			if (!flowName) {
				throw new Error('Must provide site workflow name to stop.');
			}
			return this.stopAll13FlowByName(flowName, siteUrl);
		},
		stopAll13FlowByName: function(flowName, siteUrl) {
			//flowName is the name of the workflow
			//relative url of site where the flow lives
			var def = $.Deferred(),
				self = this,
				status;

			self.props = {
				name: flowName,
				url: siteUrl
			};

			privateAPI.getInstancesBySubscription.call(self, 'web')
			.then(function(self) {
				var runningCount = 0;

				if (self === 'error') {
					alert('Error retrieving workflows.');
				}

				self.instances.forEach(function(item) {
					status = item.get_status();
					if (privateAPI.notRunning13FlowNum.indexOf(status) === -1) {
						self.instanceService.terminateWorkflow(item);
						runningCount++;
					}
				});

				self.props.wfStopped = runningCount;

				if (runningCount > 0) {
					self.context.executeQueryAsync(
				        function() {
				            //success
				            def.resolve(self);
				        },
				        function() {
				        	var args = arguments;
				            def.reject('error');
				        }
				    );
				} else {
					def.resolve(self);
				}
			});
			return def.promise();
		},
		stop10FlowByInstanceId: function(instanceIds, siteUrl) {
			//instance id comes from the workflow
			//relative url of site where the flow lives
			var self = this;

			if (instanceIds) {
				//first run
				self.props = {
					url: siteUrl,
					instanceIds: instanceIds,
					totalStopped: 0
				};
			}

			privateAPI.getFlowService.call(self, 'interop');

			return privateAPI.interopActionLoop.call(self, self.props.instanceIds, function(instanceId) {
				this.interopService.cancelWorkflow(instanceId);
			}).then(function() {
				if (self.props.totalLooped < self.props.instanceIds.length) {
					//more to stop
					self.interopService = null;
					self.context = null;
					return self.stop10FlowByInstanceId.call(self);
				}
				return self;
			});
		},
		start13FlowOnListItem: function(props) {
			//the payload object is the initiation form paramenters
			// props {
			// 	name: , workflow name
			// 	url: relative site url, the site where the flow is
			//	listId: , guid of list
			// 	itemInfo: [{
			// 		itemId: 3,
			// 		payload: {}
			// 	},{
			// 		itemId: 4,
			// 		payload: {}
			// 	}]
			// }

			var self = this,
				sub,
				getSubFrom;

			if (props && !props.name) {
				throw new Error('Workflow name must be provided.');
			}
			
			if (!self.props) {
				self.props = props;
				getSubFrom = props.listId ? 'list' : 'web';

				sub = privateAPI.getSubscriptions.call(self, getSubFrom);
			} else {
				sub = $.Deferred().resolve();
			}

			return sub
			.then(function() {
				return privateAPI.recurseStart13Flow.call(self);
			}).then(function() {
				if (self.props.totalStarted < self.props.itemInfo.length) {
					//more to start
					self.instanceService = null;
					self.context = null;
					return self.start13FlowOnListItem.call(self);
				}
				return self;
			});
		},
		startSite13Flow: function(name, siteUrl, payload) {
			// name is workflow name
			// siteUrl is relative url of site your in
			// payload is object with data to pass to the flow
			// {
			// 	property: value
			// }
			var self = this,
				def = $.Deferred();

			if (!name) {
				throw new Error('Workflow name must be provided.');
			}
			
			self.props = {
				name: name,
				url: siteUrl,
				payload: payload
			};

			privateAPI.getSubscriptions.call(self, 'web')
			.then(function() {
				privateAPI.getFlowService.call(self, 'instance');

				self.instanceService.startWorkflow(
					self.subscription,
					self.props.payload || {}
				);

				self.context.executeQueryAsync(
			        function() {
			            //success
			            def.resolve(self);
			        },
			        function() {
			        	var args = arguments;
			            def.reject('None Started');
			        }
			    );
			});

			return def.promise();
		},
		startSite10Flow: function(name, siteUrl, payload) {
			// name is workflow name
			// siteUrl is relative url of site your in
			// payload is object with data to pass to the flow
			// {
			// 	property: value
			// }

			var self = this,
				def = $.Deferred();

			if (!name) {
				throw new Error('Must have workflow name and list ID to start a 2010 workflow');
			}

			if (!self.props) {
				self.props = {
					url: siteUrl,
					name: name,
					payload: payload || {}
				};
			}

			privateAPI.getFlowService.call(self, 'interop');

			self.interopService.startWorkflow(
				self.props.name,
				null,
				null,
				null,
				self.props.payload
			);

			self.context.executeQueryAsync(
		        function() {
		            //success
		            def.resolve(self);
		        },
		        function() {
		        	var args = arguments;
		            def.reject(self);
		        }
		    );

			return def.promise();
		},
		start10FlowOnListItem: function(props) {
			//the payload object is the initiation form paramenters
			// props {
			// 	name: , workflow name
			// 	url: ,
			//	listId: ,
			// 	itemInfo: [{
			// 		itemId: cc9c0770-0662-4029-a570-e4e2d8eb4dba, the guid of the list item NOT the id
			// 		payload: {}
			// 	},{
			// 		itemId: "cc9c0770-0662-4029-a570-e4e2d8eb4dbe",
			// 		payload: {}
			// 	}]
			// }

			var self = this;

			if (props && (!props.name || !props.listId)) {
				throw new Error('Must have workflow name and list ID to start a 2010 workflow');
			}

			if (!self.props) {
				self.props = props;
			}

			privateAPI.getFlowService.call(self, 'interop');

			return privateAPI.interopActionLoop.call(self, self.props.itemInfo, function(itemData) {
				var props = this.props;
				this.interopService.startWorkflow(
					props.name,
					null,
					props.listId,
					itemData.itemId,
					itemData.payload || {}

				);
			}).then(function() {
				if (self.props.totalLooped < self.props.itemInfo.length) {
					//more to stop
					self.interopService = null;
					self.context = null;
					return self.start10FlowOnListItem.call(self);
				}
				return self;
			});
		}
	};
	return {
		start: function() {
			return Object.create(flowProto);
		}
	};
})($);
api.tableRowLoop = function(table, cb) {
	var rows = table.children('tbody').children('tr'),
		totalRows = rows.length,
		$row,
		ii;

	for (ii=0; ii < totalRows; ii++) {
		$row = $(rows[ii]);

		if (cb.call(this, $row, ii) === false) {
			break;
		}
	}
};
api.prepBatchInfo =  function(priObj, ary, cb) {

	/*
		priObj keeps track of the state
		ary is the array of items to iterate over
		cb must returns items for server or next function
		
		example of a function that uses this
		
		getBatchListData: function(prevState) {
			//retrieves from this.batchUrls,
			//gets context and queries to this.batchFetchUrl
			
			var self = this,
				totalToGet = this.batchUrls.length,
				batchTracker = prevState || {};


			api.prepBatchInfo(batchTracker, self.batchUrls, function(url) {
				return url;
			});

			return api.server.ajaxGetContext(self.batchFetchUrl)
			.then(function(response) {

				return api.server.ajaxGetBatch(batchTracker.batchItems, {
					context: response.FormDigestValue,
					url: self.batchFetchUrl
				});
			}).then(function(response) {
				self.serverData = self.serverData.concat(response);
				if (batchTracker.startIndex === totalToGet) {
					self.batchUrls = null;
					self.batchFetchUrl = null;
					return self;
				}
				return self.getBatchListData(batchTracker);
			});
		}
		---or----
		getActiveRecords: function(prevState) {

			//retrieves from this.batchUrls,
			//gets context and queries to this.batchFetchUrl
			
			var self = this,
				guids = api.property.listGuid,
				totalToGet = this.selectedProperty.length,
				batchTracker = prevState || {};

			this.batchFetchUrl = this.sysUrls.propertySite;

			api.prepBatchInfo(batchTracker, this.selectedProperty, function(item) {
				return self.string.format(self.sysUrls.activeRecords, guids.transferList, item.Id);
			});

			return api.server.ajaxGetContext(self.batchFetchUrl)
			.then(function(response) {

				return api.server.ajaxGetBatch(batchTracker.batchItems, {
					context: response.FormDigestValue,
					url: self.batchFetchUrl
				});
			}).then(function(response) {
				self.serverData = self.serverData.concat(response);
				if (batchTracker.startIndex === totalToGet) {
					return self;
				}
				return self.getActiveRecords(batchTracker);
			});
		},
		----or-----
		updateMasterRecords: function(prevState) {
			
			var self = this,
				totalToGet = this.getSelectedProperty.length,
				batchTracker = prevState || {},
				toServerData,
				sc = api.jsomCUD;


			api.prepBatchInfo(batchTracker, self.getSelectedProperty, function(dataItem) {
				var prepData = {
					property_status: new sc.ValuePrep(sc.columnType.choice, self.status),
					dispositionDate: new sc.ValuePrep(sc.columnType.date, self.date.toISOString())
				};
				if(self.folderId) {
					prepData.eolFolderId = new sc.ValuePrep(sc.columnType.num, self.folderId);
				}

				return new sc.PrepClientData ("update", prepData, dataItem.Id);
			});

			toServerData = sc.prepServerData(
				api.property.listGuid.masterInventory,
				appObj.urls.propertySite,
				batchTracker.batchItems
			);

			return api.server.jsomSendDataToServer(toServerData)
			.then(function() {
				if (batchTracker.startIndex === totalToGet) {
					return self;
				}
				return self.updateMasterRecords(batchTracker);
			});
		},
	*/

	var self = priObj || {},
		index = self.startIndex || 0,
		totalPerTrip = self.totalPerTrip || 100,
		totalToGet = ary.length,
		returnFromcb;

	self.batchItems = [];

	for (index; index < totalToGet; index++) {

		returnFromcb = cb.call(self, ary[index]);

		if (returnFromcb) {
			self.batchItems.push(returnFromcb);
		}

		if (self.batchItems.length === totalPerTrip) {
			//tick counter and get out
			index++;
			break;
		}
	}
	self.startIndex = index;

	return self;
};
api.jsomCUD = (function() {
	// v 1.1
	// it based off jsom
	//by Jed
	//08/16/16
	var privateAPI = {
		sPoint: SP,
		setItemValues: function(context, list, item, columnInfoObj) {
			var toServerValue,
				toServerType,
				columnName,
				columnValue,
				taxColObj,
				taxField;

			for (columnName in columnInfoObj) {
				if (columnInfoObj.hasOwnProperty(columnName)) {
					//default 
					toServerValue = columnInfoObj[columnName].value;
					toServerType = api.getDataType(toServerValue);

					if (toServerType === '[object Object]' && toServerValue !== undefined) {
						//for comparison and constructing toServer
						columnValue = columnInfoObj[columnName].value;

						if (columnValue.termGuid || columnValue.termGuid === null) {
							//single metadata, {termLabel: , termGuid:}
							var taxonomySingle;

							taxColObj = list.get_fields().getByInternalNameOrTitle(columnName);
							taxField = context.castTo(taxColObj, privateAPI.sPoint.Taxonomy.TaxonomyField);
							
							if (columnValue.termGuid === null) {
								//there is no value
								taxonomySingle = null;
								taxField.validateSetValue(item, taxonomySingle);
							} else {
								//there is a value
								taxonomySingle = new privateAPI.sPoint.Taxonomy.TaxonomyFieldValue();
								taxonomySingle.set_label(columnValue.termLabel);
								taxonomySingle.set_termGuid(columnValue.termGuid);
								taxonomySingle.set_wssId(-1);
								taxField.setFieldValueByValue(item, taxonomySingle);
							}
							continue;
						}
						else if (columnValue.multiTerms) {
							//multi metadata, {multiTerms: [{label: '', guid: ''}, {label: '', guid: ''}]}
							taxColObj = list.get_fields().getByInternalNameOrTitle(columnName);
							taxField = context.castTo(taxColObj, privateAPI.sPoint.Taxonomy.TaxonomyField);

							var termPrep = columnValue.multiTerms.map(privateAPI.multiTerms);

							var terms = new privateAPI.sPoint.Taxonomy.TaxonomyFieldValueCollection(termPrep.join(';#'),taxField);

							taxField.setFieldValueByValueCollection(item, terms);
							continue;
						}
						else if (columnValue.choices) {
							//multi choice, {choices: [1,2,3]}
							toServerValue = columnValue.choices;
						}
						else if (columnValue.itemId) {
							//single lookup, {itemId: number}
							toServerValue = new privateAPI.sPoint.FieldLookupValue();
							toServerValue.set_lookupId(columnValue.itemId);
						}
						else if (columnValue.idArray) {
							//multi lookup, {idArray: [1,2,3,4]}
							toServerValue = columnValue.idArray.map(privateAPI.multiLookup);
						}
						else if (columnValue.acct) {
							//person field single, {acct: }  acct can be email or account name
							toServerValue = privateAPI.sPoint.FieldUserValue.fromUser(columnValue.acct);
						}
						else if (columnValue.acctArray) {
							//multi person field, {acctArray: [acct, acct,acct]}  acct can be email or account name
							toServerValue = columnValue.acctArray.map(privateAPI.multiPerson);
						}
						else if (columnValue.url) {
							//picture of hyperlink, {url: , description: }
							toServerValue = new privateAPI.sPoint.FieldUrlValue();
							toServerValue.set_url(columnValue.url);
							toServerValue.set_description(columnValue.description);
						}
					}
					item.set_item(columnName, toServerValue);
				}
			}
		},
		multiLookup: function(item) {
			var lookupValue = new privateAPI.sPoint.FieldLookupValue();
			return lookupValue.set_lookupId(item);
		},
		multiTerms: function(termInfo) {
			//-1;#Mamo|10d05b55-6ae5-413b-9fe6-ff11b9b5767c
			return "-1;#" + termInfo.label + "|" +termInfo.guid;  
		},
		multiPerson: function(item) {

			return privateAPI.sPoint.FieldUserValue.fromUser(item);
		},
		itemLoad: function(context, item, serverArray, currentIndex) {
			item.update();
			serverArray[currentIndex] = item;
			context.load(serverArray[currentIndex]);
		},
		callByType: function(list, data, action) {
			var dataType = api.getDataType(data),
				currentId,
				total,
				ii;

			if (dataType === '[object Array]') {
				total = data.length;
				for (ii = 0; ii < total; ii++) {
					currentId = data[ii];
					if (action === 'delete') {
						privateAPI.deleteItems(list, currentId);
					}
					if (action === 'recycle') {
						privateAPI.recycleItems(list, currentId);
					}
				}
			}
			if (dataType === '[object Number]' && action === 'delete') {
				privateAPI.deleteItems(list, data);
			}
			if (dataType === '[object Number]' && action === 'recycle') {
				privateAPI.recycleItems(list, data);
			}
		},
		deleteItems: function(list, itemId) {
			var listItem = list.getItemById(itemId);  
			listItem.deleteObject();
		},
		recycleItems: function(list, itemId) {
			var listItem = list.getItemById(itemId);  
			listItem.recycle();
		},
	};
	return {
		columnType: {
			slt: 'Single line of text',
			mlt: 'Multiple lines of text',
			num: 'Number',
			currency: 'Currency',
			date: 'Date and Time',
			choice: 'Choice',
			metadata: 'Managed Metadata',
			person: 'Person or Group',
			contentType: 'Content Type',
			yesNo: 'Yes/No',
			lookup: 'Lookup'
		},
		//this sets the value of the column
		ValuePrep: function(type, value) {
			//this function ensures values in fields are what the SP server expects
			//validation happens before you get here
			// Single line of text
			// Multiple lines of text
			// Number
			// Currency
			// Date and Time
			// Choice
			// Managed Metadata
			// Person or Group
			// Content Type
			// Yes/No
			// Lookup
			var valueConst = api.jsomCUD.ValuePrep;
			if (!(this instanceof valueConst)) {
				return new valueConst(type, value);
			}
			this.type = type;
			this.value = value;
		},
		PrepClientData: function(action, info, itemId) {
			//action is create, delete or recycle, update
			// info is object {
			// 	columnName: instance of valueprep
			// }
			var clientConst = api.jsomCUD.PrepClientData;

			if (!(this instanceof clientConst)) {
				return new clientConst(action, info, itemId);
			}

			this.action = action;
			if (info) {
				this.columnInfo = info;
			}
			if (itemId) {
				this.itemId = itemId;
			}
		},
		prepServerData: function(listGUID, siteURL, serverRequest) {
			/*
				serverRequest should be an array of objects
				{
					action: 'update',
					itemId: 3,
					columnInfo: {
						columnName: Valueprep instance,
						columnName: object
					}
				}
			*/
			var requestType = api.getDataType(serverRequest),
				toServer,
				totalItemsForServer,
				ii,
				currentObj,
				listItem,
				itemInfo,
				list,
				action;
			
			if (requestType === '[object Array]') {
				toServer = {};
				toServer.itemArray = [];
				totalItemsForServer = serverRequest.length;

				if (siteURL) {
					toServer.context = new privateAPI.sPoint.ClientContext(siteURL);
				} else {
					toServer.context = new privateAPI.sPoint.ClientContext.get_current();
				}

				if (privateAPI.sPoint.Guid.isValid(listGUID)) {
					list = toServer.context.get_web().get_lists().getById(listGUID);
				} else {
					list = toServer.context.get_web().get_lists().getByTitle(listGUID);
				}

				// create update
				for (ii = 0; ii < totalItemsForServer; ii++) {
					currentObj = serverRequest[ii];

					action = currentObj.action;
					if (!action) {
						// if no action throw error
						api.issue("Server Request with no action!");
					}

					action = action.toLowerCase();

					if (action === 'delete' || action === 'recycle') {
						// delete Items
						// {
						//     action: 'delete' or 'recycle',
						//     itemId: [1,2,3,4] or 3
						// }

						if (!currentObj.itemId) {
							api.issue("You can not delete/remove items without an ID!");
						}
						privateAPI.callByType(list, currentObj.itemId, action);
						continue;
					}
					if (action === 'create') {
						//exp serverRequest 
						// [
						//     {
						//         action: 'create',
						//         columnInfo: {
						//             column1: 'a slt field',
						//             column2: {termLabel: 'florida', termguid: '123-122-3244-234235-3423'}
						//         }
						//     }
						// ]
						listItem = list.addItem(new privateAPI.sPoint.ListItemCreationInformation());
						itemInfo = currentObj.columnInfo;
					}
					if (action === 'update') {
						//for updat exp serverRequest should be an array of objs [{itemid: number, columnInfo: {},{itemid: number, columnInfo: {}] 
						// [
						//     {
						//         itemId: 2,
						//         action: 'update'
						//         columnInfo: {
						//             column1: 'a slt field',
						//             column2: {termLabel: 'florida', termguid: '123-122-3244-234235-3423'}
						//     }
						// ]

						if (!currentObj.itemId) {
							api.issue('You can not update a list item without an ID!');
						}

						listItem = list.getItemById(currentObj.itemId);
						itemInfo = currentObj.columnInfo;
					}
					privateAPI.setItemValues(toServer.context, list, listItem, itemInfo);
					privateAPI.itemLoad(toServer.context, listItem, toServer.itemArray, ii);
				}
			} else if (requestType === '[object Object]') {
				//if an object is passed  recurse with serverRequest correted
				return api.jsomCUD.prepServerData(listGUID, siteURL, [serverRequest]);
			} else {
				//error
				api.issue("Incorrect serverRequest data type.");
			}

			return toServer;    
		}
	};
})();
api.setFormSource = function(url) {
	var formattedUrl = encodeURIComponent(url),
		urlProps = api.URLparameters(location.search),
		newFormSource;

	urlProps.Source = formattedUrl;
	newFormSource = location.pathname + "?ID=" +urlProps.ID+ "&Source=" +urlProps.Source;

	$('#aspnetForm').attr('action',newFormSource);
};
api.errorHandler = (function() {
	var errorContainer = [],
		sPoint = SP;
	return {
		getErrors: function() {
			return errorContainer.slice(0);
		},
		addErrors: function(message) {
			errorContainer.push(message);
		},
		getCount: function() {
			return errorContainer.length;
		},
		clearErrors: function() {
			errorContainer = [];
		},
		throwErrorDialog: function(title, text, cb) {
			var allErrors = text || this.getErrors().join('<br/>');

			if (allErrors === '') {
				allErrors = 'noErrors';
			}
			if (allErrors !== 'noErrors') {
				sPoint.UI.ModalDialog.showErrorDialog(title,allErrors,cb);
			} 
			return allErrors;
		}
	};
})();
api.progressBar = function(action, val) {
	//save the function that needs to be called on complete to api.progressBar.finishCB
	
	var pBar,
		pLabel,
		messageBox,
		rawElement,
		$element,
		value,
		initialized;

	if (action === 'launch') {
		rawElement = '<div> '+
						'<div id="progressbar">'+
							'<div class="progress-label">Saving...</div>'+
						'</div>'+
						'<div id="pBarMessages"></div>'+ 
						'<!--<div class="buttons"><input class="progressComplete" type="button" value="Okay"></div>-->'+
					'</div>';
		$element = $(rawElement);
		pBar = $element.find('#progressbar');
		pLabel = $element.find('.progress-label');

		var options = {
			title: val || "Save Progress",
			html: $element[0],
			showClose: false
		};

		pBar.progressbar({
		  value: false,
		  change: function() {
			pLabel.text( pBar.progressbar( "value" ) + "%" );
		  },
		  complete: function() {
			pLabel.text( "Complete!" );

			api.progressBar.finishCB();
		  }
		});

		api.progressBar.referance = SP.UI.ModalDialog.showModalDialog(options);
	}
	if (action === 'updateValue') {
		pBar = $('#progressbar');
		initialized = pBar.length;

		if (initialized) {
			value = val === 100 ? 100 : (pBar.progressbar('value') || 0) + val;
			pBar.progressbar('value', value);
		} else {
			return;
		}
	}
	if (action === 'updateText') {
		messageBox = $('#pBarMessages');
		messageBox
		.children()
		.remove()
		.end()
		.html(val);
	}
	if (action === 'close') {
		pBar = $('#progressbar');

		if (pBar.length > 0) {
			pBar.progressbar('destroy');
			api.progressBar.referance.close();
			api.progressBar.referance = null;		
		}


	}
};
api.datePicker = (function($) {
	/*
		DatePicker
		v1.1.1
		by Jed
		this requires moment.js to function
	*/
	var m,
		dateRegExps;
	var fieldStateToogle = function(action, field) {
		var dateField = getFieldElement(field),
			fieldDisabled = dateField.datepicker('isDisabled');
		if (action === 'enable' && fieldDisabled) {
			// if field is disabled and action is enable
			dateField.datepicker("option", "disabled", false);	
		}
		if (action === 'disable' && !fieldDisabled) {
			// if field is enabled and action is disable
			dateField.datepicker("option", "disabled", true);
		}
	};
	var getFieldElement = function(field) {
		var element,
			dataType = api.getDataType(field),
			isString = dataType === '[object String]',
			isObject = dataType === '[object Object]',
			is$ = field instanceof $;

		if (isString) {
			element = $(field);
		} else if (isObject && is$) {
			element = field;
		}

		return element || false;
	};
	var stringDateFormatter = function(dateString) {
		var formatedDate;

		if (!dateRegExps) {
			dateRegExps = {
				iso: /^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(\.\d+)?(([+-]\d\d:\d\d)|Z)/i,
				regular: /^(0[1-9]|1[0-2])[.\-\/](0[1-9]|[12][0-9]|3[01])[.\-\/](\d{4})/
			};
		}

		if (dateRegExps.regular.test(dateString)) {
			formatedDate = dateString;
		} else if (dateRegExps.iso.test(dateString)) {
			formatedDate = m(dateString).format('MM/DD/YYYY');
		}
		return formatedDate || false;
	};
	try {
		m = moment;
	}
	catch (e) {
		m = null;
	}
	return {
		init: function(field, options) {
			var element = getFieldElement(field),
				initOptions = $.extend({
					changeMonth: true,
					changeYear: true,
					showAnim: "fade"
				}, options);

			element.datepicker(initOptions);
		},
		disableField: function(fieldId) {
			fieldStateToogle('disable', fieldId);
		},
		enableField: function(fieldId) {
			fieldStateToogle('enable', fieldId);
		},
		destroy: function(field) {
			var element = getFieldElement(field);
			element.datepicker("destroy");
		},
		clearDate: function(field) {
			var element = getFieldElement(field);
			element.val("");
		},
		setDateInField: function(field, value) {
			var element = getFieldElement(field),
				dataType = api.getDataType(value),
				isDate = dataType === '[object Date]',
				isString = dataType === '[object String]',
				stringDate;

			if (isDate) {
				stringDate = m(value).format('MM/DD/YYYY');
			} else if (m.isMoment(value)) {
				stringDate = value.format('MM/DD/YYYY');
			} else if (isString) {
				stringDate = stringDateFormatter(value);

				if (!stringDate) {
					api.issue('incorrent string passed to the setDateInField');	
				}

			} else {
				api.issue('incorrent node type sent the setDateInField');
			}

			element.datepicker('setDate', stringDate);
		},
		getTextDate: function(field) {
			var element = getFieldElement(field),
				dateText = element.val();
			
			if (!dateText) {
				return null;
			}
			return dateText;
		}
	};
})($);
api.doeaEmpPicker = (function($) {
	/*
		requires jquery ui autocomplete library
		data is stored in a span with the id doeaEmpPicker
		it stores a serized array of objs the users [{user},{user}]
		user is {
			acctName: i:0#.f|membership|user@domain.onmicrosoft.com,
			workEmail: user@domain.onmicrosoft.com,
			siteId: 11, must be a number
			displayName: Joe User
		}
	*/
	var fieldStateToogle = function(action, field) {
		var acField = getFieldElement(field),
			fieldDisabled = acField.autocomplete('option', 'disabled');

		if (action === 'enable' && fieldDisabled) {
			// if field is disabled and action is enable
			acField
			.prop('disabled', false)
			.autocomplete("enable");	
		}
		if (action === 'disable' && !fieldDisabled) {
			// if field is enabled and action is disable
			acField
			.prop('disabled', true)
			.autocomplete("disable");
		}
	};
	var getFieldElement = function(field) {
		var element,
			dataType = api.getDataType(field),
			isString = dataType === '[object String]',
			isObject = dataType === '[object Object]',
			is$ = field instanceof $;

		if (isString) {
			element = $(field);
		} else if (isObject && is$) {
			element = api.elementTagName(field);
			element = element === 'input' ? field : field.find('input');
		}

		return element || false;
	};
	var removeUserHelper = function(index, userArray, input, span) {
		var displayName = [],
			spanText;

		if (index === 'all') {
			spanText = '';
		} else {
			userArray.splice(index, 1);
			userArray.forEach(function(item) {
				displayName.push(item.PreferredName);
			});

			spanText = userArray.length === 0 ? '' : JSON.stringify(userArray);
		}

		input.val(displayName.join('; '));
		span.text(spanText);
	};
	var acFactory = (function() {
		var acProto = {
			ensureUser: function() {
				//ensure user
				var self = this;
				return api.server.jsomEnsureUser(self.users)
				.then(function() {
					return self;
				});
			},
			addUserToField: function() {
				var displayNames = [],
					userDataStorage = this.users,
					$input = this.field,
					storageSpan = $input.siblings('span.pickerInfo'),
					usersInSpan;

				this.users.forEach(function(item) {
					displayNames.push(item.PreferredName);
				});

				//put names on dom, already set for multi user
				$input.val(displayNames.join('; '));

				usersInSpan = JSON.stringify(userDataStorage);

				//for multi user field, coming later
				//usersInSpan = storageSpan.text();
				// if (usersInSpan) {
				// 	//there are already some people in the field
				// 	usersInSpan = JSON.parse(usersInSpan);
				// 	usersInSpan = usersInSpan.concat(userDataStorage);
				// 	usersInSpan = JSON.stringify(usersInSpan);
				// } else {
				// 	usersInSpan = JSON.stringify(userDataStorage);
				// }

				//handles updating the stored user data
				storageSpan.text(usersInSpan);
			},
			checkMinDataPresent: function() {
				var users = this.users,
					passOrFail = true;

				users.forEach(function(item) {
					if (!item.AccountName &&
						!item.WorkEmail) 
					{
						passOrFail = false;
					}
				});

				this.userValidated = passOrFail;
				return this;
			}
		};
		return function(users, field) {
			var obj = Object.create(acProto),
				dataType = Object.prototype.toString.call(users);

			if (dataType === '[object Object]') {
				obj.users = [users];
			} else if (dataType === '[object Array]') {
				obj.users = users;
			} else {
				throw new Error('Incorrect data type passed to auto complete constructor');
			}

			obj.checkMinDataPresent();

			if (!obj.userValidated) {
				throw new Error('Incomplete data passed for users array');
			}

			obj.field = field;
			return obj;
		};
	})();

	return {
		init: function(props) {
			//props contains
			//required - element is text that is the id of the element ex 'autoComplete' or jquery Object
			//expansion points
			//customEmployeeFilter is a function that receives an array and must return an array of user to display
			//fieldRender a function to control the layout of the names in the drop down menu
			//totalUsers is the number of staff that will be shown at one time
			//onCreate function that will be fired right after the auto complete controls is created, it gets the field as parameter
			//fieldBlur a function is fired when a user leaves the auto complete field, passed input and array of users
			//userSelect a function is fired when a user selectes an employee for the field, passed input and array of users

			var findEmployees = function(request, choices) {
				var nameText = request.term;

				getUserData(nameText)
				.done(function(names) {
					var usersToDisplay,
						totalPeeps = findEmployees.total;

					if (names.length > totalPeeps) {
						usersToDisplay = names.reduce(function(users, item, index) {
							if (index < totalPeeps) {
								users.push(item);
							}
							return users;
						}, []);
					} else {
						usersToDisplay = names;
					}

					if (defaults.customEmployeeFilter) {
						usersToDisplay = defaults.customEmployeeFilter(usersToDisplay);
					}
					choices(usersToDisplay);
				});
			};
			var getUserData = function(nameText) {
				return api.server.ajaxPeopleSearch('PreferredName:'+nameText+'* OR WorkEmail:'+nameText+'*')
				.then(function(names) {
					var totalNames = names.length,
						selections;

					if (totalNames === 0) {
						selections = [];
						selections.push('No employees found');

					} else {
						selections = api.spSearchResultsCleaner(names, api.server.profileProperties);
					}
					return selections;
				});
			};
		    var onControlCreate = function(event, ui) {
		    	//this puts a span on the page, it is for storing the needed data to save the user
		    	var element = $(event.target),
			    	storageSpan = $('<span/>', {
		    			'class': 'pickerInfo'
		    		});

		    	storageSpan.insertAfter(element);

		    	if (defaults.onCreate) {
		    		defaults.onCreate(element);
		    	}
			};
	    	var userSelect = function( event, data ) {
	    		//ensure user and is user selects no employee found then blank out the field,
	    		//also must check for other user in field
	    		//id to hook into this event is 'acUserSelect'
	    		var $input = $(event.target);

	    		event.preventDefault();

	    		if (data.item && data.item.label === "No employees found") {
	    			// user clicked on no employees found
	    			$input.val('');
	    			return;
	    		}
	    		acFactory(data.item, $input)
	    		.ensureUser()
	    		.then(function(acObj) {
	    			acObj.addUserToField();

	    			if (defaults.userSelect) {
	    				defaults.userSelect($input, acObj.users);
	    			}
	    		});				    
	    	};
	    	var noUserCommonAction = function(input, span, cb) {

	    		input.val('');
	    		span.text('');

	    		if (cb) {
	    			cb(input, []);
	    		}
	    	};
	    	var addUserIfOneFound = function(nameText, input, span, cb) {
	    		//adds user if only one match is found, else blanks the field
	    		//id to hook into this event is 'acControlChange'
	    		getUserData(nameText)
	    		.done(function(names) {
	    			var userObj;

	    			if (names[0] === 'No employees found' || names.length > 1) {
	    				//no one found, or found to many users, get out
	    				noUserCommonAction(input, span, cb);
	    				return;
	    			}
	    			//only one user found put them in
	    			userObj = acFactory(names, input);

	    			userObj
	    			.ensureUser()
	    			.then(function(acObj) {
	    				acObj.addUserToField();
	    				
	    				if (cb) {
	    					cb(input, acObj.users);
	    				}
	    			});

	    		});
	    	};
	    	var fieldBlur = function(event, ui) {
	    		//if leave field and values match then good
	    		//if leave and field and vales dont match try to find the user if no user or multiple remove
	    		var $input = $(event.target),
	    			namesPresent = $input.val(),
	    			userDataField = $input.siblings('span.pickerInfo');

	    		event.preventDefault();

	    		if (!namesPresent) {
	    			// name field is blank, blank out everyting
	    			noUserCommonAction($input, userDataField, defaults.fieldBlur);
	    			return;
	    		}

	    		if (namesPresent) {
	    			//name in field, check for user
	    			addUserIfOneFound(namesPresent, $input, userDataField, defaults.fieldBlur);
	    			return;
	    		}
	    	};
			var defaults = $.extend({
				fieldRender: function(ul, item) {
					var divEle = $('<div/>'),
						department,
						job,
						nameSpan,
						bureauSpan,
						jobTitleSpan;

					if (item.label === 'No employees found') {
						divEle
						.html(item.label);
					} else {
						department = item.Bureau || 'None';
						job = item.JobTitle || "None";
						nameSpan = '<span class="pickerName">'+item.PreferredName+'</span>';
						bureauSpan = '<span class="pickerBureau">Bureau: '+department+'</span>';
						jobTitleSpan = '<span class="pickerJob">Job Title: '+job+'</span>';
						divEle
						.html(nameSpan + bureauSpan + jobTitleSpan);
					}
					
					return $( "<li/>" )
						.append(divEle)
						.appendTo(ul);
			    },
			}, props);

			//the total number of user to display at one time
			findEmployees.total = defaults.totalUsers || 25;

			//field selection
			if (Object.prototype.toString.call(defaults.element) === '[object String]') {
				defaults.element = $(defaults.element);
			}

			defaults.element.attr('placeholder', defaults.placeholder || 'Type Name or Email');
			
			defaults.element.autocomplete({
				source: findEmployees,
				delay: 350,
				minLength: 3,
				change: fieldBlur,
				select: userSelect,
			  	create: onControlCreate
			}).autocomplete( "instance" )._renderItem = defaults.fieldRender;

			//this will be need when I add multiple users
			// if (allowMultipleUsers) {
			// 	// tells the picker to keep adding users without deleting
			// 	$(acElement).addClass('multipleUsers');
			// }
		},
		addUser: function(field, userData) {
			//the field must be initialied first, then call this function
			//userData can be a obj or an array of objs
			//the objs must contain userData.AccountName or userData.WorkEmail;
			var element = getFieldElement(field);

			//handles the display of the name(s)
			acFactory(userData, element)
			.ensureUser()
			.then(function(acObj) {
				acObj.addUserToField();
			});	
		},
		removeUser: function(field, userData) {
			//remove users displayName to input and put user data in the span
			//userData must be email or user id (for site like 9) or pass all and all users will be removed
			var $input = getFieldElement(field),
				userStorageSpan = $input.siblings('span.pickerInfo'),
				storedUserData,
				userIndexNumber,
				dataType,
				temp;

			dataType = api.getDataType(userData);

			if (dataType !== '[object Number]' &&
				dataType !== '[object String]' &&
				dataType !== '[object Object]')
			{
				throw new Error('Incorrect data type provided to remove user');
			}

			storedUserData = userStorageSpan.text();

			if (!storedUserData) {
				//nothing stored get out
				return;
			}

			storedUserData = JSON.parse(storedUserData);

			if (dataType === '[object Number]') {
				//passed in user id number
				storedUserData.some(function(item, index) {
					if (item.id === userData)
					{
						userIndexNumber = index;
						return true;
					}
					return false;
				});
			} 

			if (dataType !== '[object Number]')	{

				if (userData === 'all') {
					userIndexNumber = 'all';
				} else {
					temp = dataType === '[object Object]' ? userData.WorkEmail.toLowerCase() : userData.toLowerCase();	
					
					storedUserData.some(function(item, index) {
						if (item.WorkEmail.toLowerCase() === temp) {
							userIndexNumber = index;
							return true;
						}
						return false;
					});
				}

			}

			if (userIndexNumber !== undefined) {
				//user was found, remove from the array
				removeUserHelper(userIndexNumber, storedUserData, $input, userStorageSpan);
			}				
		},
		getUserInField: function(field) {
			var element = getFieldElement(field),
				userData;

			userData = element.siblings('span.pickerInfo').text();

			return userData ? JSON.parse(userData) : [];
		},
		disableField: function(field) {

			fieldStateToogle('disable', field);
		},
		enableField: function(field) {
			
			fieldStateToogle('enable', field);
		},
		resetField: function(field) {
			var element = getFieldElement(field);
			element.val('');
			element.siblings('span.pickerInfo').text('');
		},
		removeService : function(field) {
			var element = getFieldElement(field);
			element.autocomplete("destroy");
		}
	};
})($);
doeaSPlib.forms = (function ($, api, sPoint) {

	var serverBlankValue = null,
		m;

	var formObjFactory = (function(api) {
		var formProto = {
			getMetaData: function(dataObj) {

				return api.server.jsomTaxonomyRequest(dataObj.termSetId)
				.then(function(response) {
					var choices = [],
						terms = response.terms,
						totalTerms = terms.get_count(),
						current,
						ii;



					for(ii = 0; ii < totalTerms; ii++) {
						current = terms.getItemAtIndex(ii);
						if (current.get_isAvailableForTagging()) {
							// is a valid tag
							choices.push({
								text: current.get_name(),
								value: current.get_id().toString()
							});
						}
					}

					if (choices.length > 0) {
						dataObj.choices = choices;
						dataObj.createOptions();
						dataObj.element.append(dataObj.choices);
					}

				});
			},
			extractStingId: function(propName, obj) {

				this[propName] = obj.get_id().toString();
			},
			getLookupData: function(dataObj) {
				var url;

				url = this.url ? 
				'https://fldoea.sharepoint.com' + this.url :
				_spPageContextInfo.webAbsoluteUrl; 

				return api.server.ajaxGetData(
					url + "/_api/web/lists(guid'"+ dataObj.listId +"')/items?" +
					"$select=Id," + dataObj.columnToShow
				).then(function(response) {
					var options = response.value;

					options = options.map(function(item) {
						return {
							text: item.Title,
							value: item.ID
						};
					});

					if (options.length > 0) {
						dataObj.choices = options;
						dataObj.createOptions();
						dataObj.element.append(dataObj.choices);
					}
					
				});
			},
			getFeildOptions: function(dataObj) {
				if (dataObj.type === api.jsomCUD.columnType.lookup) {
					this.promiseCache.push(
						this.getLookupData(dataObj)
					);
					return;
				}
				// metadata column
				this.promiseCache.push(
					this.getMetaData(dataObj)
				);
			},
			ctLoop: function(spItems, cb) {
				var count = spItems.get_count(),
				current;
				for(var ii = 0; ii < count; ii++){
					current = spItems.getItemAtIndex(ii);
					if (cb.call(this, current) === false) {
						break;
					}
				}
			},
			getDecimalPlaces: function(text) {

				var returnvalue; 

				text = text.replace(/"/g, '');
				text = text.split(' ');

				text.some(function(item) {
					var seperated = item.split('=');

					if (seperated[0] === 'Decimals') {
						returnvalue = seperated[1];
						return true;
					}
				});

				return parseInt(returnvalue, 10);
			},
			extractorFactory: function(colData) {
				var obj = {
					internalName: colData.get_internalName(),
					type: colData.get_typeDisplayName(),
					title: colData.get_title(),
					required: colData.get_required(),
					defaultValue: colData.get_defaultValue()
				},
				columnType = api.jsomCUD.columnType,
				temp;

				if (obj.type === columnType.choice) {
					temp = colData.get_choices();
					obj.choices = temp.map(function(item) {
						return {
							text: item,
							value: item
						};
					});
					obj.createOptions = createOptions;
				}
				else if (obj.type === columnType.yesNo) {
					obj.choices = [
						{
							text: 'Yes',
							value: '1'
						},
						{
							text: 'No',
							value: '0'
						}
					 ];
					 obj.createOptions = createOptions;
				}
				else if (obj.type === columnType.metadata) {
					obj.termSetId = colData.get_termSetId().toString();
					obj.createOptions = createOptions;
				}
				else if (obj.type === columnType.lookup) {
					obj.web = colData.get_lookupWebId().toString();
					obj.listId = colData.get_lookupList();
					obj.listId = obj.listId.replace('{', '');
					obj.listId = obj.listId.replace('}', '');
					obj.columnToShow = colData.get_lookupField();
					obj.createOptions = createOptions;
				}
				else if (obj.type === columnType.num || obj.type === columnType.currency) {
					obj.decimalPlaces = this.getDecimalPlaces(colData.get_schemaXml());
				}

				if (obj.internalName === 'ContentType') {
					//content type has to be augemented for be consistant with others, fieldValues will come later
					obj.internalName = obj.internalName + 'Id';
					obj.type = obj.title;
					
				}
				return obj;
			},
			columnDataExtractor: function (colData) {
				var columnProperties = [],
					fieldDataObj;

				this.ctLoop(colData, function(info) {
					if (info.get_hidden() || info.get_readOnlyField()) {
						return;
					}
					fieldDataObj = this.extractorFactory(info);
					if (fieldDataObj.internalName === 'Attachments') {
						return;
					}
					columnProperties.push(fieldDataObj);
				});
				this.columnProperties = columnProperties;
				return this;
			},
			carryDataPrep: function(obj) {

				var type = obj.type,
					columnType = api.jsomCUD.columnType,
					propObj = {};

				if (type === columnType.metadata) {
					propObj.termSetId = obj.termSetId;
				}
				if (type === columnType.lookup) {
					propObj.listId = obj.listId;
					propObj.columnToShow = obj.columnToShow;
				}
				if (obj.decimalPlaces) {
					propObj.decimalPlaces = obj.decimalPlaces;
				}
				propObj.type = type;
				propObj.required = obj.required;
				propObj.title = obj.title;
				propObj.internalName = obj.internalName;
				return propObj;
			},
			addButtons: function() {
				var buttonContainer,
					buttons = [];

				
				this.renderButtons.forEach(function(text) {
					buttons.push($('<button/>',{
						'class': 'brightButton',
						type: 'button',
						text: text
					}));
				});

				buttonContainer = $('<div/>',{
					'class': 'brightButtonContainer'
				});

				buttonContainer.append(buttons);
				buttonContainer.on('click', 'button.brightButton', this.buttonEventListner);

				//clear function dont need it in primary info object anymore

				this.columnProperties.push({
					type: 'formButtons',
					element: buttonContainer
				});

				return this;
			},
			addFields: (function() {
				var dateFieldIncriment = 1,
					employeePickerIncriment = 1,
					self;

				var fieldsHelper = function(item) {
					var carryAlong = self.carryDataPrep(item),
						columnType = api.jsomCUD.columnType;

					if (item.internalName === "ContentTypeId") {
						
						item.element = $('<input/>',{
							type: 'text',
							value: self.contentTypeId
						});
					}
					if (item.type === columnType.slt || 
						item.type === columnType.num || 
						item.type === columnType.currency) {

						item.element = $('<input/>',{
							type: 'text',
							maxlength: 254
						});
					}
					if (item.type === columnType.date) {

						item.element = $('<input/>',{
							type: 'text',
							id: 'datePicker'+ dateFieldIncriment
						});
						dateFieldIncriment++;
						api.datePicker.init(item.element);
					}
					if (item.type === columnType.mlt) {
						item.element = $('<textarea/>');
					}
					if (item.type === columnType.yesNo) {
						item.element = $('<select/>');
						item.createOptions();
						item.element.append(item.choices);
					}
					if (item.type === columnType.choice) {
						item.element = $('<select/>');
						item.createOptions();
						item.element.append(item.choices);
					}
					if (item.type === columnType.metadata ||
						item.type === columnType.lookup) {
						item.element = $('<select/>');
						item.choices = self.getFeildOptions(item);
					}
					if (item.type === columnType.person) {
						//this is for doea employee picker not the 
						//ootb sharepoint person picker
						item.element = $('<div/>',{
							'class': 'doeaEmpWrapper'
						}).append(
							$('<input/>',{
								type: 'text',
								id: 'employeePicker'+employeePickerIncriment
							})
						);
						employeePickerIncriment++;
						api.doeaEmpPicker.init({
							element: item.element.find('input')
						});
					}

					item.element.attr({
						'data-type': item.type,
						title: item.title
					});

					//add class was used because if you put it in attr it will overwrite the jquery ui class
					//and cause them not to work
					item.element.addClass(self.fieldClass);
					item.element.data('columnInfo', carryAlong);
				};

				return function() {
					var columnData = this.columnProperties;

					self = this;

					if (!columnData || columnData.length === 0) {
						//no fields to create
						return;
					}
					columnData.forEach(fieldsHelper);

					return this;
				};
			})(),
			listBaseFunc: function(cb) {
				var self = this;
				return api.waitForScriptsReady('SP.js')
				.then(function() {

					var formData = {};
						
					if (self.url) {
						formData.context = new sPoint.ClientContext(self.url);
					} else {
						formData.context = new sPoint.ClientContext.get_current();
					}

					if (self.listGUID) {
						formData.list = formData.context.get_web().get_lists().getById( self.listGUID );
					} else {
						formData.list = formData.context.get_web().get_lists().getByTitle( self.listName );
						formData.context.load(formData.list);
					}

					formData.userRequested = cb.call(self, formData.list);
					formData.context.load(formData.userRequested);

					return api.server.jsomSendDataToServer(formData);
				});
			},
			getListContentTypeId: function() {
				var self = this;
				return self.listBaseFunc(function(list) {
					return list.get_contentTypes();
				}).then(function(response) {
					var contentTypes = response.userRequested;

					if (!self.listGUID) {
						self.extractStingId('listGUID', response.list);
					}
						
					self.ctLoop(contentTypes, function(current) {
						var name = current.get_name();
						
						if (!this.contentTypeName || name === this.contentTypeName) {
							this.extractStingId('contentTypeId', current);
							return false;
						}
					});
					
					return self;
				});
			},
			getColumnsFromListContentType: function() {
				var self = this;
				return self.getListContentTypeId()
				.then(function(columnInfo) {
					return columnInfo.listBaseFunc(function(list) {
						return list.get_contentTypes().getById( this.contentTypeId ).get_fields();
					});
				});
			}
		};
		var createOptions = function() {
			//if at a later time you need to set defaults for the fields that call this function this is where to do it
			//metadata = MIS Applications Support|b40496ff-d20d-4758-b8b5-6d4e1ce91c0e
			if (!createOptions.greatDefault) {
				createOptions.getDefault = function(type, value) {
					var columnType = api.jsomCUD.columnType,
						val;
					if (!value) {
						return value;
					}
					if (type === columnType.metadata) {
						// return the term id
						//get everything after the | 
						val = value.match(/[^|]+$/);
						return val[0];
					}
					return value;
				};
			}
			//get default value
			var defaultVal = this.createOptions.getDefault(this.type, this.defaultValue),
				ele;
			this.choices = this.choices.map(function(item) {
				ele = $('<option/>',{
					text: item.text,
					value: item.value
				});

				if (item.value === defaultVal) {
					ele.attr('selected', 'selected');
				}
				return ele;
			});

			if (this.choices.length > 0 && this.type !== api.jsomCUD.columnType.yesNo) {
				this.choices.unshift(
					$('<option/>',{
						text: 'Select',
						value: 0
					})
				);
			}
			return this;
		};


		return function(defaultsObj) {
			var obj = Object.create(formProto);
			obj.promiseCache = [];
			$.extend(obj, defaultsObj);
			return obj;
		};
	})(api);
	var getContentTypeFields = function(defaultsObj) {

		var columnInfo = formObjFactory(defaultsObj);

		return columnInfo.getColumnsFromListContentType()
		.then(function(response) {
			var contentData = response.userRequested;
			return columnInfo
				.columnDataExtractor(contentData)
				.addFields();
			//console.log(columnInfo);
		});
	};
	var createFormStructure = (function() {
		var formIncriment = 0,
			fieldRowsToHide = ['ContentTypeId'];

		var rowSharedActions = function(titleText, rowFieldData, row) {
			titleText = rowFieldData.title + ' :';
			if (rowFieldData.required) {
				titleText = titleText + '<span class="isRequired">*</span>';
			}

			if (fieldRowsToHide.indexOf(rowFieldData.internalName) !== -1) {
				row.addClass('brightHidden');
			}

			return titleText;
		};
		var buttonRowPlacement = function(postion, row, formRows) {
			if (postion === 'bottom') {
				formRows.push(row);
			}
			if (postion === 'top') {
				formRows.unshift(row);
			}
		};
		return function(formDefaults) {
			var helpers;
			formDefaults.formId = 'bright'+formIncriment;

			if (formDefaults.type === 'table') {
				helpers = {
					createForm: function(formInfoObj) {
						var fields = formInfoObj.columnProperties,
							totalColumns = fields.length,
							formRows = [],
							buttonRow,
							table,
							header,
							current,
							element;

						table = $('<table/>',{
							'class':formDefaults.formClass,
							'id': formDefaults.formId
						});	

						//set up form header
						header = helpers.createHeader(formDefaults.header);
						element = $('<thead/>');
						element.append(header);
						table.append(element);

						table.append($('<tbody/>'));

						for (var i = 0; i < totalColumns; i++) {
							current = fields[i];

							if (current.type === 'formButtons') {
								buttonRow = helpers.createButtonRow(current);
								buttonRowPlacement(formInfoObj.buttonPosition, buttonRow, formRows);
								continue;
							}

							formRows.push(helpers.createRow(current));
						}

						table.find('tbody').append(formRows);
						return table;
					},
					createHeader: function(headerValue) {
						var headerRow = $('<tr/>'),
							headerElement = $('<h2/>'),
							headerContainer;

						headerContainer = $('<th/>', {
							colspan: 2
						});

						headerRow.addClass(formDefaults.headerClass);

						headerElement.html(headerValue);
						headerContainer.append(headerElement);
						headerRow.append(headerContainer);
						return headerRow;
					},
					createButtonRow: function(rowFieldData) {
						var row = $('<tr/>'),
							buttonContainer = $('<td/>',{
								colspan: '2'
							});

						row.addClass(formDefaults.rowClass);

						buttonContainer.append(rowFieldData.element);

						row.append(buttonContainer);

						return row;
					},
					createRow: function (rowFieldData) {

						var row = $('<tr/>'),
							labelContainer = $('<td/>'),
							labelElement = $('<h3/>'),
							fieldContanier = labelContainer.clone(),
							titleText;

						titleText = rowSharedActions(titleText, rowFieldData, row);

						row.addClass(formDefaults.rowClass);
						labelElement.addClass(formDefaults.labelClass);
						labelElement.html(titleText);

						labelContainer.append(labelElement);

						fieldContanier.append(rowFieldData.element);

						row.append(labelContainer, fieldContanier);

						return row;
					}
				};
			}
			if (formDefaults.type === 'div') {
				helpers = {
					createForm: function(formInfoObj) {
						var fields = formInfoObj.columnProperties,
							totalColumns = fields.length,
							formRows = [],
							formContainer,
							buttonRow,
							header,
							current;

						formContainer = $('<div/>',{
							'class':formDefaults.formClass,
							'id': formDefaults.formId
						});	

						if (formDefaults.header) {
							header = helpers.createHeader(formDefaults.header);
							formContainer.append(header);
						}

						for (var i = 0; i < totalColumns; i++) {
							current = fields[i];

							if (current.type === 'formButtons') {
								buttonRow = helpers.createButtonRow(current);
								buttonRowPlacement(formInfoObj.buttonPosition, buttonRow, formRows);
								continue;
							}

							formRows.push(helpers.createRow(current));
						}

						formContainer.append(formRows);
						return formContainer;
					},
					createHeader: function(headerValue) {
						var headerRow = $('<div/>'),
							headerElement = $('<h2/>');

						headerRow.addClass(formDefaults.headerClass);

						headerElement.html(headerValue);
						headerRow.append(headerElement);
						return headerRow;
					},
					createButtonRow: function(rowFieldData) {
						var row = $('<div/>');

						row.addClass(formDefaults.rowClass);

						row.append(rowFieldData.element);

						return row;
					},
					createRow: function(rowFieldData) {
						var row = $('<div/>'),
							labelContainer = $('<span/>'),
							titleText;

						titleText = rowSharedActions(titleText, rowFieldData, row);

						labelContainer.html(titleText).addClass(formDefaults.labelClass);

						row.addClass(formDefaults.rowClass);

						row.append(labelContainer, rowFieldData.element);

						return row;
					}
				};
			}

			formIncriment++;
			return helpers.createForm(formDefaults);
		};
	})();
	var textStore = {
		errorHeader: 'Form Error',
		requireError: 'Field {0} is required and must contain a value.',
		numberCheckError: 'Field {0} must contain a numeric value.',
		createFormError: 'no element to place form in',
		dateError: 'Field {0} has an invalid date, please use MM/DD/YYYY format or select date from date picker.'
	};
	var formsOnDom = [];
	var setFormId = function(formId, serverId) {

		formLoop(formId, function(form) {

			if (form.itemId) {
				// id already there
				return;
			}

			form.itemId = serverId;
		});
	};
	var formNumberDecider = function(formId, cb) {
		var dataType = api.getDataType(formId),
			data = {};

		if (dataType === '[object Function]') {
			//no id passed, return all
			data.returnForm = 'all';
			data.cbFunc = formId;
		} else {
			//id was passed
			data.returnForm = formId || 'all';
			data.cbFunc = cb;
		}

		return data;
	};
	var formLoop = function(formId, cb) {
		var args = formNumberDecider(formId, cb);

		formsOnDom.forEach(function(form, formIndex) {
			if (form.formId !== args.returnForm && args.returnForm !== 'all') {
				//skip this one, not requested
				return;
			}
			args.cbFunc.call(api, form, formIndex);
		});
	};
	var formsFieldPropertiesLoop = function(formId, cb) {
		//formId is optional if you dont pass a form number 
		//then you get all forms on the page

		var args = formNumberDecider(formId, cb);

		formLoop(args.returnForm, function(form, formIndex) {
			//iterate over each form fields
			
			form.columnProperties.forEach(function(field) {
				args.cbFunc.call(api, field, formIndex);
			});

		});
	};
	try {
		m = moment;
	}
	catch (e) {
		m = null;
	}
	return {
		getFormInfo: function(formId) {

			var returnAry = [];

			formLoop(formId, function(formProps) {
				
				returnAry.push( $.extend({}, formProps) );
					

			});

			return returnAry;
		},
		lockFormToggle: function(action, formId) {
			//action is disable or enable
			var shouldLock = action === 'disable' ? true : false,
				columnType = api.jsomCUD.columnType;

			//disableProp is true to disable, false to unlock
			//form is the number of the form on the dom
			formLoop(formId, function(formProps) {
				var formId = formProps.formId,
					form = $('#'+formId);
					
				if (shouldLock === true) {
					form.addClass('brightDisabled');
				} else {
					form.removeClass('brightDisabled');
				}
			});
			formsFieldPropertiesLoop(formId, function(fieldObj) {

				if (fieldObj.type === columnType.person && shouldLock) {
					this.doeaEmpPicker.disableField(fieldObj.element);
					return;
				}
				if (fieldObj.type === columnType.person && !shouldLock) {
					this.doeaEmpPicker.enableField(fieldObj.element);
					return;
				}
				if (fieldObj.type === columnType.date && shouldLock) {
					this.datePicker.disableField(fieldObj.element);
					return;
				}
				if (fieldObj.type === columnType.date && !shouldLock) {
					this.datePicker.enableField(fieldObj.element);
					return;
				}

				fieldObj.element.prop('disabled', shouldLock);
			});
		},
		resetForm: function(formId) {
			//this publish id is brightFormReset, it will provide an array of id of the forms that were reset
			//formId is the id of the form you want to reset
			//if none is passed then all are blanked
			var resetForms = [];

			formsFieldPropertiesLoop(formId, function(fieldObj) {
				var field = fieldObj.element,
					fieldType = api.elementTagName(field),
					columnType = api.jsomCUD.columnType;

				if (fieldObj.type === columnType.contentType) {
					//dont blank out the ContentTypeId field it must be set always
					return;
				}
				switch (fieldType) {
					case 'textarea':
					//fall through
					case 'input':
						// statements_1
						field.val('');
						break;
					case 'select':
						field.val('0');
						break;
					case 'div':
					//person picker field
						field
						.find('input')
						.val('')
						.siblings('span.pickerInfo')
						.text('');

						break;
				}
			});

			formLoop(formId, function(formObj) {
				resetForms.push(formObj.formId);
			});

			//publish
			api.sublish.publish('brightFormReset', resetForms);
		},
		validateForm: (function() {
			
			var regExps = {
				date: /^(0[1-9]|1[0-2])[.\-\/](0[1-9]|[12][0-9]|3[01])[.\-\/](\d{4})/
			};
			var stringFormat = String.format;
			var getSelectFieldText = function(field) {
				var selectedText = field.children('option').filter(':selected').text();

				if (selectedText === 'Select') {
					selectedText = serverBlankValue;
				}
				return selectedText;
			};
			var validationLogic = function(item) {
				//if validation passes and a value is present
				//the value is preped for the buildObjs function
				//item is an object and must have
				//type, fieldValue, required
				var type = item.type,
					value = item.fieldValue,
					isRequired = item.required,
					columnType = api.jsomCUD.columnType,
					temp,
					validText;

				if (isRequired && value === null) {
					//error then get out
					this.errorHandler.addErrors(stringFormat(textStore.requireError, item.title));
					return;
				}
				else if ((type === columnType.num || type === columnType.currency) && value) {
					temp = api.numbers('parse', value);
					if (isNaN(temp)) {
						// not a valid number, error
						this.errorHandler.addErrors(stringFormat(textStore.numberCheckError, item.title));
					} else {
						//good number
						item.fieldValue = temp;
					}
				}
				else if (type === columnType.metadata) {
					temp = getSelectFieldText(item.element);
					item.fieldValue = {
						termLabel: temp,
						termGuid: value
					};
				}
				else if ((type === columnType.person) && value) {
					temp = value.map(function(item) {
						return item.WorkEmail;
					});
					item.fieldValue = {};
					if (temp.length === 1) {
						item.fieldValue.acct = temp[0];
					} else {
						item.fieldValue.acctArray = temp;
					}
				}
				else if ((type === columnType.lookup) && value) {
					item.fieldValue = {
						itemId: parseInt(value, 10)
					};
				}
				else if ((type === columnType.yesNo) && value) {
					item.fieldValue = parseInt(value, 10);
				}
				else if ((type === columnType.date) && value) {
					validText = regExps.date.test(value);
					if (validText) {
						temp = m(value, 'MM/DD/YYYY');
						item.fieldValue = temp.toISOString();
					} else {
						this.errorHandler.addErrors(stringFormat(textStore.dateError, item.title));
					}
				}
			};
			var buildFormObj = (function() {
				var selectFieldHelper = function(fieldInfo) {
					var val = fieldInfo.element.val();

					if (fieldInfo.type === api.jsomCUD.columnType.yesNo) {
						return val;
					}
					return val === '0' ? serverBlankValue : val;
				};
				var getFieldInfo = function(fieldInfo) {
					var columnType = api.jsomCUD.columnType,
						infoObj = {},
						temp;

					if (fieldInfo.type === 'formButtons') {
						return false;
					}

					infoObj.elementType = api.elementTagName(fieldInfo.element);

					if (fieldInfo.type === columnType.date) {
						temp = api.datePicker.getTextDate(fieldInfo.element);
						infoObj.fieldValue = temp;
					}
					if (infoObj.elementType === 'select') {
						infoObj.fieldValue = selectFieldHelper(fieldInfo);
					}
					if (infoObj.elementType === 'div') {
						// employee picker field
						temp = fieldInfo.element.find('input');
						infoObj.fieldValue = api.doeaEmpPicker.getUserInField(temp);	
					}
					if ((infoObj.elementType === 'input' || infoObj.elementType === 'textarea') && !infoObj.fieldValue) {
						temp = fieldInfo.element.val().trim();
						infoObj.fieldValue = temp ? temp : serverBlankValue;
					}

					return $.extend(infoObj, fieldInfo);
				};
				
				return function(formId) {

					var formInfo = [],
						infoIndex = 0;

					//setup form data container
					formLoop(formId, function(form, formIndex) {
						//if no formId is passed then use formIndex, 
						//if formId is passed then always put info at index 0
						if (!formId && infoIndex !== formIndex) {
							infoIndex = formIndex;
						}
						formInfo[infoIndex] = {};
						formInfo[infoIndex].formId = form.formId;
						formInfo[infoIndex].listData = {
							itemId: form.itemId,
							listGUID: form.listGUID,
							url: form.url
						};
						formInfo[infoIndex].fieldData = [];

					});
					//get current field values
					formsFieldPropertiesLoop(formId, function(field, formIndex) {
						//if no formId is passed then use formIndex, 
						//if formId is passed then always put info at index 0
						if (!formId && infoIndex !== formIndex) {
							infoIndex = formIndex;
						}
						var fieldObj = getFieldInfo(field);

						if (!fieldObj) {
							return;
						}

						formInfo[infoIndex].fieldData.push(fieldObj);
												
					});

					return formInfo;
				};
			})();
			var buildSaveObjs = (function() {
				
				var buildObjsHelper = function(mainObj, fieldItems) {
					fieldItems.forEach(function(item) {
						mainObj[item.internalName] = new this.jsomCUD.ValuePrep(item.type, item.fieldValue);
					}, api);
				};
				var buildObjs = function(formsAry) {

					formsAry.forEach(function(saveObj) {
						saveObj.prepedColumnData = {};
						buildObjsHelper(saveObj.prepedColumnData, saveObj.fieldData);
					});

					return formsAry;
				};

				return function(formObj) {

					//validation passed build the obj that has the values ready for the server
					var saveObjs = buildObjs(formObj);

					//this returns the "info" object that will be sent to jsomCUD.PrepClientData
					return saveObjs;
				};
			})();

			return function(formId, saveWhenDone, handleErrors) {
				//this function expects an array that contains the forms on the page
				//the array of objs with the column and list info
				//if you request this function to save after validation it will return a deferred, else not deferred

				var saveObj = buildFormObj(formId),
					returnValue,
					totalErrors;

				//check for errors
				saveObj.forEach(function(saveObj) {
					saveObj.fieldData.forEach(validationLogic, api);
				});

				//get errors
				totalErrors = api.errorHandler.getCount();
				if (totalErrors > 0)	{
					// validation failed, show message and stop
					returnValue = [false];
				} else {
					returnValue = buildSaveObjs(saveObj);
				}

				if (saveWhenDone) {
					return this.saveForm(returnValue, handleErrors);
				}

				return returnValue;
			};
		})(),
		saveForm: (function() {
			
			var itemIdToFormObj = function(clientObjs, serverObjs) {
				//client Objs are the save objs and are only need for the formId

				clientObjs.forEach(function(item, index) {
					var formId = item.formId,
						formServerId;

					formServerId = serverObjs[index].itemArray[0].get_id();
					
					setFormId(formId, formServerId);
				});
			};
			var errorHandler = function() {
				var errorMessages;

				//clear the button handler
				api.buttonHandlers.sameElementClicked('error');

				//validation errors get caught here
				errorMessages = api.errorHandler.getErrors().join('<br/>');

				//if you want to take user away from page after error this is where to do it
				api.errorHandler.throwErrorDialog('Form Save Error', errorMessages);

				api.errorHandler.clearErrors();
				return $.Deferred().reject('validation error');
			};
			return function(formId, handleErrors) {
				//this publish id is brightFormSave, gives you an array of the form info that was created *from the server*
				//and the form id
				//formId is the id of the form to save, if no formId is passed then all forms are saved
				//formId can also be the return of validateForm, which will bypass validation and just save

				
				var dataType = api.getDataType(formId),
					formSaveObjs,
					shortcut,
					itemsForServer,
					formReturnId;

				if (!formId || dataType === '[object String]') {
					
					//not validated yet, validate and proceed
					formSaveObjs = this.validateForm(formId);
				} else if (dataType === '[object Array]') {
				
					//already validated, proceed
					//the system works save one or all forms on the page, no exceptions
					formSaveObjs = formId;
				}
				if (formSaveObjs.length === 0) {
					//no forms to save, get out
					return $.Deferred().resolve(null);
				}

				if (!formSaveObjs[0] && !handleErrors) {
					//failed validation
					//in the failed block of the deferred chain line 996, 997 is how to get the errors and display them
					//errorMessages = api.errorHandler.getErrors().join('<br/>');
					//api.errorHandler.throwErrorDialog(textStore.errorHeader, errorMessages);
					return $.Deferred().reject('validation error');
				} else if (!formSaveObjs[0] && handleErrors) {
					return errorHandler();
				}
				formReturnId = formSaveObjs.length === 1 ? formSaveObjs[0].formId : null;

				itemsForServer = [];
				shortcut = api.jsomCUD;

				formSaveObjs.forEach(function(saveObj) {
					var action = saveObj.listData.itemId ? 'update' : 'create',
						listInfo = saveObj.listData,
						forServerData = new shortcut.PrepClientData(action, saveObj.prepedColumnData, listInfo.itemId),
						readyToGo = shortcut.prepServerData(listInfo.listGUID, listInfo.url, forServerData);
						
						itemsForServer.push(api.server.jsomSendDataToServer(readyToGo));				
				});
				
				return $.when.apply($, itemsForServer)
				.then(function() {
					var formServerObj = api.argsConverter(arguments),
						giveBack;

					//this function adds the form id to the form obj, so if user says on page after saving the form it 
					//knows which form to update
					itemIdToFormObj(formSaveObjs, formServerObj);
					giveBack = api.forms.getFormInfo(formReturnId);
					//publish
					api.sublish.publish('brightFormSave', giveBack);
					return giveBack;
				}).fail(function() {});
			};
		})(),
		deleteForm: (function() {
			var deleteFormProcess = function(api, props) {

				var itemId = props.itemId;

				return api.server.ajaxGetContext(props.url)
				.then(function(response) {
					return api.server.ajaxRecycleItem({
						url: props.url,
						listGUID: props.listGUID,
						itemId: itemId,
						context: response.FormDigestValue
					});
				});
			};
			return function(formId, keepFormOnPage) {
				//keepFormOnPage is boolean if true it resets form else removes form
				var deleteFormPromises = [],
					indexsToRemove = [];

				formLoop(formId, function(formProps, formIndex) {
					
					if (formProps.itemId) {
						//if there is a itemId then it needs to be deleted from server
						
						deleteFormPromises.push(deleteFormProcess(api, formProps));				
					}

					if (keepFormOnPage) {
						this.forms.resetForm(formProps.formId);
						//clear item id so if saved again it will be saved as new
						formProps.itemId = null;
					} else {
						$('#'+formProps.formId).remove();
						indexsToRemove.push(formIndex);
					}
				});

				indexsToRemove.forEach(function(indexNumber) {
					
					api.arrayRemoveAtIndex(formsOnDom, indexNumber);
				});

				if (deleteFormPromises.length === 0) {
					return $.Deferred().resolve(null);
				}
				return $.when.apply($, deleteFormPromises);
			};
		})(),
		addDataToFormFields: (function() {
			var userValueGet = function(userValue) {
				var personValue = {};
				if (userValue instanceof sPoint.FieldUserValue) {
					//from jsom
					personValue.AccountName = userValue.get_email();
				} else if (userValue.Name || userValue.EMail) {
					//from rest
					personValue.AccountName = userValue.Name || userValue.EMail;
				} else {
					//string
					personValue.AccountName = userValue;
				}
				return personValue;
			};
			var metaDataGet = function(data) {
				var valueForField;
				if (data instanceof sPoint.Taxonomy.TaxonomyFieldValue) {
					valueForField = data.get_termGuid();
				} else {
					valueForField = data.TermGuid;
				}

				return valueForField || false;
			};
			
			return function(formId, formData) {

				var dataType = api.getDataType(formId);

				if (dataType === '[object Function]' || dataType === '[object Undefined]') {
					api.issue('form id is required to add data to a form');
				}

				formsFieldPropertiesLoop(formId, function(fieldObj) {
					var field = fieldObj.element,
						type = fieldObj.type,
						columnName = fieldObj.internalName,
						fieldValue = formData[columnName],
						columnType = api.jsomCUD.columnType;

					if (fieldValue === null || type === 'Content Type') {
						//nothing in field
						return;
					}
					if (type === columnType.date) {
						api.datePicker.setDateInField(field, fieldValue);
						return;
					} else if (type === columnType.person) {
						fieldValue = userValueGet(fieldValue);
						api.doeaEmpPicker.addUser(field, fieldValue);
						return;
					} else if (type === columnType.metadata) {
						fieldValue = metaDataGet(fieldValue);
					} else if (type === columnType.yesNo) {
						fieldValue = fieldValue ? 1 : 0;
					} else if (type === columnType.lookup) {
						fieldValue = fieldValue.get_lookupId();
					} else if (type === columnType.num) {
						fieldValue = api.numbers('format', {
							howTo: 'number',
							decimals: fieldObj.decimalPlaces,
							value: fieldValue
						});
					} else if (type === columnType.currency) {
						fieldValue = api.numbers('format', {
							howTo: 'currency',
							decimals: fieldObj.decimalPlaces,
							value: fieldValue
						});
					}

					field.val(fieldValue);
					
				});
			};
		})(),
		createForm: function(formProps, element, formData) {
			//this publish id is brightFormCreate, gives you the id of the form that was created
			//can use listName or listGUID
			//formProps example
			// {
			// 	type: 'div',
			// 	url: '/sites/doeaspdev/routing',
			// 	listName: 'Request to Advertise',
			// 	contentTypeName: 'Request to Advertise'
			// }
			//type can be table or div
			//formProps can have listName or listGUID to retrieve data
			//if pulling from a list with no content type, just omit contentTypeName
			//formData is the data of an already created form, in object form {internalColumnName: value}
			//element is the dom node where the generated div needs to go
			var def = $.Deferred(),
				defaults;

			if (!(element instanceof $) || element.length !== 1) {
				//element is not a node or it matched to many things
				//throw error and stop
				def.reject('error');
				api.issue(textStore.createFormError);
			}
			
			defaults = $.extend({
				formClass: 'brightForm',
				header: 'DOEA Form',
				headerClass: 'brightHeader',
				rowClass: 'brightRowContainer',
				labelClass: 'brightLabel',
				fieldClass: 'brightField',
				renderButtons: ['Save', 'Cancel'],
				buttonPosition: 'bottom',
				buttonEventListner: function() {
					var $button = $(this),
						formId,
						clickedButton = $button.text();

					formId = $button.closest('.brightForm').attr('id');

					if (clickedButton === 'Save') {
						api.forms.saveForm(formId, true);
					} else {
						//cancel clicked
						//TO DO I not sure what to do when cancel is clicked
					}
				}
			},formProps);

			getContentTypeFields(defaults)
			.then(function(formDetailsObj) {
				var form;

				if (formDetailsObj.renderButtons && formDetailsObj.renderButtons.length > 0) {
					formDetailsObj.addButtons();
				}
				form = createFormStructure(formDetailsObj);

				if (formDetailsObj.promiseCache.length === 0) {
					formDetailsObj.promiseCache.push($.Deferred().resolve());
				}

				$.when.apply($, formDetailsObj.promiseCache)
				.then(function() {
					//put form on dom
					element.append(form);

					//cache referance to form data
					formsOnDom.push(formDetailsObj);

					//add data to form
					if (formData) {
						api.forms.addDataToFormFields(formDetailsObj.formId, formData);
						formDetailsObj.itemId = formData.id || formData.ID;
					}

					//publish
					api.sublish.publish('brightFormCreate', formDetailsObj.formId);
					
					//finish
					def.resolve(formDetailsObj);
				});

			});
			return def.promise();
		}
	};
})(jQuery, doeaSPlib, SP);
api.numbers = (function() {

	var n;

	var createFormatString = function(howMany) {
		var zeros = [];

		for (var i = 0; i < howMany; i++) {
			zeros.push('0');
		}

		if (zeros.length === 0) {
			return '0,0';
		}
		return '0,0.' + zeros.join('');
	};
	var currencyFormat = function(str) {
		return '$' + str;
	};

	var formatNumber = function(propsObj) {
		// propsObj = 
		// {
		// 	howTo: 'number',
		// 	decimals: fieldObj.decimalPlaces,
		// 	value: fieldValue
		// }

		var decimalPlaces = propsObj.decimals || 0,
			formatString;

		if (!propsObj.value) {
			return '';
		}

		formatString = createFormatString(decimalPlaces);

		if (propsObj.howTo === 'currency') {
			formatString = currencyFormat(formatString);
		}

		return n(propsObj.value).format(formatString);
	};

	var parseNumber = function(value) {


		var nonNumeric,
			extract;

		if (!value) {
			return null;
		}

		nonNumeric = /[^$,.\d]/g;
		extract = value.match(nonNumeric);

		if (extract) {
			//non digits in number, that not allowed
			return NaN;
		}

		return n().unformat(value);
	};

	try {
		n = numeral;
	}
	catch (e) {
		n = null;
	}

	return function(action) {

		var args = api.argsConverter(arguments, 1);

		if (args.length === 0) {
			return NaN;
		}

		if (action === 'format') {
			return formatNumber.apply(api, args);
		}
		if (action === 'parse') {
			return parseNumber.apply(api, args);
		}
	};
})();
api.appButtonSetup = function (props) {
	// {
	//	element: $('somethin'), optional
	// 	discard: [],
	// 	add: [{class: , displayText}],
	// 	listner: function() {},
	// 	loopCB: function() {}
	// }
	//to remove buttons pass the class name in an array for discard
	//add is an array for new buttons, [{class: '', displayText: ''}]
	var buttonRow = props.element || $('#doeaAppNavigation'),
		buttonEle,
		newButtons;

	if (!props.listner) {
		throw new Error('appButtons must have a event listner');
	}

	if (props.add) {
		// add buttons to the end
		buttonEle = $('<li/>');
		buttonEle = buttonEle.append(
			$('<a/>',{
				href: '#'
			})
		);
		newButtons = props.add.map(function(buttonInfo) {
			var button = buttonEle.clone();
			button
				.find('a')
				.attr('class', buttonInfo.className)
				.text(buttonInfo.displayText);
			return button;
		});
		buttonRow
			.find('.navList')
			.append(newButtons);	
	}

	buttonRow
	.find('a')
	.each(function(ind, item) {
		var $button = $(item);

		if (props.discard && props.discard.indexOf($button.attr('class')) > -1) {
			$button.closest('li').remove();
			return;
		}
		if(props.loopCB) {
			props.loopCB.call($button, $button);
		}
	})
	.end()
	.removeClass('buttonsNotShowing')
	.off()
	.on('click', 'a', props.listner);
};
api.correctAttachmentTableNames = function(attachTable) {

	attachTable.children('tbody').find('tr')
	.each(function() {
		var fileLink = $(this).find('td.ms-vb').find('span'),
			domText,
			textSplit;
			
		domText = fileLink.text();
		textSplit = domText.split('\\');

		if (textSplit.length > 1) {
			fileLink.text(textSplit[ textSplit.length -1 ]);
		}
		
	});
};


})(jQuery, doeaSPlib, SP);