/**
 * ownCloud - contacts
 *
 * This file is licensed under the Affero General Public License version 3 or
 * later. See the COPYING file.
 *
 * @author Hendrik Leppelsack <hendrik@leppelsack.de>
 * @copyright Hendrik Leppelsack 2015
 */

angular.module('contactsApp', ['uuid4', 'angular-cache', 'ngRoute', 'ui.bootstrap', 'ui.select', 'ngSanitize'])
.config(['$routeProvider', function($routeProvider) {

	$routeProvider.when('/:gid', {
		template: '<contactdetails></contactdetails>'
	});

	$routeProvider.when('/:gid/:uid', {
		template: '<contactdetails></contactdetails>'
	});

	$routeProvider.otherwise('/' + t('contacts', 'All contacts'));

}]);

angular.module('contactsApp')
.directive('datepicker', function() {
	return {
		restrict: 'A',
		require : 'ngModel',
		link : function (scope, element, attrs, ngModelCtrl) {
			$(function() {
				element.datepicker({
					dateFormat:'yy-mm-dd',
					minDate: null,
					maxDate: null,
					onSelect:function (date) {
						ngModelCtrl.$setViewValue(date);
						scope.$apply();
					}
				});
			});
		}
	};
});

angular.module('contactsApp')
.directive('focusExpression', ['$timeout', function ($timeout) {
	return {
		restrict: 'A',
		link: {
			post: function postLink(scope, element, attrs) {
				scope.$watch(attrs.focusExpression, function () {
					if (attrs.focusExpression) {
						if (scope.$eval(attrs.focusExpression)) {
							$timeout(function () {
								if (element.is('input')) {
									element.focus();
								} else {
									element.find('input').focus();
								}
							}, 100); //need some delay to work with ng-disabled
						}
					}
				});
			}
		}
	};
}]);

angular.module('contactsApp')
.directive('inputresize', function() {
	return {
		restrict: 'A',
		link : function (scope, element) {
			var elInput = element.val();
			element.bind('keydown keyup load focus', function() {
				elInput = element.val();
				// If set to 0, the min-width css data is ignored
				var length = elInput.length > 1 ? elInput.length : 1;
				element.attr('size', length);
			});
		}
	};
});

angular.module('contactsApp')
.controller('addressbookCtrl', ['$scope', 'AddressBookService', function($scope, AddressBookService) {
	var ctrl = this;

	ctrl.showUrl = false;
	/* globals oc_config */
	/* eslint-disable camelcase */
	ctrl.canExport = oc_config.versionstring.split('.') >= [9, 0, 2];
	/* eslint-enable camelcase */

	ctrl.toggleShowUrl = function() {
		ctrl.showUrl = !ctrl.showUrl;
	};

	ctrl.toggleSharesEditor = function() {
		ctrl.editingShares = !ctrl.editingShares;
		ctrl.selectedSharee = null;
	};

	/* From Calendar-Rework - js/app/controllers/calendarlistcontroller.js */
	ctrl.findSharee = function (val) {
		return $.get(
			OC.linkToOCS('apps/files_sharing/api/v1') + 'sharees',
			{
				format: 'json',
				search: val.trim(),
				perPage: 200,
				itemType: 'principals'
			}
		).then(function(result) {
			// Todo - filter out current user, existing sharees
			var users   = result.ocs.data.exact.users.concat(result.ocs.data.users);
			var groups  = result.ocs.data.exact.groups.concat(result.ocs.data.groups);

			var userShares = ctrl.addressBook.sharedWith.users;
			var userSharesLength = userShares.length;
			var i, j;

			// Filter out current user
			var usersLength = users.length;
			for (i = 0 ; i < usersLength; i++) {
				if (users[i].value.shareWith === OC.currentUser) {
					users.splice(i, 1);
					break;
				}
			}

			// Now filter out all sharees that are already shared with
			for (i = 0; i < userSharesLength; i++) {
				var share = userShares[i];
				usersLength = users.length;
				for (j = 0; j < usersLength; j++) {
					if (users[j].value.shareWith === share.id) {
						users.splice(j, 1);
						break;
					}
				}
			}

			// Combine users and groups
			users = users.map(function(item) {
				return {
					display: item.value.shareWith,
					type: OC.Share.SHARE_TYPE_USER,
					identifier: item.value.shareWith
				};
			});

			groups = groups.map(function(item) {
				return {
					display: item.value.shareWith + ' (group)',
					type: OC.Share.SHARE_TYPE_GROUP,
					identifier: item.value.shareWith
				};
			});

			return groups.concat(users);
		});
	};

	ctrl.onSelectSharee = function (item) {
		ctrl.selectedSharee = null;
		AddressBookService.share(ctrl.addressBook, item.type, item.identifier, false, false).then(function() {
			$scope.$apply();
		});

	};

	ctrl.updateExistingUserShare = function(userId, writable) {
		AddressBookService.share(ctrl.addressBook, OC.Share.SHARE_TYPE_USER, userId, writable, true).then(function() {
			$scope.$apply();
		});
	};

	ctrl.updateExistingGroupShare = function(groupId, writable) {
		AddressBookService.share(ctrl.addressBook, OC.Share.SHARE_TYPE_GROUP, groupId, writable, true).then(function() {
			$scope.$apply();
		});
	};

	ctrl.unshareFromUser = function(userId) {
		AddressBookService.unshare(ctrl.addressBook, OC.Share.SHARE_TYPE_USER, userId).then(function() {
			$scope.$apply();
		});
	};

	ctrl.unshareFromGroup = function(groupId) {
		AddressBookService.unshare(ctrl.addressBook, OC.Share.SHARE_TYPE_GROUP, groupId).then(function() {
			$scope.$apply();
		});
	};

	ctrl.deleteAddressBook = function() {
		AddressBookService.delete(ctrl.addressBook).then(function() {
			$scope.$apply();
		});
	};

}]);

angular.module('contactsApp')
.directive('addressbook', function() {
	return {
		restrict: 'A', // has to be an attribute to work with core css
		scope: {},
		controller: 'addressbookCtrl',
		controllerAs: 'ctrl',
		bindToController: {
			addressBook: '=data',
			list: '='
		},
		templateUrl: OC.linkTo('contacts', 'templates/addressBook.html')
	};
});

angular.module('contactsApp')
.controller('addressbooklistCtrl', ['$scope', 'AddressBookService', function($scope, AddressBookService) {
	var ctrl = this;

	ctrl.loading = true;

	AddressBookService.getAll().then(function(addressBooks) {
		ctrl.addressBooks = addressBooks;
		ctrl.loading = false;
	});

	ctrl.t = {
		addressBookName : t('contacts', 'Address book name')
	};

	ctrl.createAddressBook = function() {
		if(ctrl.newAddressBookName) {
			AddressBookService.create(ctrl.newAddressBookName).then(function() {
				AddressBookService.getAddressBook(ctrl.newAddressBookName).then(function(addressBook) {
					ctrl.addressBooks.push(addressBook);
					$scope.$apply();
				});
			});
		}
	};
}]);

angular.module('contactsApp')
.directive('addressbooklist', function() {
	return {
		restrict: 'EA', // has to be an attribute to work with core css
		scope: {},
		controller: 'addressbooklistCtrl',
		controllerAs: 'ctrl',
		bindToController: {},
		templateUrl: OC.linkTo('contacts', 'templates/addressBookList.html')
	};
});

angular.module('contactsApp')
.controller('avatarCtrl', ['ContactService', function(ContactService) {
	var ctrl = this;

	ctrl.import = ContactService.import.bind(ContactService);

}]);

angular.module('contactsApp')
.directive('avatar', ['ContactService', function(ContactService) {
	return {
		scope: {
			contact: '=data'
		},
		link: function(scope, element) {
			var importText = t('contacts', 'Import');
			scope.importText = importText;

			var input = element.find('input');
			input.bind('change', function() {
				var file = input.get(0).files[0];
				if (file.size > 1024*1024) { // 1 MB
					OC.Notification.showTemporary(t('contacts', 'The selected image is too big (max 1MB)'));
				} else {
					var reader = new FileReader();

					reader.addEventListener('load', function () {
						scope.$apply(function() {
							scope.contact.photo(reader.result);
							ContactService.update(scope.contact);
						});
					}, false);

					if (file) {
						reader.readAsDataURL(file);
					}
				}
			});
		},
		templateUrl: OC.linkTo('contacts', 'templates/avatar.html')
	};
}]);

angular.module('contactsApp')
.controller('contactCtrl', ['$route', '$routeParams', function($route, $routeParams) {
	var ctrl = this;

	ctrl.openContact = function() {
		$route.updateParams({
			gid: $routeParams.gid,
			uid: ctrl.contact.uid()});
	};
}]);

angular.module('contactsApp')
.directive('contact', function() {
	return {
		scope: {},
		controller: 'contactCtrl',
		controllerAs: 'ctrl',
		bindToController: {
			contact: '=data'
		},
		templateUrl: OC.linkTo('contacts', 'templates/contact.html')
	};
});

angular.module('contactsApp')
.controller('contactdetailsCtrl', ['ContactService', 'AddressBookService', 'vCardPropertiesService', '$route', '$routeParams', '$scope', function(ContactService, AddressBookService, vCardPropertiesService, $route, $routeParams, $scope) {

	var ctrl = this;

	ctrl.loading = true;
	ctrl.show = false;

	ctrl.clearContact = function() {
		$route.updateParams({
			gid: $routeParams.gid,
			uid: undefined
		});
		ctrl.show = false;
		ctrl.contact = undefined;
	};

	ctrl.uid = $routeParams.uid;
	ctrl.t = {
		noContacts : t('contacts', 'No contacts in here'),
		placeholderName : t('contacts', 'Name'),
		placeholderOrg : t('contacts', 'Organization'),
		placeholderTitle : t('contacts', 'Title'),
		selectField : t('contacts', 'Add field ...')
	};

	ctrl.fieldDefinitions = vCardPropertiesService.fieldDefinitions;
	ctrl.focus = undefined;
	ctrl.field = undefined;
	ctrl.addressBooks = [];

	AddressBookService.getAll().then(function(addressBooks) {
		ctrl.addressBooks = addressBooks;

		if (!_.isUndefined(ctrl.contact)) {
			ctrl.addressBook = _.find(ctrl.addressBooks, function(book) {
				return book.displayName === ctrl.contact.addressBookId;
			});
		}
		ctrl.loading = false;
	});

	$scope.$watch('ctrl.uid', function(newValue) {
		ctrl.changeContact(newValue);
	});

	ctrl.changeContact = function(uid) {
		if (typeof uid === 'undefined') {
			ctrl.show = false;
			$('#app-navigation-toggle').removeClass('showdetails');
			return;
		}
		ContactService.getById(uid).then(function(contact) {
			if (angular.isUndefined(contact)) {
				ctrl.clearContact();
				return;
			}
			ctrl.contact = contact;
			ctrl.show = true;
			$('#app-navigation-toggle').addClass('showdetails');

			ctrl.addressBook = _.find(ctrl.addressBooks, function(book) {
				return book.displayName === ctrl.contact.addressBookId;
			});
		});
	};

	ctrl.updateContact = function() {
		ContactService.update(ctrl.contact);
	};

	ctrl.deleteContact = function() {
		ContactService.delete(ctrl.contact);
	};

	ctrl.addField = function(field) {
		var defaultValue = vCardPropertiesService.getMeta(field).defaultValue || {value: ''};
		ctrl.contact.addProperty(field, defaultValue);
		ctrl.focus = field;
		ctrl.field = '';
	};

	ctrl.deleteField = function (field, prop) {
		ctrl.contact.removeProperty(field, prop);
		ctrl.focus = undefined;
	};

	ctrl.changeAddressBook = function (addressBook) {
		ContactService.moveContact(ctrl.contact, addressBook);
	};
}]);

angular.module('contactsApp')
.directive('contactdetails', function() {
	return {
		priority: 1,
		scope: {},
		controller: 'contactdetailsCtrl',
		controllerAs: 'ctrl',
		bindToController: {},
		templateUrl: OC.linkTo('contacts', 'templates/contactDetails.html')
	};
});

angular.module('contactsApp')
.controller('contactimportCtrl', ['ContactService', function(ContactService) {
	var ctrl = this;

	ctrl.import = ContactService.import.bind(ContactService);

}]);

angular.module('contactsApp')
.directive('contactimport', ['ContactService', function(ContactService) {
	return {
		link: function(scope, element) {
			var importText = t('contacts', 'Import');
			scope.importText = importText;

			var input = element.find('input');
			input.bind('change', function() {
				var file = input.get(0).files[0];
				var reader = new FileReader();

				reader.addEventListener('load', function () {
					scope.$apply(function() {
						ContactService.import.call(ContactService, reader.result, file.type, null, function(progress) {
							if(progress===1) {
								scope.importText = importText;
							} else {
								scope.importText = parseInt(Math.floor(progress*100))+'%';
							}
						});
					});
				}, false);

				if (file) {
					reader.readAsText(file);
				}
			});
		},
		templateUrl: OC.linkTo('contacts', 'templates/contactImport.html')
	};
}]);

angular.module('contactsApp')
.controller('contactlistCtrl', ['$scope', '$filter', '$route', '$routeParams', 'ContactService', 'vCardPropertiesService', 'SearchService', function($scope, $filter, $route, $routeParams, ContactService, vCardPropertiesService, SearchService) {
	var ctrl = this;

	ctrl.routeParams = $routeParams;

	ctrl.contactList = [];
	ctrl.searchTerm = '';
	ctrl.show = true;
	ctrl.invalid = false;

	ctrl.t = {
		addContact : t('contacts', 'Add contact'),
		emptySearch : t('contacts', 'No search result for {query}', {query: ctrl.searchTerm})
	};


	$scope.query = function(contact) {
		return contact.matches(SearchService.getSearchTerm());
	};

	SearchService.registerObserverCallback(function(ev) {
		if (ev.event === 'submitSearch') {
			var uid = !_.isEmpty(ctrl.contactList) ? ctrl.contactList[0].uid() : undefined;
			ctrl.setSelectedId(uid);
			$scope.$apply();
		}
		if (ev.event === 'changeSearch') {
			ctrl.searchTerm = ev.searchTerm;
			ctrl.t.emptySearch = t('contacts',
								   'No search result for {query}',
								   {query: ctrl.searchTerm}
								  );
			$scope.$apply();
		}
	});

	ctrl.loading = true;

	ContactService.registerObserverCallback(function(ev) {
		$scope.$apply(function() {
			if (ev.event === 'delete') {
				if (ctrl.contactList.length === 1) {
					$route.updateParams({
						gid: $routeParams.gid,
						uid: undefined
					});
				} else {
					for (var i = 0, length = ctrl.contactList.length; i < length; i++) {
						if (ctrl.contactList[i].uid() === ev.uid) {
							$route.updateParams({
								gid: $routeParams.gid,
								uid: (ctrl.contactList[i+1]) ? ctrl.contactList[i+1].uid() : ctrl.contactList[i-1].uid()
							});
							break;
						}
					}
				}
			}
			else if (ev.event === 'create') {
				$route.updateParams({
					gid: $routeParams.gid,
					uid: ev.uid
				});
			}
			ctrl.contacts = ev.contacts;
		});
	});

	// Get contacts
	ContactService.getAll().then(function(contacts) {
		if(contacts.length>0) {
			$scope.$apply(function() {
				ctrl.contacts = contacts;
			});
		} else {
			ctrl.loading = false;
		}
	});

	// Wait for ctrl.contactList to be updated, load the first contact and kill the watch
	var unbindListWatch = $scope.$watch('ctrl.contactList', function() {
		if(ctrl.contactList && ctrl.contactList.length > 0) {
			// Check if a specific uid is requested
			if($routeParams.uid && $routeParams.gid) {
				ctrl.contactList.forEach(function(contact) {
					if(contact.uid() === $routeParams.uid) {
						ctrl.setSelectedId($routeParams.uid);
						ctrl.loading = false;
					}
				});
			}
			// No contact previously loaded, let's load the first of the list if not in mobile mode
			if(ctrl.loading && $(window).width() > 768) {
				ctrl.setSelectedId(ctrl.contactList[0].uid());
			}
			ctrl.loading = false;
			unbindListWatch();
		}
	});

	$scope.$watch('ctrl.routeParams.uid', function(newValue, oldValue) {
		// Used for mobile view to clear the url
		if(typeof oldValue != 'undefined' && typeof newValue == 'undefined' && $(window).width() <= 768) {
			// no contact selected
			ctrl.show = true;
			return;
		}
		if(newValue === undefined) {
			// we might have to wait until ng-repeat filled the contactList
			if(ctrl.contactList && ctrl.contactList.length > 0) {
				$route.updateParams({
					gid: $routeParams.gid,
					uid: ctrl.contactList[0].uid()
				});
			} else {
				// watch for next contactList update
				var unbindWatch = $scope.$watch('ctrl.contactList', function() {
					if(ctrl.contactList && ctrl.contactList.length > 0) {
						$route.updateParams({
							gid: $routeParams.gid,
							uid: ctrl.contactList[0].uid()
						});
					}
					unbindWatch(); // unbind as we only want one update
				});
			}
		} else {
			// displaying contact details
			ctrl.show = false;
		}
	});

	$scope.$watch('ctrl.routeParams.gid', function() {
		// we might have to wait until ng-repeat filled the contactList
		ctrl.contactList = [];
		// not in mobile mode
		if($(window).width() > 768) {
			// watch for next contactList update
			var unbindWatch = $scope.$watch('ctrl.contactList', function() {
				if(ctrl.contactList && ctrl.contactList.length > 0) {
					$route.updateParams({
						gid: $routeParams.gid,
						uid: ctrl.contactList[0].uid()
					});
				}
				unbindWatch(); // unbind as we only want one update
			});
		}
	});

	// Watch if we have an invalid contact
	$scope.$watch('ctrl.contactList[0].displayName()', function(displayName) {
		ctrl.invalid = (displayName === '');
	});

	ctrl.createContact = function() {
		ContactService.create().then(function(contact) {
			['tel', 'adr', 'email'].forEach(function(field) {
				var defaultValue = vCardPropertiesService.getMeta(field).defaultValue || {value: ''};
				contact.addProperty(field, defaultValue);
			} );
			if ([t('contacts', 'All contacts'), t('contacts', 'Not grouped')].indexOf($routeParams.gid) === -1) {
				contact.categories($routeParams.gid);
			} else {
				contact.categories('');
			}
			$('#details-fullName').focus();
		});
	};

	ctrl.hasContacts = function () {
		if (!ctrl.contacts) {
			return false;
		}
		return ctrl.contacts.length > 0;
	};

	ctrl.setSelectedId = function (contactId) {
		$route.updateParams({
			uid: contactId
		});
	};

	ctrl.getSelectedId = function() {
		return $routeParams.uid;
	};

}]);

angular.module('contactsApp')
.directive('contactlist', function() {
	return {
		priority: 1,
		scope: {},
		controller: 'contactlistCtrl',
		controllerAs: 'ctrl',
		bindToController: {
			addressbook: '=adrbook'
		},
		templateUrl: OC.linkTo('contacts', 'templates/contactList.html')
	};
});

angular.module('contactsApp')
.controller('detailsItemCtrl', ['$templateRequest', 'vCardPropertiesService', 'ContactService', function($templateRequest, vCardPropertiesService, ContactService) {
	var ctrl = this;

	ctrl.meta = vCardPropertiesService.getMeta(ctrl.name);
	ctrl.type = undefined;
	ctrl.isPreferred = false;
	ctrl.t = {
		poBox : t('contacts', 'Post Office Box'),
		postalCode : t('contacts', 'Postal Code'),
		city : t('contacts', 'City'),
		state : t('contacts', 'State or province'),
		country : t('contacts', 'Country'),
		address: t('contacts', 'Address'),
		newGroup: t('contacts', '(new group)')
	};

	ctrl.availableOptions = ctrl.meta.options || [];
	if (!_.isUndefined(ctrl.data) && !_.isUndefined(ctrl.data.meta) && !_.isUndefined(ctrl.data.meta.type)) {
		// parse type of the property
		var array = ctrl.data.meta.type[0].split(',');
		array = array.map(function (elem) {
			return elem.trim().replace(/\/+$/, '').replace(/\\+$/, '').trim().toUpperCase();
		});
		// the pref value is handled on its own so that we can add some favorite icon to the ui if we want
		if (array.indexOf('PREF') >= 0) {
			ctrl.isPreferred = true;
			array.splice(array.indexOf('PREF'), 1);
		}
		// simply join the upper cased types together as key
		ctrl.type = array.join(',');
		var displayName = array.map(function (element) {
			return element.charAt(0).toUpperCase() + element.slice(1).toLowerCase();
		}).join(' ');

		// in case the type is not yet in the default list of available options we add it
		if (!ctrl.availableOptions.some(function(e) { return e.id === ctrl.type; } )) {
			ctrl.availableOptions = ctrl.availableOptions.concat([{id: ctrl.type, name: displayName}]);
		}
	}
	ctrl.availableGroups = [];

	ContactService.getGroups().then(function(groups) {
		ctrl.availableGroups = _.unique(groups);
	});

	ctrl.changeType = function (val) {
		if (ctrl.isPreferred) {
			val += ',PREF';
		}
		ctrl.data.meta = ctrl.data.meta || {};
		ctrl.data.meta.type = ctrl.data.meta.type || [];
		ctrl.data.meta.type[0] = val;
		ctrl.model.updateContact();
	};

	ctrl.getTemplate = function() {
		var templateUrl = OC.linkTo('contacts', 'templates/detailItems/' + ctrl.meta.template + '.html');
		return $templateRequest(templateUrl);
	};

	ctrl.deleteField = function () {
		ctrl.model.deleteField(ctrl.name, ctrl.data);
		ctrl.model.updateContact();
	};
}]);

angular.module('contactsApp')
.directive('detailsitem', ['$compile', function($compile) {
	return {
		scope: {},
		controller: 'detailsItemCtrl',
		controllerAs: 'ctrl',
		bindToController: {
			name: '=',
			data: '=',
			model: '='
		},
		link: function(scope, element, attrs, ctrl) {
			ctrl.getTemplate().then(function(html) {
				var template = angular.element(html);
				element.append(template);
				$compile(template)(scope);
			});
		}
	};
}]);

angular.module('contactsApp')
.controller('groupCtrl', function() {
	// eslint-disable-next-line no-unused-vars
	var ctrl = this;
});

angular.module('contactsApp')
.directive('group', function() {
	return {
		restrict: 'A', // has to be an attribute to work with core css
		scope: {},
		controller: 'groupCtrl',
		controllerAs: 'ctrl',
		bindToController: {
			group: '=data'
		},
		templateUrl: OC.linkTo('contacts', 'templates/group.html')
	};
});

angular.module('contactsApp')
.controller('grouplistCtrl', ['$scope', 'ContactService', 'SearchService', '$routeParams', function($scope, ContactService, SearchService, $routeParams) {
	var ctrl = this;

	var initialGroups = [t('contacts', 'All contacts'), t('contacts', 'Not grouped')];

	ctrl.groups = initialGroups;

	ContactService.getGroups().then(function(groups) {
		ctrl.groups = _.unique(initialGroups.concat(groups));
	});

	ctrl.getSelected = function() {
		return $routeParams.gid;
	};

	// Update groupList on contact add/delete/update
	ContactService.registerObserverCallback(function() {
		$scope.$apply(function() {
			ContactService.getGroups().then(function(groups) {
				ctrl.groups = _.unique(initialGroups.concat(groups));
			});
		});
	});

	ctrl.setSelected = function (selectedGroup) {
		SearchService.cleanSearch();
		$routeParams.gid = selectedGroup;
	};
}]);

angular.module('contactsApp')
.directive('grouplist', function() {
	return {
		restrict: 'EA', // has to be an attribute to work with core css
		scope: {},
		controller: 'grouplistCtrl',
		controllerAs: 'ctrl',
		bindToController: {},
		templateUrl: OC.linkTo('contacts', 'templates/groupList.html')
	};
});

angular.module('contactsApp')
.directive('groupModel', function() {
	return{
		restrict: 'A',
		require: 'ngModel',
		link: function(scope, element, attr, ngModel) {
			ngModel.$formatters.push(function(value) {
				if (value.trim().length === 0) {
					return [];
				}
				return value.split(',');
			});
			ngModel.$parsers.push(function(value) {
				return value.join(',');
			});
		}
	};
});

angular.module('contactsApp')
.directive('telModel', function() {
	return{
		restrict: 'A',
		require: 'ngModel',
		link: function(scope, element, attr, ngModel) {
			ngModel.$formatters.push(function(value) {
				return value;
			});
			ngModel.$parsers.push(function(value) {
				return value;
			});
		}
	};
});

angular.module('contactsApp')
.factory('AddressBook', function()
{
	return function AddressBook(data) {
		angular.extend(this, {

			displayName: '',
			contacts: [],
			groups: data.data.props.groups,

			getContact: function(uid) {
				for(var i in this.contacts) {
					if(this.contacts[i].uid() === uid) {
						return this.contacts[i];
					}
				}
				return undefined;
			},

			sharedWith: {
				users: [],
				groups: []
			}

		});
		angular.extend(this, data);
		angular.extend(this, {
			owner: data.url.split('/').slice(-3, -2)[0]
		});

		var shares = this.data.props.invite;
		if (typeof shares !== 'undefined') {
			for (var j = 0; j < shares.length; j++) {
				var href = shares[j].href;
				if (href.length === 0) {
					continue;
				}
				var access = shares[j].access;
				if (access.length === 0) {
					continue;
				}

				var readWrite = (typeof access.readWrite !== 'undefined');

				if (href.startsWith('principal:principals/users/')) {
					this.sharedWith.users.push({
						id: href.substr(27),
						displayname: href.substr(27),
						writable: readWrite
					});
				} else if (href.startsWith('principal:principals/groups/')) {
					this.sharedWith.groups.push({
						id: href.substr(28),
						displayname: href.substr(28),
						writable: readWrite
					});
				}
			}
		}

		//var owner = this.data.props.owner;
		//if (typeof owner !== 'undefined' && owner.length !== 0) {
		//	owner = owner.trim();
		//	if (owner.startsWith('/remote.php/dav/principals/users/')) {
		//		this._properties.owner = owner.substr(33);
		//	}
		//}

	};
});

angular.module('contactsApp')
.factory('Contact', ['$filter', function($filter) {
	return function Contact(addressBook, vCard) {
		angular.extend(this, {

			data: {},
			props: {},

			addressBookId: addressBook.displayName,

			uid: function(value) {
				var model = this;
				if (angular.isDefined(value)) {
					// setter
					return model.setProperty('uid', { value: value });
				} else {
					// getter
					return model.getProperty('uid').value;
				}
			},

			displayName: function() {
				return this.fullName() || this.org() || '';
			},

			fullName: function(value) {
				var model = this;
				if (angular.isDefined(value)) {
					// setter
					return this.setProperty('fn', { value: value });
				} else {
					// getter
					var property = model.getProperty('fn');
					if(property) {
						return property.value;
					}
					property = model.getProperty('n');
					if(property) {
						return property.value.join();
					}
					return undefined;
				}
			},

			title: function(value) {
				if (angular.isDefined(value)) {
					// setter
					return this.setProperty('title', { value: value });
				} else {
					// getter
					var property = this.getProperty('title');
					if(property) {
						return property.value;
					} else {
						return undefined;
					}
				}
			},

			org: function(value) {
				var property = this.getProperty('org');
				if (angular.isDefined(value)) {
					var val = value;
					// setter
					if(property && Array.isArray(property.value)) {
						val = property.value;
						val[0] = value;
					}
					return this.setProperty('org', { value: val });
				} else {
					// getter
					if(property) {
						if (Array.isArray(property.value)) {
							return property.value[0];
						}
						return property.value;
					} else {
						return undefined;
					}
				}
			},

			email: function() {
				// getter
				var property = this.getProperty('email');
				if(property) {
					return property.value;
				} else {
					return undefined;
				}
			},

			photo: function(value) {
				if (angular.isDefined(value)) {
					// setter
					// splits image data into "data:image/jpeg" and base 64 encoded image
					var imageData = value.split(';base64,');
					var imageType = imageData[0].slice('data:'.length);

					return this.setProperty('photo', { value: imageData[1], meta: {type: [imageType]} });
				} else {
					var property = this.getProperty('photo');
					if(property) {
						var type = property.meta.type;
						if (angular.isArray(type)) {
							type = type[0];
						}
						if (!type.startsWith('image/')) {
							type = 'image/' + type.toLowerCase();
						}
						return 'data:' + type + ';base64,' + property.value;
					} else {
						return undefined;
					}
				}
			},

			categories: function(value) {
				if (angular.isDefined(value)) {
					// setter
					return this.setProperty('categories', { value: value });
				} else {
					// getter
					var property = this.getProperty('categories');
					if(property && property.value.length > 0) {
						return property.value.split(',');
					} else {
						return [];
					}
				}
			},

			getProperty: function(name) {
				if (this.props[name]) {
					return this.props[name][0];
				} else {
					return undefined;
				}
			},
			addProperty: function(name, data) {
				data = angular.copy(data);
				if(!this.props[name]) {
					this.props[name] = [];
				}
				var idx = this.props[name].length;
				this.props[name][idx] = data;

				// keep vCard in sync
				this.data.addressData = $filter('JSON2vCard')(this.props);
				return idx;
			},
			setProperty: function(name, data) {
				if(!this.props[name]) {
					this.props[name] = [];
				}
				this.props[name][0] = data;

				// keep vCard in sync
				this.data.addressData = $filter('JSON2vCard')(this.props);
			},
			removeProperty: function (name, prop) {
				angular.copy(_.without(this.props[name], prop), this.props[name]);
				this.data.addressData = $filter('JSON2vCard')(this.props);
			},
			setETag: function(etag) {
				this.data.etag = etag;
			},
			setUrl: function(addressBook, uid) {
				this.data.url = addressBook.url + uid + '.vcf';
			},

			syncVCard: function() {
				// keep vCard in sync
				this.data.addressData = $filter('JSON2vCard')(this.props);
			},

			matches: function(pattern) {
				if (_.isUndefined(pattern) || pattern.length === 0) {
					return true;
				}
				var model = this;
				var matchingProps = ['fn', 'title', 'org', 'email', 'nickname', 'note', 'url', 'cloud', 'adr', 'impp', 'tel'].filter(function (propName) {
					if (model.props[propName]) {
						return model.props[propName].filter(function (property) {
							if (!property.value) {
								return false;
							}
							if (_.isString(property.value)) {
								return property.value.toLowerCase().indexOf(pattern.toLowerCase()) !== -1;
							}
							if (_.isArray(property.value)) {
								return property.value.filter(function(v) {
									return v.toLowerCase().indexOf(pattern.toLowerCase()) !== -1;
								}).length > 0;
							}
							return false;
						}).length > 0;
					}
					return false;
				});
				return matchingProps.length > 0;
			}

		});

		if(angular.isDefined(vCard)) {
			angular.extend(this.data, vCard);
			angular.extend(this.props, $filter('vCard2JSON')(this.data.addressData));
		} else {
			angular.extend(this.props, {
				version: [{value: '3.0'}],
				fn: [{value: ''}]
			});
			this.data.addressData = $filter('JSON2vCard')(this.props);
		}

		var property = this.getProperty('categories');
		if(!property) {
			this.categories('');
		}
	};
}]);

angular.module('contactsApp')
.factory('AddressBookService', ['DavClient', 'DavService', 'SettingsService', 'AddressBook', '$q', function(DavClient, DavService, SettingsService, AddressBook, $q) {

	var addressBooks = [];
	var loadPromise = undefined;

	var loadAll = function() {
		if (addressBooks.length > 0) {
			return $q.when(addressBooks);
		}
		if (_.isUndefined(loadPromise)) {
			loadPromise = DavService.then(function(account) {
				loadPromise = undefined;
				addressBooks = account.addressBooks.map(function(addressBook) {
					return new AddressBook(addressBook);
				});
			});
		}
		return loadPromise;
	};

	return {
		getAll: function() {
			return loadAll().then(function() {
				return addressBooks;
			});
		},

		getGroups: function () {
			return this.getAll().then(function(addressBooks) {
				return addressBooks.map(function (element) {
					return element.groups;
				}).reduce(function(a, b) {
					return a.concat(b);
				});
			});
		},

		getDefaultAddressBook: function() {
			return addressBooks[0];
		},

		getAddressBook: function(displayName) {
			return DavService.then(function(account) {
				return DavClient.getAddressBook({displayName:displayName, url:account.homeUrl}).then(function(addressBook) {
					addressBook = new AddressBook({
						url: addressBook[0].href,
						data: addressBook[0]
					});
					addressBook.displayName = displayName;
					return addressBook;
				});
			});
		},

		create: function(displayName) {
			return DavService.then(function(account) {
				return DavClient.createAddressBook({displayName:displayName, url:account.homeUrl});
			});
		},

		delete: function(addressBook) {
			return DavService.then(function() {
				return DavClient.deleteAddressBook(addressBook).then(function() {
					var index = addressBooks.indexOf(addressBook);
					addressBooks.splice(index, 1);
				});
			});
		},

		rename: function(addressBook, displayName) {
			return DavService.then(function(account) {
				return DavClient.renameAddressBook(addressBook, {displayName:displayName, url:account.homeUrl});
			});
		},

		get: function(displayName) {
			return this.getAll().then(function(addressBooks) {
				return addressBooks.filter(function (element) {
					return element.displayName === displayName;
				})[0];
			});
		},

		sync: function(addressBook) {
			return DavClient.syncAddressBook(addressBook);
		},

		share: function(addressBook, shareType, shareWith, writable, existingShare) {
			var xmlDoc = document.implementation.createDocument('', '', null);
			var oShare = xmlDoc.createElement('o:share');
			oShare.setAttribute('xmlns:d', 'DAV:');
			oShare.setAttribute('xmlns:o', 'http://owncloud.org/ns');
			xmlDoc.appendChild(oShare);

			var oSet = xmlDoc.createElement('o:set');
			oShare.appendChild(oSet);

			var dHref = xmlDoc.createElement('d:href');
			if (shareType === OC.Share.SHARE_TYPE_USER) {
				dHref.textContent = 'principal:principals/users/';
			} else if (shareType === OC.Share.SHARE_TYPE_GROUP) {
				dHref.textContent = 'principal:principals/groups/';
			}
			dHref.textContent += shareWith;
			oSet.appendChild(dHref);

			var oSummary = xmlDoc.createElement('o:summary');
			oSummary.textContent = t('contacts', '{addressbook} shared by {owner}', {
				addressbook: addressBook.displayName,
				owner: addressBook.owner
			});
			oSet.appendChild(oSummary);

			if (writable) {
				var oRW = xmlDoc.createElement('o:read-write');
				oSet.appendChild(oRW);
			}

			var body = oShare.outerHTML;

			return DavClient.xhr.send(
				dav.request.basic({method: 'POST', data: body}),
				addressBook.url
			).then(function(response) {
				if (response.status === 200) {
					if (!existingShare) {
						if (shareType === OC.Share.SHARE_TYPE_USER) {
							addressBook.sharedWith.users.push({
								id: shareWith,
								displayname: shareWith,
								writable: writable
							});
						} else if (shareType === OC.Share.SHARE_TYPE_GROUP) {
							addressBook.sharedWith.groups.push({
								id: shareWith,
								displayname: shareWith,
								writable: writable
							});
						}
					}
				}
			});

		},

		unshare: function(addressBook, shareType, shareWith) {
			var xmlDoc = document.implementation.createDocument('', '', null);
			var oShare = xmlDoc.createElement('o:share');
			oShare.setAttribute('xmlns:d', 'DAV:');
			oShare.setAttribute('xmlns:o', 'http://owncloud.org/ns');
			xmlDoc.appendChild(oShare);

			var oRemove = xmlDoc.createElement('o:remove');
			oShare.appendChild(oRemove);

			var dHref = xmlDoc.createElement('d:href');
			if (shareType === OC.Share.SHARE_TYPE_USER) {
				dHref.textContent = 'principal:principals/users/';
			} else if (shareType === OC.Share.SHARE_TYPE_GROUP) {
				dHref.textContent = 'principal:principals/groups/';
			}
			dHref.textContent += shareWith;
			oRemove.appendChild(dHref);
			var body = oShare.outerHTML;


			return DavClient.xhr.send(
				dav.request.basic({method: 'POST', data: body}),
				addressBook.url
			).then(function(response) {
				if (response.status === 200) {
					if (shareType === OC.Share.SHARE_TYPE_USER) {
						addressBook.sharedWith.users = addressBook.sharedWith.users.filter(function(user) {
							return user.id !== shareWith;
						});
					} else if (shareType === OC.Share.SHARE_TYPE_GROUP) {
						addressBook.sharedWith.groups = addressBook.sharedWith.groups.filter(function(groups) {
							return groups.id !== shareWith;
						});
					}
					//todo - remove entry from addressbook object
					return true;
				} else {
					return false;
				}
			});

		}


	};

}]);

angular.module('contactsApp')
.service('ContactService', ['DavClient', 'AddressBookService', 'Contact', '$q', 'CacheFactory', 'uuid4', function(DavClient, AddressBookService, Contact, $q, CacheFactory, uuid4) {

	var cacheFilled = false;

	var contacts = CacheFactory('contacts');

	var observerCallbacks = [];

	var loadPromise = undefined;

	this.registerObserverCallback = function(callback) {
		observerCallbacks.push(callback);
	};

	var notifyObservers = function(eventName, uid) {
		var ev = {
			event: eventName,
			uid: uid,
			contacts: contacts.values()
		};
		angular.forEach(observerCallbacks, function(callback) {
			callback(ev);
		});
	};

	this.fillCache = function() {
		if (_.isUndefined(loadPromise)) {
			loadPromise = AddressBookService.getAll().then(function (enabledAddressBooks) {
				var promises = [];
				enabledAddressBooks.forEach(function (addressBook) {
					promises.push(
						AddressBookService.sync(addressBook).then(function (addressBook) {
							for (var i in addressBook.objects) {
								if (addressBook.objects[i].addressData) {
									var contact = new Contact(addressBook, addressBook.objects[i]);
									contacts.put(contact.uid(), contact);
								} else {
									// custom console
									console.log('Invalid contact received: ' + addressBook.objects[i].url);
								}
							}
						})
					);
				});
				return $q.all(promises).then(function () {
					cacheFilled = true;
				});
			});
		}
		return loadPromise;
	};

	this.getAll = function() {
		if(cacheFilled === false) {
			return this.fillCache().then(function() {
				return contacts.values();
			});
		} else {
			return $q.when(contacts.values());
		}
	};

	this.getGroups = function () {
		return this.getAll().then(function(contacts) {
			return _.uniq(contacts.map(function (element) {
				return element.categories();
			}).reduce(function(a, b) {
				return a.concat(b);
			}, []).sort(), true);
		});
	};

	this.getById = function(uid) {
		if(cacheFilled === false) {
			return this.fillCache().then(function() {
				return contacts.get(uid);
			});
		} else {
			return $q.when(contacts.get(uid));
		}
	};

	this.create = function(newContact, addressBook, uid) {
		addressBook = addressBook || AddressBookService.getDefaultAddressBook();
		newContact = newContact || new Contact(addressBook);
		var newUid = '';
		if(uuid4.validate(uid)) {
			newUid = uid;
		} else {
			newUid = uuid4.generate();
		}
		newContact.uid(newUid);
		newContact.setUrl(addressBook, newUid);
		newContact.addressBookId = addressBook.displayName;

		return DavClient.createCard(
			addressBook,
			{
				data: newContact.data.addressData,
				filename: newUid + '.vcf'
			}
		).then(function(xhr) {
			newContact.setETag(xhr.getResponseHeader('ETag'));
			contacts.put(newUid, newContact);
			notifyObservers('create', newUid);
			return newContact;
		}).catch(function(e) {
			console.log("Couldn't create", e);
		});
	};

	this.import = function(data, type, addressBook, progressCallback) {
		addressBook = addressBook || AddressBookService.getDefaultAddressBook();

		var regexp = /BEGIN:VCARD[\s\S]*?END:VCARD/mgi;
		var singleVCards = data.match(regexp);

		if (!singleVCards) {
			OC.Notification.showTemporary(t('contacts', 'No contacts in file. Only VCard files are allowed.'));
			if (progressCallback) {
				progressCallback(1);
			}
			return;
		}
		var num = 1;
		for(var i in singleVCards) {
			var newContact = new Contact(addressBook, {addressData: singleVCards[i]});
			this.create(newContact, addressBook).then(function() {
				// Update the progress indicator
				if (progressCallback) progressCallback(num/singleVCards.length);
				num++;
			});
		}
	};

	this.moveContact = function (contact, addressbook) {
		if (contact.addressBookId === addressbook.displayName) {
			return;
		}
		contact.syncVCard();
		var clone = angular.copy(contact);
		var uid = contact.uid();

		// delete the old one before to avoid conflict
		this.delete(contact);

		// create the contact in the new target addressbook
		this.create(clone, addressbook, uid);
	};

	this.update = function(contact) {
		contact.syncVCard();

		// update contact on server
		return DavClient.updateCard(contact.data, {json: true}).then(function(xhr) {
			var newEtag = xhr.getResponseHeader('ETag');
			contact.setETag(newEtag);
			notifyObservers('update', contact.uid());
		});
	};

	this.delete = function(contact) {
		// delete contact from server
		return DavClient.deleteCard(contact.data).then(function() {
			contacts.remove(contact.uid());
			notifyObservers('delete', contact.uid());
		});
	};
}]);

angular.module('contactsApp')
.service('DavClient', function() {
	var xhr = new dav.transport.Basic(
		new dav.Credentials()
	);
	return new dav.Client(xhr);
});

angular.module('contactsApp')
.service('DavService', ['DavClient', function(DavClient) {
	return DavClient.createAccount({
		server: OC.linkToRemote('dav/addressbooks'),
		accountType: 'carddav',
		useProvidedPath: true
	});
}]);

angular.module('contactsApp')
.service('SearchService', function() {
	var searchTerm = '';

	var observerCallbacks = [];

	this.registerObserverCallback = function(callback) {
		observerCallbacks.push(callback);
	};

	var notifyObservers = function(eventName) {
		var ev = {
			event:eventName,
			searchTerm:searchTerm
		};
		angular.forEach(observerCallbacks, function(callback) {
			callback(ev);
		});
	};

	var SearchProxy = {
		attach: function(search) {
			search.setFilter('contacts', this.filterProxy);
		},
		filterProxy: function(query) {
			searchTerm = query;
			notifyObservers('changeSearch');
		}
	};

	this.getSearchTerm = function() {
		return searchTerm;
	};

	this.cleanSearch = function() {
		if (!_.isUndefined($('.searchbox'))) {
			$('.searchbox')[0].reset();
		}
		searchTerm = '';
	};

	if (!_.isUndefined(OC.Plugins)) {
		OC.Plugins.register('OCA.Search', SearchProxy);
		if (!_.isUndefined(OCA.Search)) {
			OC.Search = new OCA.Search($('#searchbox'), $('#searchresults'));
			$('#searchbox').show();
		}
	}

	if (!_.isUndefined($('.searchbox'))) {
		$('.searchbox')[0].addEventListener('keypress', function(e) {
			if(e.keyCode === 13) {
				notifyObservers('submitSearch');
			}
		});
	}
});

angular.module('contactsApp')
.service('SettingsService', function() {
	var settings = {
		addressBooks: [
			'testAddr'
		]
	};

	this.set = function(key, value) {
		settings[key] = value;
	};

	this.get = function(key) {
		return settings[key];
	};

	this.getAll = function() {
		return settings;
	};
});

angular.module('contactsApp')
.service('vCardPropertiesService', function() {
	/**
	 * map vCard attributes to internal attributes
	 *
	 * propName: {
	 * 		multiple: [Boolean], // is this prop allowed more than once? (default = false)
	 * 		readableName: [String], // internationalized readable name of prop
	 * 		template: [String], // template name found in /templates/detailItems
	 * 		[...] // optional additional information which might get used by the template
	 * }
	 */
	this.vCardMeta = {
		nickname: {
			readableName: t('contacts', 'Nickname'),
			template: 'text'
		},
		note: {
			readableName: t('contacts', 'Notes'),
			template: 'textarea'
		},
		url: {
			multiple: true,
			readableName: t('contacts', 'Website'),
			template: 'url'
		},
		cloud: {
			multiple: true,
			readableName: t('contacts', 'Federated Cloud ID'),
			template: 'text',
			defaultValue: {
				value:[''],
				meta:{type:['HOME']}
			},
			options: [
				{id: 'HOME', name: t('contacts', 'Home')},
				{id: 'WORK', name: t('contacts', 'Work')},
				{id: 'OTHER', name: t('contacts', 'Other')}
			]		},
		adr: {
			multiple: true,
			readableName: t('contacts', 'Address'),
			template: 'adr',
			defaultValue: {
				value:['', '', '', '', '', '', ''],
				meta:{type:['HOME']}
			},
			options: [
				{id: 'HOME', name: t('contacts', 'Home')},
				{id: 'WORK', name: t('contacts', 'Work')},
				{id: 'OTHER', name: t('contacts', 'Other')}
			]
		},
		categories: {
			readableName: t('contacts', 'Groups'),
			template: 'groups'
		},
		bday: {
			readableName: t('contacts', 'Birthday'),
			template: 'date'
		},
		email: {
			multiple: true,
			readableName: t('contacts', 'Email'),
			template: 'text',
			defaultValue: {
				value:'',
				meta:{type:['HOME']}
			},
			options: [
				{id: 'HOME', name: t('contacts', 'Home')},
				{id: 'WORK', name: t('contacts', 'Work')},
				{id: 'OTHER', name: t('contacts', 'Other')}
			]
		},
		impp: {
			multiple: true,
			readableName: t('contacts', 'Instant messaging'),
			template: 'text',
			defaultValue: {
				value:[''],
				meta:{type:['HOME']}
			},
			options: [
				{id: 'HOME', name: t('contacts', 'Home')},
				{id: 'WORK', name: t('contacts', 'Work')},
				{id: 'OTHER', name: t('contacts', 'Other')}
			]
		},
		tel: {
			multiple: true,
			readableName: t('contacts', 'Phone'),
			template: 'tel',
			defaultValue: {
				value:[''],
				meta:{type:['HOME,VOICE']}
			},
			options: [
				{id: 'HOME,VOICE', name: t('contacts', 'Home')},
				{id: 'WORK,VOICE', name: t('contacts', 'Work')},
				{id: 'CELL', name: t('contacts', 'Mobile')},
				{id: 'FAX', name: t('contacts', 'Fax')},
				{id: 'HOME,FAX', name: t('contacts', 'Fax home')},
				{id: 'WORK,FAX', name: t('contacts', 'Fax work')},
				{id: 'PAGER', name: t('contacts', 'Pager')},
				{id: 'VOICE', name: t('contacts', 'Voice')}
			]
		},
		'X-SOCIALPROFILE': {
			multiple: true,
			readableName: t('contacts', 'Social Network'),
			template: 'text',
			defaultValue: {
				value:[''],
				meta:{type:['facebook']}
			},
			options: [
				{id: 'FACEBOOK', name: 'Facebook'},
				{id: 'TWITTER', name: 'Twitter'}
			]

		}
	};

	this.fieldOrder = [
		'org',
		'title',
		'tel',
		'email',
		'adr',
		'impp',
		'nick',
		'bday',
		'url',
		'X-SOCIALPROFILE',
		'note',
		'categories',
		'role'
	];

	this.fieldDefinitions = [];
	for (var prop in this.vCardMeta) {
		this.fieldDefinitions.push({id: prop, name: this.vCardMeta[prop].readableName, multiple: !!this.vCardMeta[prop].multiple});
	}

	this.fallbackMeta = function(property) {
		function capitalize(string) { return string.charAt(0).toUpperCase() + string.slice(1); }
		return {
			name: 'unknown-' + property,
			readableName: capitalize(property),
			template: 'hidden',
			necessity: 'optional'
		};
	};

	this.getMeta = function(property) {
		return this.vCardMeta[property] || this.fallbackMeta(property);
	};

});

angular.module('contactsApp')
.filter('JSON2vCard', function() {
	return function(input) {
		return vCard.generate(input);
	};
});

angular.module('contactsApp')
.filter('contactColor', function() {
	return function(input) {
		// Check if core has the new color generator
		if(typeof input.toHsl === 'function') {
			var hsl = input.toHsl();
			return 'hsl('+hsl[0]+', '+hsl[1]+'%, '+hsl[2]+'%)';
		} else {
			// If not, we use the old one
			/* global md5 */
			var hash = md5(input).substring(0, 4),
				maxRange = parseInt('ffff', 16),
				hue = parseInt(hash, 16) / maxRange * 256;
			return 'hsl(' + hue + ', 90%, 65%)';
		}
	};
});
angular.module('contactsApp')
.filter('contactGroupFilter', function() {
	'use strict';
	return function (contacts, group) {
		if (typeof contacts === 'undefined') {
			return contacts;
		}
		if (typeof group === 'undefined' || group.toLowerCase() === t('contacts', 'All contacts').toLowerCase()) {
			return contacts;
		}
		var filter = [];
		if (contacts.length > 0) {
			for (var i = 0; i < contacts.length; i++) {
				if (group.toLowerCase() === t('contacts', 'Not grouped').toLowerCase()) {
					if (contacts[i].categories().length === 0) {
						filter.push(contacts[i]);
					}
				} else {
					if (contacts[i].categories().indexOf(group) >= 0) {
						filter.push(contacts[i]);
					}
				}
			}
		}
		return filter.length === 0 ? contacts : filter;
	};
});

angular.module('contactsApp')
.filter('fieldFilter', function() {
	'use strict';
	return function (fields, contact) {
		if (typeof fields === 'undefined') {
			return fields;
		}
		if (typeof contact === 'undefined') {
			return fields;
		}
		var filter = [];
		if (fields.length > 0) {
			for (var i = 0; i < fields.length; i++) {
				if (fields[i].multiple ) {
					filter.push(fields[i]);
					continue;
				}
				if (_.isUndefined(contact.getProperty(fields[i].id))) {
					filter.push(fields[i]);
				}
			}
		}
		return filter;
	};
});

angular.module('contactsApp')
.filter('firstCharacter', function() {
	return function(input) {
		return input.charAt(0);
	};
});

angular.module('contactsApp')
.filter('localeOrderBy', [function () {
	return function (array, sortPredicate, reverseOrder) {
		if (!Array.isArray(array)) return array;
		if (!sortPredicate) return array;

		var arrayCopy = [];
		angular.forEach(array, function (item) {
			arrayCopy.push(item);
		});

		arrayCopy.sort(function (a, b) {
			var valueA = a[sortPredicate];
			if (angular.isFunction(valueA)) {
				valueA = a[sortPredicate]();
			}
			var valueB = b[sortPredicate];
			if (angular.isFunction(valueB)) {
				valueB = b[sortPredicate]();
			}

			if (angular.isString(valueA)) {
				return !reverseOrder ? valueA.localeCompare(valueB) : valueB.localeCompare(valueA);
			}

			if (angular.isNumber(valueA) || angular.isBoolean(valueA)) {
				return !reverseOrder ? valueA - valueB : valueB - valueA;
			}

			return 0;
		});

		return arrayCopy;
	};
}]);


angular.module('contactsApp')
.filter('newContact', function() {
	return function(input) {
		return input !== '' ? input : t('contacts', 'New contact');
	};
});

angular.module('contactsApp')
.filter('orderDetailItems', ['vCardPropertiesService', function(vCardPropertiesService) {
	'use strict';
	return function(items, field, reverse) {

		var filtered = [];
		angular.forEach(items, function(item) {
			filtered.push(item);
		});

		var fieldOrder = angular.copy(vCardPropertiesService.fieldOrder);
		// reverse to move custom items to the end (indexOf == -1)
		fieldOrder.reverse();

		filtered.sort(function (a, b) {
			if(fieldOrder.indexOf(a[field]) < fieldOrder.indexOf(b[field])) {
				return 1;
			}
			if(fieldOrder.indexOf(a[field]) > fieldOrder.indexOf(b[field])) {
				return -1;
			}
			return 0;
		});

		if(reverse) filtered.reverse();
		return filtered;
	};
}]);

angular.module('contactsApp')
.filter('toArray', function() {
	return function(obj) {
		if (!(obj instanceof Object)) return obj;
		return _.map(obj, function(val, key) {
			return Object.defineProperty(val, '$key', {value: key});
		});
	};
});

angular.module('contactsApp')
.filter('vCard2JSON', function() {
	return function(input) {
		return vCard.parse(input);
	};
});

//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm1haW4uanMiLCJkYXRlcGlja2VyX2RpcmVjdGl2ZS5qcyIsImZvY3VzX2RpcmVjdGl2ZS5qcyIsImlucHV0cmVzaXplX2RpcmVjdGl2ZS5qcyIsImFkZHJlc3NCb29rL2FkZHJlc3NCb29rX2NvbnRyb2xsZXIuanMiLCJhZGRyZXNzQm9vay9hZGRyZXNzQm9va19kaXJlY3RpdmUuanMiLCJhZGRyZXNzQm9va0xpc3QvYWRkcmVzc0Jvb2tMaXN0X2NvbnRyb2xsZXIuanMiLCJhZGRyZXNzQm9va0xpc3QvYWRkcmVzc0Jvb2tMaXN0X2RpcmVjdGl2ZS5qcyIsImF2YXRhci9hdmF0YXJfY29udHJvbGxlci5qcyIsImF2YXRhci9hdmF0YXJfZGlyZWN0aXZlLmpzIiwiY29udGFjdC9jb250YWN0X2NvbnRyb2xsZXIuanMiLCJjb250YWN0L2NvbnRhY3RfZGlyZWN0aXZlLmpzIiwiY29udGFjdERldGFpbHMvY29udGFjdERldGFpbHNfY29udHJvbGxlci5qcyIsImNvbnRhY3REZXRhaWxzL2NvbnRhY3REZXRhaWxzX2RpcmVjdGl2ZS5qcyIsImNvbnRhY3RJbXBvcnQvY29udGFjdEltcG9ydF9jb250cm9sbGVyLmpzIiwiY29udGFjdEltcG9ydC9jb250YWN0SW1wb3J0X2RpcmVjdGl2ZS5qcyIsImNvbnRhY3RMaXN0L2NvbnRhY3RMaXN0X2NvbnRyb2xsZXIuanMiLCJjb250YWN0TGlzdC9jb250YWN0TGlzdF9kaXJlY3RpdmUuanMiLCJkZXRhaWxzSXRlbS9kZXRhaWxzSXRlbV9jb250cm9sbGVyLmpzIiwiZGV0YWlsc0l0ZW0vZGV0YWlsc0l0ZW1fZGlyZWN0aXZlLmpzIiwiZ3JvdXAvZ3JvdXBfY29udHJvbGxlci5qcyIsImdyb3VwL2dyb3VwX2RpcmVjdGl2ZS5qcyIsImdyb3VwTGlzdC9ncm91cExpc3RfY29udHJvbGxlci5qcyIsImdyb3VwTGlzdC9ncm91cExpc3RfZGlyZWN0aXZlLmpzIiwicGFyc2Vycy9ncm91cE1vZGVsX2RpcmVjdGl2ZS5qcyIsInBhcnNlcnMvdGVsTW9kZWxfZGlyZWN0aXZlLmpzIiwiYWRkcmVzc0Jvb2tfbW9kZWwuanMiLCJjb250YWN0X21vZGVsLmpzIiwiYWRkcmVzc0Jvb2tfc2VydmljZS5qcyIsImNvbnRhY3Rfc2VydmljZS5qcyIsImRhdkNsaWVudF9zZXJ2aWNlLmpzIiwiZGF2X3NlcnZpY2UuanMiLCJzZWFyY2hfc2VydmljZS5qcyIsInNldHRpbmdzX3NlcnZpY2UuanMiLCJ2Q2FyZFByb3BlcnRpZXMuanMiLCJKU09OMnZDYXJkX2ZpbHRlci5qcyIsImNvbnRhY3RDb2xvcl9maWx0ZXIuanMiLCJjb250YWN0R3JvdXBfZmlsdGVyLmpzIiwiZmllbGRfZmlsdGVyLmpzIiwiZmlyc3RDaGFyYWN0ZXJfZmlsdGVyLmpzIiwibG9jYWxlT3JkZXJCeV9maWx0ZXIuanMiLCJuZXdDb250YWN0X2ZpbHRlci5qcyIsIm9yZGVyRGV0YWlsSXRlbXNfZmlsdGVyLmpzIiwidG9BcnJheV9maWx0ZXIuanMiLCJ2Q2FyZDJKU09OX2ZpbHRlci5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7Ozs7Ozs7OztBQVVBLFFBQVEsT0FBTyxlQUFlLENBQUMsU0FBUyxpQkFBaUIsV0FBVyxnQkFBZ0IsYUFBYTtDQUNoRywwQkFBTyxTQUFTLGdCQUFnQjs7Q0FFaEMsZUFBZSxLQUFLLFNBQVM7RUFDNUIsVUFBVTs7O0NBR1gsZUFBZSxLQUFLLGNBQWM7RUFDakMsVUFBVTs7O0NBR1gsZUFBZSxVQUFVLE1BQU0sRUFBRSxZQUFZOzs7QUFHOUM7QUN4QkEsUUFBUSxPQUFPO0NBQ2QsVUFBVSxjQUFjLFdBQVc7Q0FDbkMsT0FBTztFQUNOLFVBQVU7RUFDVixVQUFVO0VBQ1YsT0FBTyxVQUFVLE9BQU8sU0FBUyxPQUFPLGFBQWE7R0FDcEQsRUFBRSxXQUFXO0lBQ1osUUFBUSxXQUFXO0tBQ2xCLFdBQVc7S0FDWCxTQUFTO0tBQ1QsU0FBUztLQUNULFNBQVMsVUFBVSxNQUFNO01BQ3hCLFlBQVksY0FBYztNQUMxQixNQUFNOzs7Ozs7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QUssUUFBUSxDQUFDLE9BQU87Ozs7QUFJckQ7QUNUQSxRQUFRLE9BQU87Q0FDZCxPQUFPLGNBQWMsV0FBVztDQUNoQyxPQUFPLFNBQVMsT0FBTztFQUN0QixPQUFPLE1BQU0sTUFBTTs7O0FBR3JCIiwiZmlsZSI6InNjcmlwdC5qcyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogb3duQ2xvdWQgLSBjb250YWN0c1xuICpcbiAqIFRoaXMgZmlsZSBpcyBsaWNlbnNlZCB1bmRlciB0aGUgQWZmZXJvIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgdmVyc2lvbiAzIG9yXG4gKiBsYXRlci4gU2VlIHRoZSBDT1BZSU5HIGZpbGUuXG4gKlxuICogQGF1dGhvciBIZW5kcmlrIExlcHBlbHNhY2sgPGhlbmRyaWtAbGVwcGVsc2Fjay5kZT5cbiAqIEBjb3B5cmlnaHQgSGVuZHJpayBMZXBwZWxzYWNrIDIwMTVcbiAqL1xuXG5hbmd1bGFyLm1vZHVsZSgnY29udGFjdHNBcHAnLCBbJ3V1aWQ0JywgJ2FuZ3VsYXItY2FjaGUnLCAnbmdSb3V0ZScsICd1aS5ib290c3RyYXAnLCAndWkuc2VsZWN0JywgJ25nU2FuaXRpemUnXSlcbi5jb25maWcoZnVuY3Rpb24oJHJvdXRlUHJvdmlkZXIpIHtcblxuXHQkcm91dGVQcm92aWRlci53aGVuKCcvOmdpZCcsIHtcblx0XHR0ZW1wbGF0ZTogJzxjb250YWN0ZGV0YWlscz48L2NvbnRhY3RkZXRhaWxzPidcblx0fSk7XG5cblx0JHJvdXRlUHJvdmlkZXIud2hlbignLzpnaWQvOnVpZCcsIHtcblx0XHR0ZW1wbGF0ZTogJzxjb250YWN0ZGV0YWlscz48L2NvbnRhY3RkZXRhaWxzPidcblx0fSk7XG5cblx0JHJvdXRlUHJvdmlkZXIub3RoZXJ3aXNlKCcvJyArIHQoJ2NvbnRhY3RzJywgJ0FsbCBjb250YWN0cycpKTtcblxufSk7XG4iLCJhbmd1bGFyLm1vZHVsZSgnY29udGFjdHNBcHAnKVxuLmRpcmVjdGl2ZSgnZGF0ZXBpY2tlcicsIGZ1bmN0aW9uKCkge1xuXHRyZXR1cm4ge1xuXHRcdHJlc3RyaWN0OiAnQScsXG5cdFx0cmVxdWlyZSA6ICduZ01vZGVsJyxcblx0XHRsaW5rIDogZnVuY3Rpb24gKHNjb3BlLCBlbGVtZW50LCBhdHRycywgbmdNb2RlbEN0cmwpIHtcblx0XHRcdCQoZnVuY3Rpb24oKSB7XG5cdFx0XHRcdGVsZW1lbnQuZGF0ZXBpY2tlcih7XG5cdFx0XHRcdFx0ZGF0ZUZvcm1hdDoneXktbW0tZGQnLFxuXHRcdFx0XHRcdG1pbkRhdGU6IG51bGwsXG5cdFx0XHRcdFx0bWF4RGF0ZTogbnVsbCxcblx0XHRcdFx0XHRvblNlbGVjdDpmdW5jdGlvbiAoZGF0ZSkge1xuXHRcdFx0XHRcdFx0bmdNb2RlbEN0cmwuJHNldFZpZXdWYWx1ZShkYXRlKTtcblx0XHRcdFx0XHRcdHNjb3BlLiRhcHBseSgpO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0fSk7XG5cdFx0XHR9KTtcblx0XHR9XG5cdH07XG59KTtcbiIsImFuZ3VsYXIubW9kdWxlKCdjb250YWN0c0FwcCcpXG4uZGlyZWN0aXZlKCdmb2N1c0V4cHJlc3Npb24nLCBmdW5jdGlvbiAoJHRpbWVvdXQpIHtcblx0cmV0dXJuIHtcblx0XHRyZXN0cmljdDogJ0EnLFxuXHRcdGxpbms6IHtcblx0XHRcdHBvc3Q6IGZ1bmN0aW9uIHBvc3RMaW5rKHNjb3BlLCBlbGVtZW50LCBhdHRycykge1xuXHRcdFx0XHRzY29wZS4kd2F0Y2goYXR0cnMuZm9jdXNFeHByZXNzaW9uLCBmdW5jdGlvbiAoKSB7XG5cdFx0XHRcdFx0aWYgKGF0dHJzLmZvY3VzRXhwcmVzc2lvbikge1xuXHRcdFx0XHRcdFx0aWYgKHNjb3BlLiRldmFsKGF0dHJzLmZvY3VzRXhwcmVzc2lvbikpIHtcblx0XHRcdFx0XHRcdFx0JHRpbWVvdXQoZnVuY3Rpb24gKCkge1xuXHRcdFx0XHRcdFx0XHRcdGlmIChlbGVtZW50LmlzKCdpbnB1dCcpKSB7XG5cdFx0XHRcdFx0XHRcdFx0XHRlbGVtZW50LmZvY3VzKCk7XG5cdFx0XHRcdFx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHRcdFx0XHRcdGVsZW1lbnQuZmluZCgnaW5wdXQnKS5mb2N1cygpO1xuXHRcdFx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdFx0fSwgMTAwKTsgLy9uZWVkIHNvbWUgZGVsYXkgdG8gd29yayB3aXRoIG5nLWRpc2FibGVkXG5cdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9KTtcblx0XHRcdH1cblx0XHR9XG5cdH07XG59KTtcbiIsImFuZ3VsYXIubW9kdWxlKCdjb250YWN0c0FwcCcpXG4uZGlyZWN0aXZlKCdpbnB1dHJlc2l6ZScsIGZ1bmN0aW9uKCkge1xuXHRyZXR1cm4ge1xuXHRcdHJlc3RyaWN0OiAnQScsXG5cdFx0bGluayA6IGZ1bmN0aW9uIChzY29wZSwgZWxlbWVudCkge1xuXHRcdFx0dmFyIGVsSW5wdXQgPSBlbGVtZW50LnZhbCgpO1xuXHRcdFx0ZWxlbWVudC5iaW5kKCdrZXlkb3duIGtleXVwIGxvYWQgZm9jdXMnLCBmdW5jdGlvbigpIHtcblx0XHRcdFx0ZWxJbnB1dCA9IGVsZW1lbnQudmFsKCk7XG5cdFx0XHRcdC8vIElmIHNldCB0byAwLCB0aGUgbWluLXdpZHRoIGNzcyBkYXRhIGlzIGlnbm9yZWRcblx0XHRcdFx0dmFyIGxlbmd0aCA9IGVsSW5wdXQubGVuZ3RoID4gMSA/IGVsSW5wdXQubGVuZ3RoIDogMTtcblx0XHRcdFx0ZWxlbWVudC5hdHRyKCdzaXplJywgbGVuZ3RoKTtcblx0XHRcdH0pO1xuXHRcdH1cblx0fTtcbn0pO1xuIiwiYW5ndWxhci5tb2R1bGUoJ2NvbnRhY3RzQXBwJylcbi5jb250cm9sbGVyKCdhZGRyZXNzYm9va0N0cmwnLCBmdW5jdGlvbigkc2NvcGUsIEFkZHJlc3NCb29rU2VydmljZSkge1xuXHR2YXIgY3RybCA9IHRoaXM7XG5cblx0Y3RybC5zaG93VXJsID0gZmFsc2U7XG5cdC8qIGdsb2JhbHMgb2NfY29uZmlnICovXG5cdC8qIGVzbGludC1kaXNhYmxlIGNhbWVsY2FzZSAqL1xuXHRjdHJsLmNhbkV4cG9ydCA9IG9jX2NvbmZpZy52ZXJzaW9uc3RyaW5nLnNwbGl0KCcuJykgPj0gWzksIDAsIDJdO1xuXHQvKiBlc2xpbnQtZW5hYmxlIGNhbWVsY2FzZSAqL1xuXG5cdGN0cmwudG9nZ2xlU2hvd1VybCA9IGZ1bmN0aW9uKCkge1xuXHRcdGN0cmwuc2hvd1VybCA9ICFjdHJsLnNob3dVcmw7XG5cdH07XG5cblx0Y3RybC50b2dnbGVTaGFyZXNFZGl0b3IgPSBmdW5jdGlvbigpIHtcblx0XHRjdHJsLmVkaXRpbmdTaGFyZXMgPSAhY3RybC5lZGl0aW5nU2hhcmVzO1xuXHRcdGN0cmwuc2VsZWN0ZWRTaGFyZWUgPSBudWxsO1xuXHR9O1xuXG5cdC8qIEZyb20gQ2FsZW5kYXItUmV3b3JrIC0ganMvYXBwL2NvbnRyb2xsZXJzL2NhbGVuZGFybGlzdGNvbnRyb2xsZXIuanMgKi9cblx0Y3RybC5maW5kU2hhcmVlID0gZnVuY3Rpb24gKHZhbCkge1xuXHRcdHJldHVybiAkLmdldChcblx0XHRcdE9DLmxpbmtUb09DUygnYXBwcy9maWxlc19zaGFyaW5nL2FwaS92MScpICsgJ3NoYXJlZXMnLFxuXHRcdFx0e1xuXHRcdFx0XHRmb3JtYXQ6ICdqc29uJyxcblx0XHRcdFx0c2VhcmNoOiB2YWwudHJpbSgpLFxuXHRcdFx0XHRwZXJQYWdlOiAyMDAsXG5cdFx0XHRcdGl0ZW1UeXBlOiAncHJpbmNpcGFscydcblx0XHRcdH1cblx0XHQpLnRoZW4oZnVuY3Rpb24ocmVzdWx0KSB7XG5cdFx0XHQvLyBUb2RvIC0gZmlsdGVyIG91dCBjdXJyZW50IHVzZXIsIGV4aXN0aW5nIHNoYXJlZXNcblx0XHRcdHZhciB1c2VycyAgID0gcmVzdWx0Lm9jcy5kYXRhLmV4YWN0LnVzZXJzLmNvbmNhdChyZXN1bHQub2NzLmRhdGEudXNlcnMpO1xuXHRcdFx0dmFyIGdyb3VwcyAgPSByZXN1bHQub2NzLmRhdGEuZXhhY3QuZ3JvdXBzLmNvbmNhdChyZXN1bHQub2NzLmRhdGEuZ3JvdXBzKTtcblxuXHRcdFx0dmFyIHVzZXJTaGFyZXMgPSBjdHJsLmFkZHJlc3NCb29rLnNoYXJlZFdpdGgudXNlcnM7XG5cdFx0XHR2YXIgdXNlclNoYXJlc0xlbmd0aCA9IHVzZXJTaGFyZXMubGVuZ3RoO1xuXHRcdFx0dmFyIGksIGo7XG5cblx0XHRcdC8vIEZpbHRlciBvdXQgY3VycmVudCB1c2VyXG5cdFx0XHR2YXIgdXNlcnNMZW5ndGggPSB1c2Vycy5sZW5ndGg7XG5cdFx0XHRmb3IgKGkgPSAwIDsgaSA8IHVzZXJzTGVuZ3RoOyBpKyspIHtcblx0XHRcdFx0aWYgKHVzZXJzW2ldLnZhbHVlLnNoYXJlV2l0aCA9PT0gT0MuY3VycmVudFVzZXIpIHtcblx0XHRcdFx0XHR1c2Vycy5zcGxpY2UoaSwgMSk7XG5cdFx0XHRcdFx0YnJlYWs7XG5cdFx0XHRcdH1cblx0XHRcdH1cblxuXHRcdFx0Ly8gTm93IGZpbHRlciBvdXQgYWxsIHNoYXJlZXMgdGhhdCBhcmUgYWxyZWFkeSBzaGFyZWQgd2l0aFxuXHRcdFx0Zm9yIChpID0gMDsgaSA8IHVzZXJTaGFyZXNMZW5ndGg7IGkrKykge1xuXHRcdFx0XHR2YXIgc2hhcmUgPSB1c2VyU2hhcmVzW2ldO1xuXHRcdFx0XHR1c2Vyc0xlbmd0aCA9IHVzZXJzLmxlbmd0aDtcblx0XHRcdFx0Zm9yIChqID0gMDsgaiA8IHVzZXJzTGVuZ3RoOyBqKyspIHtcblx0XHRcdFx0XHRpZiAodXNlcnNbal0udmFsdWUuc2hhcmVXaXRoID09PSBzaGFyZS5pZCkge1xuXHRcdFx0XHRcdFx0dXNlcnMuc3BsaWNlKGosIDEpO1xuXHRcdFx0XHRcdFx0YnJlYWs7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9XG5cdFx0XHR9XG5cblx0XHRcdC8vIENvbWJpbmUgdXNlcnMgYW5kIGdyb3Vwc1xuXHRcdFx0dXNlcnMgPSB1c2Vycy5tYXAoZnVuY3Rpb24oaXRlbSkge1xuXHRcdFx0XHRyZXR1cm4ge1xuXHRcdFx0XHRcdGRpc3BsYXk6IGl0ZW0udmFsdWUuc2hhcmVXaXRoLFxuXHRcdFx0XHRcdHR5cGU6IE9DLlNoYXJlLlNIQVJFX1RZUEVfVVNFUixcblx0XHRcdFx0XHRpZGVudGlmaWVyOiBpdGVtLnZhbHVlLnNoYXJlV2l0aFxuXHRcdFx0XHR9O1xuXHRcdFx0fSk7XG5cblx0XHRcdGdyb3VwcyA9IGdyb3Vwcy5tYXAoZnVuY3Rpb24oaXRlbSkge1xuXHRcdFx0XHRyZXR1cm4ge1xuXHRcdFx0XHRcdGRpc3BsYXk6IGl0ZW0udmFsdWUuc2hhcmVXaXRoICsgJyAoZ3JvdXApJyxcblx0XHRcdFx0XHR0eXBlOiBPQy5TaGFyZS5TSEFSRV9UWVBFX0dST1VQLFxuXHRcdFx0XHRcdGlkZW50aWZpZXI6IGl0ZW0udmFsdWUuc2hhcmVXaXRoXG5cdFx0XHRcdH07XG5cdFx0XHR9KTtcblxuXHRcdFx0cmV0dXJuIGdyb3Vwcy5jb25jYXQodXNlcnMpO1xuXHRcdH0pO1xuXHR9O1xuXG5cdGN0cmwub25TZWxlY3RTaGFyZWUgPSBmdW5jdGlvbiAoaXRlbSkge1xuXHRcdGN0cmwuc2VsZWN0ZWRTaGFyZWUgPSBudWxsO1xuXHRcdEFkZHJlc3NCb29rU2VydmljZS5zaGFyZShjdHJsLmFkZHJlc3NCb29rLCBpdGVtLnR5cGUsIGl0ZW0uaWRlbnRpZmllciwgZmFsc2UsIGZhbHNlKS50aGVuKGZ1bmN0aW9uKCkge1xuXHRcdFx0JHNjb3BlLiRhcHBseSgpO1xuXHRcdH0pO1xuXG5cdH07XG5cblx0Y3RybC51cGRhdGVFeGlzdGluZ1VzZXJTaGFyZSA9IGZ1bmN0aW9uKHVzZXJJZCwgd3JpdGFibGUpIHtcblx0XHRBZGRyZXNzQm9va1NlcnZpY2Uuc2hhcmUoY3RybC5hZGRyZXNzQm9vaywgT0MuU2hhcmUuU0hBUkVfVFlQRV9VU0VSLCB1c2VySWQsIHdyaXRhYmxlLCB0cnVlKS50aGVuKGZ1bmN0aW9uKCkge1xuXHRcdFx0JHNjb3BlLiRhcHBseSgpO1xuXHRcdH0pO1xuXHR9O1xuXG5cdGN0cmwudXBkYXRlRXhpc3RpbmdHcm91cFNoYXJlID0gZnVuY3Rpb24oZ3JvdXBJZCwgd3JpdGFibGUpIHtcblx0XHRBZGRyZXNzQm9va1NlcnZpY2Uuc2hhcmUoY3RybC5hZGRyZXNzQm9vaywgT0MuU2hhcmUuU0hBUkVfVFlQRV9HUk9VUCwgZ3JvdXBJZCwgd3JpdGFibGUsIHRydWUpLnRoZW4oZnVuY3Rpb24oKSB7XG5cdFx0XHQkc2NvcGUuJGFwcGx5KCk7XG5cdFx0fSk7XG5cdH07XG5cblx0Y3RybC51bnNoYXJlRnJvbVVzZXIgPSBmdW5jdGlvbih1c2VySWQpIHtcblx0XHRBZGRyZXNzQm9va1NlcnZpY2UudW5zaGFyZShjdHJsLmFkZHJlc3NCb29rLCBPQy5TaGFyZS5TSEFSRV9UWVBFX1VTRVIsIHVzZXJJZCkudGhlbihmdW5jdGlvbigpIHtcblx0XHRcdCRzY29wZS4kYXBwbHkoKTtcblx0XHR9KTtcblx0fTtcblxuXHRjdHJsLnVuc2hhcmVGcm9tR3JvdXAgPSBmdW5jdGlvbihncm91cElkKSB7XG5cdFx0QWRkcmVzc0Jvb2tTZXJ2aWNlLnVuc2hhcmUoY3RybC5hZGRyZXNzQm9vaywgT0MuU2hhcmUuU0hBUkVfVFlQRV9HUk9VUCwgZ3JvdXBJZCkudGhlbihmdW5jdGlvbigpIHtcblx0XHRcdCRzY29wZS4kYXBwbHkoKTtcblx0XHR9KTtcblx0fTtcblxuXHRjdHJsLmRlbGV0ZUFkZHJlc3NCb29rID0gZnVuY3Rpb24oKSB7XG5cdFx0QWRkcmVzc0Jvb2tTZXJ2aWNlLmRlbGV0ZShjdHJsLmFkZHJlc3NCb29rKS50aGVuKGZ1bmN0aW9uKCkge1xuXHRcdFx0JHNjb3BlLiRhcHBseSgpO1xuXHRcdH0pO1xuXHR9O1xuXG59KTtcbiIsImFuZ3VsYXIubW9kdWxlKCdjb250YWN0c0FwcCcpXG4uZGlyZWN0aXZlKCdhZGRyZXNzYm9vaycsIGZ1bmN0aW9uKCkge1xuXHRyZXR1cm4ge1xuXHRcdHJlc3RyaWN0OiAnQScsIC8vIGhhcyB0byBiZSBhbiBhdHRyaWJ1dGUgdG8gd29yayB3aXRoIGNvcmUgY3NzXG5cdFx0c2NvcGU6IHt9LFxuXHRcdGNvbnRyb2xsZXI6ICdhZGRyZXNzYm9va0N0cmwnLFxuXHRcdGNvbnRyb2xsZXJBczogJ2N0cmwnLFxuXHRcdGJpbmRUb0NvbnRyb2xsZXI6IHtcblx0XHRcdGFkZHJlc3NCb29rOiAnPWRhdGEnLFxuXHRcdFx0bGlzdDogJz0nXG5cdFx0fSxcblx0XHR0ZW1wbGF0ZVVybDogT0MubGlua1RvKCdjb250YWN0cycsICd0ZW1wbGF0ZXMvYWRkcmVzc0Jvb2suaHRtbCcpXG5cdH07XG59KTtcbiIsImFuZ3VsYXIubW9kdWxlKCdjb250YWN0c0FwcCcpXG4uY29udHJvbGxlcignYWRkcmVzc2Jvb2tsaXN0Q3RybCcsIGZ1bmN0aW9uKCRzY29wZSwgQWRkcmVzc0Jvb2tTZXJ2aWNlKSB7XG5cdHZhciBjdHJsID0gdGhpcztcblxuXHRjdHJsLmxvYWRpbmcgPSB0cnVlO1xuXG5cdEFkZHJlc3NCb29rU2VydmljZS5nZXRBbGwoKS50aGVuKGZ1bmN0aW9uKGFkZHJlc3NCb29rcykge1xuXHRcdGN0cmwuYWRkcmVzc0Jvb2tzID0gYWRkcmVzc0Jvb2tzO1xuXHRcdGN0cmwubG9hZGluZyA9IGZhbHNlO1xuXHR9KTtcblxuXHRjdHJsLnQgPSB7XG5cdFx0YWRkcmVzc0Jvb2tOYW1lIDogdCgnY29udGFjdHMnLCAnQWRkcmVzcyBib29rIG5hbWUnKVxuXHR9O1xuXG5cdGN0cmwuY3JlYXRlQWRkcmVzc0Jvb2sgPSBmdW5jdGlvbigpIHtcblx0XHRpZihjdHJsLm5ld0FkZHJlc3NCb29rTmFtZSkge1xuXHRcdFx0QWRkcmVzc0Jvb2tTZXJ2aWNlLmNyZWF0ZShjdHJsLm5ld0FkZHJlc3NCb29rTmFtZSkudGhlbihmdW5jdGlvbigpIHtcblx0XHRcdFx0QWRkcmVzc0Jvb2tTZXJ2aWNlLmdldEFkZHJlc3NCb29rKGN0cmwubmV3QWRkcmVzc0Jvb2tOYW1lKS50aGVuKGZ1bmN0aW9uKGFkZHJlc3NCb29rKSB7XG5cdFx0XHRcdFx0Y3RybC5hZGRyZXNzQm9va3MucHVzaChhZGRyZXNzQm9vayk7XG5cdFx0XHRcdFx0JHNjb3BlLiRhcHBseSgpO1xuXHRcdFx0XHR9KTtcblx0XHRcdH0pO1xuXHRcdH1cblx0fTtcbn0pO1xuIiwiYW5ndWxhci5tb2R1bGUoJ2NvbnRhY3RzQXBwJylcbi5kaXJlY3RpdmUoJ2FkZHJlc3Nib29rbGlzdCcsIGZ1bmN0aW9uKCkge1xuXHRyZXR1cm4ge1xuXHRcdHJlc3RyaWN0OiAnRUEnLCAvLyBoYXMgdG8gYmUgYW4gYXR0cmlidXRlIHRvIHdvcmsgd2l0aCBjb3JlIGNzc1xuXHRcdHNjb3BlOiB7fSxcblx0XHRjb250cm9sbGVyOiAnYWRkcmVzc2Jvb2tsaXN0Q3RybCcsXG5cdFx0Y29udHJvbGxlckFzOiAnY3RybCcsXG5cdFx0YmluZFRvQ29udHJvbGxlcjoge30sXG5cdFx0dGVtcGxhdGVVcmw6IE9DLmxpbmtUbygnY29udGFjdHMnLCAndGVtcGxhdGVzL2FkZHJlc3NCb29rTGlzdC5odG1sJylcblx0fTtcbn0pO1xuIiwiYW5ndWxhci5tb2R1bGUoJ2NvbnRhY3RzQXBwJylcbi5jb250cm9sbGVyKCdhdmF0YXJDdHJsJywgZnVuY3Rpb24oQ29udGFjdFNlcnZpY2UpIHtcblx0dmFyIGN0cmwgPSB0aGlzO1xuXG5cdGN0cmwuaW1wb3J0ID0gQ29udGFjdFNlcnZpY2UuaW1wb3J0LmJpbmQoQ29udGFjdFNlcnZpY2UpO1xuXG59KTtcbiIsImFuZ3VsYXIubW9kdWxlKCdjb250YWN0c0FwcCcpXG4uZGlyZWN0aXZlKCdhdmF0YXInLCBmdW5jdGlvbihDb250YWN0U2VydmljZSkge1xuXHRyZXR1cm4ge1xuXHRcdHNjb3BlOiB7XG5cdFx0XHRjb250YWN0OiAnPWRhdGEnXG5cdFx0fSxcblx0XHRsaW5rOiBmdW5jdGlvbihzY29wZSwgZWxlbWVudCkge1xuXHRcdFx0dmFyIGltcG9ydFRleHQgPSB0KCdjb250YWN0cycsICdJbXBvcnQnKTtcblx0XHRcdHNjb3BlLmltcG9ydFRleHQgPSBpbXBvcnRUZXh0O1xuXG5cdFx0XHR2YXIgaW5wdXQgPSBlbGVtZW50LmZpbmQoJ2lucHV0Jyk7XG5cdFx0XHRpbnB1dC5iaW5kKCdjaGFuZ2UnLCBmdW5jdGlvbigpIHtcblx0XHRcdFx0dmFyIGZpbGUgPSBpbnB1dC5nZXQoMCkuZmlsZXNbMF07XG5cdFx0XHRcdGlmIChmaWxlLnNpemUgPiAxMDI0KjEwMjQpIHsgLy8gMSBNQlxuXHRcdFx0XHRcdE9DLk5vdGlmaWNhdGlvbi5zaG93VGVtcG9yYXJ5KHQoJ2NvbnRhY3RzJywgJ1RoZSBzZWxlY3RlZCBpbWFnZSBpcyB0b28gYmlnIChtYXggMU1CKScpKTtcblx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHR2YXIgcmVhZGVyID0gbmV3IEZpbGVSZWFkZXIoKTtcblxuXHRcdFx0XHRcdHJlYWRlci5hZGRFdmVudExpc3RlbmVyKCdsb2FkJywgZnVuY3Rpb24gKCkge1xuXHRcdFx0XHRcdFx0c2NvcGUuJGFwcGx5KGZ1bmN0aW9uKCkge1xuXHRcdFx0XHRcdFx0XHRzY29wZS5jb250YWN0LnBob3RvKHJlYWRlci5yZXN1bHQpO1xuXHRcdFx0XHRcdFx0XHRDb250YWN0U2VydmljZS51cGRhdGUoc2NvcGUuY29udGFjdCk7XG5cdFx0XHRcdFx0XHR9KTtcblx0XHRcdFx0XHR9LCBmYWxzZSk7XG5cblx0XHRcdFx0XHRpZiAoZmlsZSkge1xuXHRcdFx0XHRcdFx0cmVhZGVyLnJlYWRBc0RhdGFVUkwoZmlsZSk7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9XG5cdFx0XHR9KTtcblx0XHR9LFxuXHRcdHRlbXBsYXRlVXJsOiBPQy5saW5rVG8oJ2NvbnRhY3RzJywgJ3RlbXBsYXRlcy9hdmF0YXIuaHRtbCcpXG5cdH07XG59KTtcbiIsImFuZ3VsYXIubW9kdWxlKCdjb250YWN0c0FwcCcpXG4uY29udHJvbGxlcignY29udGFjdEN0cmwnLCBmdW5jdGlvbigkcm91dGUsICRyb3V0ZVBhcmFtcykge1xuXHR2YXIgY3RybCA9IHRoaXM7XG5cblx0Y3RybC5vcGVuQ29udGFjdCA9IGZ1bmN0aW9uKCkge1xuXHRcdCRyb3V0ZS51cGRhdGVQYXJhbXMoe1xuXHRcdFx0Z2lkOiAkcm91dGVQYXJhbXMuZ2lkLFxuXHRcdFx0dWlkOiBjdHJsLmNvbnRhY3QudWlkKCl9KTtcblx0fTtcbn0pO1xuIiwiYW5ndWxhci5tb2R1bGUoJ2NvbnRhY3RzQXBwJylcbi5kaXJlY3RpdmUoJ2NvbnRhY3QnLCBmdW5jdGlvbigpIHtcblx0cmV0dXJuIHtcblx0XHRzY29wZToge30sXG5cdFx0Y29udHJvbGxlcjogJ2NvbnRhY3RDdHJsJyxcblx0XHRjb250cm9sbGVyQXM6ICdjdHJsJyxcblx0XHRiaW5kVG9Db250cm9sbGVyOiB7XG5cdFx0XHRjb250YWN0OiAnPWRhdGEnXG5cdFx0fSxcblx0XHR0ZW1wbGF0ZVVybDogT0MubGlua1RvKCdjb250YWN0cycsICd0ZW1wbGF0ZXMvY29udGFjdC5odG1sJylcblx0fTtcbn0pO1xuIiwiYW5ndWxhci5tb2R1bGUoJ2NvbnRhY3RzQXBwJylcbi5jb250cm9sbGVyKCdjb250YWN0ZGV0YWlsc0N0cmwnLCBmdW5jdGlvbihDb250YWN0U2VydmljZSwgQWRkcmVzc0Jvb2tTZXJ2aWNlLCB2Q2FyZFByb3BlcnRpZXNTZXJ2aWNlLCAkcm91dGUsICRyb3V0ZVBhcmFtcywgJHNjb3BlKSB7XG5cblx0dmFyIGN0cmwgPSB0aGlzO1xuXG5cdGN0cmwubG9hZGluZyA9IHRydWU7XG5cdGN0cmwuc2hvdyA9IGZhbHNlO1xuXG5cdGN0cmwuY2xlYXJDb250YWN0ID0gZnVuY3Rpb24oKSB7XG5cdFx0JHJvdXRlLnVwZGF0ZVBhcmFtcyh7XG5cdFx0XHRnaWQ6ICRyb3V0ZVBhcmFtcy5naWQsXG5cdFx0XHR1aWQ6IHVuZGVmaW5lZFxuXHRcdH0pO1xuXHRcdGN0cmwuc2hvdyA9IGZhbHNlO1xuXHRcdGN0cmwuY29udGFjdCA9IHVuZGVmaW5lZDtcblx0fTtcblxuXHRjdHJsLnVpZCA9ICRyb3V0ZVBhcmFtcy51aWQ7XG5cdGN0cmwudCA9IHtcblx0XHRub0NvbnRhY3RzIDogdCgnY29udGFjdHMnLCAnTm8gY29udGFjdHMgaW4gaGVyZScpLFxuXHRcdHBsYWNlaG9sZGVyTmFtZSA6IHQoJ2NvbnRhY3RzJywgJ05hbWUnKSxcblx0XHRwbGFjZWhvbGRlck9yZyA6IHQoJ2NvbnRhY3RzJywgJ09yZ2FuaXphdGlvbicpLFxuXHRcdHBsYWNlaG9sZGVyVGl0bGUgOiB0KCdjb250YWN0cycsICdUaXRsZScpLFxuXHRcdHNlbGVjdEZpZWxkIDogdCgnY29udGFjdHMnLCAnQWRkIGZpZWxkIC4uLicpXG5cdH07XG5cblx0Y3RybC5maWVsZERlZmluaXRpb25zID0gdkNhcmRQcm9wZXJ0aWVzU2VydmljZS5maWVsZERlZmluaXRpb25zO1xuXHRjdHJsLmZvY3VzID0gdW5kZWZpbmVkO1xuXHRjdHJsLmZpZWxkID0gdW5kZWZpbmVkO1xuXHRjdHJsLmFkZHJlc3NCb29rcyA9IFtdO1xuXG5cdEFkZHJlc3NCb29rU2VydmljZS5nZXRBbGwoKS50aGVuKGZ1bmN0aW9uKGFkZHJlc3NCb29rcykge1xuXHRcdGN0cmwuYWRkcmVzc0Jvb2tzID0gYWRkcmVzc0Jvb2tzO1xuXG5cdFx0aWYgKCFfLmlzVW5kZWZpbmVkKGN0cmwuY29udGFjdCkpIHtcblx0XHRcdGN0cmwuYWRkcmVzc0Jvb2sgPSBfLmZpbmQoY3RybC5hZGRyZXNzQm9va3MsIGZ1bmN0aW9uKGJvb2spIHtcblx0XHRcdFx0cmV0dXJuIGJvb2suZGlzcGxheU5hbWUgPT09IGN0cmwuY29udGFjdC5hZGRyZXNzQm9va0lkO1xuXHRcdFx0fSk7XG5cdFx0fVxuXHRcdGN0cmwubG9hZGluZyA9IGZhbHNlO1xuXHR9KTtcblxuXHQkc2NvcGUuJHdhdGNoKCdjdHJsLnVpZCcsIGZ1bmN0aW9uKG5ld1ZhbHVlKSB7XG5cdFx0Y3RybC5jaGFuZ2VDb250YWN0KG5ld1ZhbHVlKTtcblx0fSk7XG5cblx0Y3RybC5jaGFuZ2VDb250YWN0ID0gZnVuY3Rpb24odWlkKSB7XG5cdFx0aWYgKHR5cGVvZiB1aWQgPT09ICd1bmRlZmluZWQnKSB7XG5cdFx0XHRjdHJsLnNob3cgPSBmYWxzZTtcblx0XHRcdCQoJyNhcHAtbmF2aWdhdGlvbi10b2dnbGUnKS5yZW1vdmVDbGFzcygnc2hvd2RldGFpbHMnKTtcblx0XHRcdHJldHVybjtcblx0XHR9XG5cdFx0Q29udGFjdFNlcnZpY2UuZ2V0QnlJZCh1aWQpLnRoZW4oZnVuY3Rpb24oY29udGFjdCkge1xuXHRcdFx0aWYgKGFuZ3VsYXIuaXNVbmRlZmluZWQoY29udGFjdCkpIHtcblx0XHRcdFx0Y3RybC5jbGVhckNvbnRhY3QoKTtcblx0XHRcdFx0cmV0dXJuO1xuXHRcdFx0fVxuXHRcdFx0Y3RybC5jb250YWN0ID0gY29udGFjdDtcblx0XHRcdGN0cmwuc2hvdyA9IHRydWU7XG5cdFx0XHQkKCcjYXBwLW5hdmlnYXRpb24tdG9nZ2xlJykuYWRkQ2xhc3MoJ3Nob3dkZXRhaWxzJyk7XG5cblx0XHRcdGN0cmwuYWRkcmVzc0Jvb2sgPSBfLmZpbmQoY3RybC5hZGRyZXNzQm9va3MsIGZ1bmN0aW9uKGJvb2spIHtcblx0XHRcdFx0cmV0dXJuIGJvb2suZGlzcGxheU5hbWUgPT09IGN0cmwuY29udGFjdC5hZGRyZXNzQm9va0lkO1xuXHRcdFx0fSk7XG5cdFx0fSk7XG5cdH07XG5cblx0Y3RybC51cGRhdGVDb250YWN0ID0gZnVuY3Rpb24oKSB7XG5cdFx0Q29udGFjdFNlcnZpY2UudXBkYXRlKGN0cmwuY29udGFjdCk7XG5cdH07XG5cblx0Y3RybC5kZWxldGVDb250YWN0ID0gZnVuY3Rpb24oKSB7XG5cdFx0Q29udGFjdFNlcnZpY2UuZGVsZXRlKGN0cmwuY29udGFjdCk7XG5cdH07XG5cblx0Y3RybC5hZGRGaWVsZCA9IGZ1bmN0aW9uKGZpZWxkKSB7XG5cdFx0dmFyIGRlZmF1bHRWYWx1ZSA9IHZDYXJkUHJvcGVydGllc1NlcnZpY2UuZ2V0TWV0YShmaWVsZCkuZGVmYXVsdFZhbHVlIHx8IHt2YWx1ZTogJyd9O1xuXHRcdGN0cmwuY29udGFjdC5hZGRQcm9wZXJ0eShmaWVsZCwgZGVmYXVsdFZhbHVlKTtcblx0XHRjdHJsLmZvY3VzID0gZmllbGQ7XG5cdFx0Y3RybC5maWVsZCA9ICcnO1xuXHR9O1xuXG5cdGN0cmwuZGVsZXRlRmllbGQgPSBmdW5jdGlvbiAoZmllbGQsIHByb3ApIHtcblx0XHRjdHJsLmNvbnRhY3QucmVtb3ZlUHJvcGVydHkoZmllbGQsIHByb3ApO1xuXHRcdGN0cmwuZm9jdXMgPSB1bmRlZmluZWQ7XG5cdH07XG5cblx0Y3RybC5jaGFuZ2VBZGRyZXNzQm9vayA9IGZ1bmN0aW9uIChhZGRyZXNzQm9vaykge1xuXHRcdENvbnRhY3RTZXJ2aWNlLm1vdmVDb250YWN0KGN0cmwuY29udGFjdCwgYWRkcmVzc0Jvb2spO1xuXHR9O1xufSk7XG4iLCJhbmd1bGFyLm1vZHVsZSgnY29udGFjdHNBcHAnKVxuLmRpcmVjdGl2ZSgnY29udGFjdGRldGFpbHMnLCBmdW5jdGlvbigpIHtcblx0cmV0dXJuIHtcblx0XHRwcmlvcml0eTogMSxcblx0XHRzY29wZToge30sXG5cdFx0Y29udHJvbGxlcjogJ2NvbnRhY3RkZXRhaWxzQ3RybCcsXG5cdFx0Y29udHJvbGxlckFzOiAnY3RybCcsXG5cdFx0YmluZFRvQ29udHJvbGxlcjoge30sXG5cdFx0dGVtcGxhdGVVcmw6IE9DLmxpbmtUbygnY29udGFjdHMnLCAndGVtcGxhdGVzL2NvbnRhY3REZXRhaWxzLmh0bWwnKVxuXHR9O1xufSk7XG4iLCJhbmd1bGFyLm1vZHVsZSgnY29udGFjdHNBcHAnKVxuLmNvbnRyb2xsZXIoJ2NvbnRhY3RpbXBvcnRDdHJsJywgZnVuY3Rpb24oQ29udGFjdFNlcnZpY2UpIHtcblx0dmFyIGN0cmwgPSB0aGlzO1xuXG5cdGN0cmwuaW1wb3J0ID0gQ29udGFjdFNlcnZpY2UuaW1wb3J0LmJpbmQoQ29udGFjdFNlcnZpY2UpO1xuXG59KTtcbiIsImFuZ3VsYXIubW9kdWxlKCdjb250YWN0c0FwcCcpXG4uZGlyZWN0aXZlKCdjb250YWN0aW1wb3J0JywgZnVuY3Rpb24oQ29udGFjdFNlcnZpY2UpIHtcblx0cmV0dXJuIHtcblx0XHRsaW5rOiBmdW5jdGlvbihzY29wZSwgZWxlbWVudCkge1xuXHRcdFx0dmFyIGltcG9ydFRleHQgPSB0KCdjb250YWN0cycsICdJbXBvcnQnKTtcblx0XHRcdHNjb3BlLmltcG9ydFRleHQgPSBpbXBvcnRUZXh0O1xuXG5cdFx0XHR2YXIgaW5wdXQgPSBlbGVtZW50LmZpbmQoJ2lucHV0Jyk7XG5cdFx0XHRpbnB1dC5iaW5kKCdjaGFuZ2UnLCBmdW5jdGlvbigpIHtcblx0XHRcdFx0dmFyIGZpbGUgPSBpbnB1dC5nZXQoMCkuZmlsZXNbMF07XG5cdFx0XHRcdHZhciByZWFkZXIgPSBuZXcgRmlsZVJlYWRlcigpO1xuXG5cdFx0XHRcdHJlYWRlci5hZGRFdmVudExpc3RlbmVyKCdsb2FkJywgZnVuY3Rpb24gKCkge1xuXHRcdFx0XHRcdHNjb3BlLiRhcHBseShmdW5jdGlvbigpIHtcblx0XHRcdFx0XHRcdENvbnRhY3RTZXJ2aWNlLmltcG9ydC5jYWxsKENvbnRhY3RTZXJ2aWNlLCByZWFkZXIucmVzdWx0LCBmaWxlLnR5cGUsIG51bGwsIGZ1bmN0aW9uKHByb2dyZXNzKSB7XG5cdFx0XHRcdFx0XHRcdGlmKHByb2dyZXNzPT09MSkge1xuXHRcdFx0XHRcdFx0XHRcdHNjb3BlLmltcG9ydFRleHQgPSBpbXBvcnRUZXh0O1xuXHRcdFx0XHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdFx0XHRcdHNjb3BlLmltcG9ydFRleHQgPSBwYXJzZUludChNYXRoLmZsb29yKHByb2dyZXNzKjEwMCkpKyclJztcblx0XHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0fSk7XG5cdFx0XHRcdFx0fSk7XG5cdFx0XHRcdH0sIGZhbHNlKTtcblxuXHRcdFx0XHRpZiAoZmlsZSkge1xuXHRcdFx0XHRcdHJlYWRlci5yZWFkQXNUZXh0KGZpbGUpO1xuXHRcdFx0XHR9XG5cdFx0XHR9KTtcblx0XHR9LFxuXHRcdHRlbXBsYXRlVXJsOiBPQy5saW5rVG8oJ2NvbnRhY3RzJywgJ3RlbXBsYXRlcy9jb250YWN0SW1wb3J0Lmh0bWwnKVxuXHR9O1xufSk7XG4iLCJhbmd1bGFyLm1vZHVsZSgnY29udGFjdHNBcHAnKVxuLmNvbnRyb2xsZXIoJ2NvbnRhY3RsaXN0Q3RybCcsIGZ1bmN0aW9uKCRzY29wZSwgJGZpbHRlciwgJHJvdXRlLCAkcm91dGVQYXJhbXMsIENvbnRhY3RTZXJ2aWNlLCB2Q2FyZFByb3BlcnRpZXNTZXJ2aWNlLCBTZWFyY2hTZXJ2aWNlKSB7XG5cdHZhciBjdHJsID0gdGhpcztcblxuXHRjdHJsLnJvdXRlUGFyYW1zID0gJHJvdXRlUGFyYW1zO1xuXG5cdGN0cmwuY29udGFjdExpc3QgPSBbXTtcblx0Y3RybC5zZWFyY2hUZXJtID0gJyc7XG5cdGN0cmwuc2hvdyA9IHRydWU7XG5cdGN0cmwuaW52YWxpZCA9IGZhbHNlO1xuXG5cdGN0cmwudCA9IHtcblx0XHRhZGRDb250YWN0IDogdCgnY29udGFjdHMnLCAnQWRkIGNvbnRhY3QnKSxcblx0XHRlbXB0eVNlYXJjaCA6IHQoJ2NvbnRhY3RzJywgJ05vIHNlYXJjaCByZXN1bHQgZm9yIHtxdWVyeX0nLCB7cXVlcnk6IGN0cmwuc2VhcmNoVGVybX0pXG5cdH07XG5cblxuXHQkc2NvcGUucXVlcnkgPSBmdW5jdGlvbihjb250YWN0KSB7XG5cdFx0cmV0dXJuIGNvbnRhY3QubWF0Y2hlcyhTZWFyY2hTZXJ2aWNlLmdldFNlYXJjaFRlcm0oKSk7XG5cdH07XG5cblx0U2VhcmNoU2VydmljZS5yZWdpc3Rlck9ic2VydmVyQ2FsbGJhY2soZnVuY3Rpb24oZXYpIHtcblx0XHRpZiAoZXYuZXZlbnQgPT09ICdzdWJtaXRTZWFyY2gnKSB7XG5cdFx0XHR2YXIgdWlkID0gIV8uaXNFbXB0eShjdHJsLmNvbnRhY3RMaXN0KSA/IGN0cmwuY29udGFjdExpc3RbMF0udWlkKCkgOiB1bmRlZmluZWQ7XG5cdFx0XHRjdHJsLnNldFNlbGVjdGVkSWQodWlkKTtcblx0XHRcdCRzY29wZS4kYXBwbHkoKTtcblx0XHR9XG5cdFx0aWYgKGV2LmV2ZW50ID09PSAnY2hhbmdlU2VhcmNoJykge1xuXHRcdFx0Y3RybC5zZWFyY2hUZXJtID0gZXYuc2VhcmNoVGVybTtcblx0XHRcdGN0cmwudC5lbXB0eVNlYXJjaCA9IHQoJ2NvbnRhY3RzJyxcblx0XHRcdFx0XHRcdFx0XHQgICAnTm8gc2VhcmNoIHJlc3VsdCBmb3Ige3F1ZXJ5fScsXG5cdFx0XHRcdFx0XHRcdFx0ICAge3F1ZXJ5OiBjdHJsLnNlYXJjaFRlcm19XG5cdFx0XHRcdFx0XHRcdFx0ICApO1xuXHRcdFx0JHNjb3BlLiRhcHBseSgpO1xuXHRcdH1cblx0fSk7XG5cblx0Y3RybC5sb2FkaW5nID0gdHJ1ZTtcblxuXHRDb250YWN0U2VydmljZS5yZWdpc3Rlck9ic2VydmVyQ2FsbGJhY2soZnVuY3Rpb24oZXYpIHtcblx0XHQkc2NvcGUuJGFwcGx5KGZ1bmN0aW9uKCkge1xuXHRcdFx0aWYgKGV2LmV2ZW50ID09PSAnZGVsZXRlJykge1xuXHRcdFx0XHRpZiAoY3RybC5jb250YWN0TGlzdC5sZW5ndGggPT09IDEpIHtcblx0XHRcdFx0XHQkcm91dGUudXBkYXRlUGFyYW1zKHtcblx0XHRcdFx0XHRcdGdpZDogJHJvdXRlUGFyYW1zLmdpZCxcblx0XHRcdFx0XHRcdHVpZDogdW5kZWZpbmVkXG5cdFx0XHRcdFx0fSk7XG5cdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0Zm9yICh2YXIgaSA9IDAsIGxlbmd0aCA9IGN0cmwuY29udGFjdExpc3QubGVuZ3RoOyBpIDwgbGVuZ3RoOyBpKyspIHtcblx0XHRcdFx0XHRcdGlmIChjdHJsLmNvbnRhY3RMaXN0W2ldLnVpZCgpID09PSBldi51aWQpIHtcblx0XHRcdFx0XHRcdFx0JHJvdXRlLnVwZGF0ZVBhcmFtcyh7XG5cdFx0XHRcdFx0XHRcdFx0Z2lkOiAkcm91dGVQYXJhbXMuZ2lkLFxuXHRcdFx0XHRcdFx0XHRcdHVpZDogKGN0cmwuY29udGFjdExpc3RbaSsxXSkgPyBjdHJsLmNvbnRhY3RMaXN0W2krMV0udWlkKCkgOiBjdHJsLmNvbnRhY3RMaXN0W2ktMV0udWlkKClcblx0XHRcdFx0XHRcdFx0fSk7XG5cdFx0XHRcdFx0XHRcdGJyZWFrO1xuXHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdH1cblx0XHRcdFx0fVxuXHRcdFx0fVxuXHRcdFx0ZWxzZSBpZiAoZXYuZXZlbnQgPT09ICdjcmVhdGUnKSB7XG5cdFx0XHRcdCRyb3V0ZS51cGRhdGVQYXJhbXMoe1xuXHRcdFx0XHRcdGdpZDogJHJvdXRlUGFyYW1zLmdpZCxcblx0XHRcdFx0XHR1aWQ6IGV2LnVpZFxuXHRcdFx0XHR9KTtcblx0XHRcdH1cblx0XHRcdGN0cmwuY29udGFjdHMgPSBldi5jb250YWN0cztcblx0XHR9KTtcblx0fSk7XG5cblx0Ly8gR2V0IGNvbnRhY3RzXG5cdENvbnRhY3RTZXJ2aWNlLmdldEFsbCgpLnRoZW4oZnVuY3Rpb24oY29udGFjdHMpIHtcblx0XHRpZihjb250YWN0cy5sZW5ndGg+MCkge1xuXHRcdFx0JHNjb3BlLiRhcHBseShmdW5jdGlvbigpIHtcblx0XHRcdFx0Y3RybC5jb250YWN0cyA9IGNvbnRhY3RzO1xuXHRcdFx0fSk7XG5cdFx0fSBlbHNlIHtcblx0XHRcdGN0cmwubG9hZGluZyA9IGZhbHNlO1xuXHRcdH1cblx0fSk7XG5cblx0Ly8gV2FpdCBmb3IgY3RybC5jb250YWN0TGlzdCB0byBiZSB1cGRhdGVkLCBsb2FkIHRoZSBmaXJzdCBjb250YWN0IGFuZCBraWxsIHRoZSB3YXRjaFxuXHR2YXIgdW5iaW5kTGlzdFdhdGNoID0gJHNjb3BlLiR3YXRjaCgnY3RybC5jb250YWN0TGlzdCcsIGZ1bmN0aW9uKCkge1xuXHRcdGlmKGN0cmwuY29udGFjdExpc3QgJiYgY3RybC5jb250YWN0TGlzdC5sZW5ndGggPiAwKSB7XG5cdFx0XHQvLyBDaGVjayBpZiBhIHNwZWNpZmljIHVpZCBpcyByZXF1ZXN0ZWRcblx0XHRcdGlmKCRyb3V0ZVBhcmFtcy51aWQgJiYgJHJvdXRlUGFyYW1zLmdpZCkge1xuXHRcdFx0XHRjdHJsLmNvbnRhY3RMaXN0LmZvckVhY2goZnVuY3Rpb24oY29udGFjdCkge1xuXHRcdFx0XHRcdGlmKGNvbnRhY3QudWlkKCkgPT09ICRyb3V0ZVBhcmFtcy51aWQpIHtcblx0XHRcdFx0XHRcdGN0cmwuc2V0U2VsZWN0ZWRJZCgkcm91dGVQYXJhbXMudWlkKTtcblx0XHRcdFx0XHRcdGN0cmwubG9hZGluZyA9IGZhbHNlO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0fSk7XG5cdFx0XHR9XG5cdFx0XHQvLyBObyBjb250YWN0IHByZXZpb3VzbHkgbG9hZGVkLCBsZXQncyBsb2FkIHRoZSBmaXJzdCBvZiB0aGUgbGlzdCBpZiBub3QgaW4gbW9iaWxlIG1vZGVcblx0XHRcdGlmKGN0cmwubG9hZGluZyAmJiAkKHdpbmRvdykud2lkdGgoKSA+IDc2OCkge1xuXHRcdFx0XHRjdHJsLnNldFNlbGVjdGVkSWQoY3RybC5jb250YWN0TGlzdFswXS51aWQoKSk7XG5cdFx0XHR9XG5cdFx0XHRjdHJsLmxvYWRpbmcgPSBmYWxzZTtcblx0XHRcdHVuYmluZExpc3RXYXRjaCgpO1xuXHRcdH1cblx0fSk7XG5cblx0JHNjb3BlLiR3YXRjaCgnY3RybC5yb3V0ZVBhcmFtcy51aWQnLCBmdW5jdGlvbihuZXdWYWx1ZSwgb2xkVmFsdWUpIHtcblx0XHQvLyBVc2VkIGZvciBtb2JpbGUgdmlldyB0byBjbGVhciB0aGUgdXJsXG5cdFx0aWYodHlwZW9mIG9sZFZhbHVlICE9ICd1bmRlZmluZWQnICYmIHR5cGVvZiBuZXdWYWx1ZSA9PSAndW5kZWZpbmVkJyAmJiAkKHdpbmRvdykud2lkdGgoKSA8PSA3NjgpIHtcblx0XHRcdC8vIG5vIGNvbnRhY3Qgc2VsZWN0ZWRcblx0XHRcdGN0cmwuc2hvdyA9IHRydWU7XG5cdFx0XHRyZXR1cm47XG5cdFx0fVxuXHRcdGlmKG5ld1ZhbHVlID09PSB1bmRlZmluZWQpIHtcblx0XHRcdC8vIHdlIG1pZ2h0IGhhdmUgdG8gd2FpdCB1bnRpbCBuZy1yZXBlYXQgZmlsbGVkIHRoZSBjb250YWN0TGlzdFxuXHRcdFx0aWYoY3RybC5jb250YWN0TGlzdCAmJiBjdHJsLmNvbnRhY3RMaXN0Lmxlbmd0aCA+IDApIHtcblx0XHRcdFx0JHJvdXRlLnVwZGF0ZVBhcmFtcyh7XG5cdFx0XHRcdFx0Z2lkOiAkcm91dGVQYXJhbXMuZ2lkLFxuXHRcdFx0XHRcdHVpZDogY3RybC5jb250YWN0TGlzdFswXS51aWQoKVxuXHRcdFx0XHR9KTtcblx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdC8vIHdhdGNoIGZvciBuZXh0IGNvbnRhY3RMaXN0IHVwZGF0ZVxuXHRcdFx0XHR2YXIgdW5iaW5kV2F0Y2ggPSAkc2NvcGUuJHdhdGNoKCdjdHJsLmNvbnRhY3RMaXN0JywgZnVuY3Rpb24oKSB7XG5cdFx0XHRcdFx0aWYoY3RybC5jb250YWN0TGlzdCAmJiBjdHJsLmNvbnRhY3RMaXN0Lmxlbmd0aCA+IDApIHtcblx0XHRcdFx0XHRcdCRyb3V0ZS51cGRhdGVQYXJhbXMoe1xuXHRcdFx0XHRcdFx0XHRnaWQ6ICRyb3V0ZVBhcmFtcy5naWQsXG5cdFx0XHRcdFx0XHRcdHVpZDogY3RybC5jb250YWN0TGlzdFswXS51aWQoKVxuXHRcdFx0XHRcdFx0fSk7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHRcdHVuYmluZFdhdGNoKCk7IC8vIHVuYmluZCBhcyB3ZSBvbmx5IHdhbnQgb25lIHVwZGF0ZVxuXHRcdFx0XHR9KTtcblx0XHRcdH1cblx0XHR9IGVsc2Uge1xuXHRcdFx0Ly8gZGlzcGxheWluZyBjb250YWN0IGRldGFpbHNcblx0XHRcdGN0cmwuc2hvdyA9IGZhbHNlO1xuXHRcdH1cblx0fSk7XG5cblx0JHNjb3BlLiR3YXRjaCgnY3RybC5yb3V0ZVBhcmFtcy5naWQnLCBmdW5jdGlvbigpIHtcblx0XHQvLyB3ZSBtaWdodCBoYXZlIHRvIHdhaXQgdW50aWwgbmctcmVwZWF0IGZpbGxlZCB0aGUgY29udGFjdExpc3Rcblx0XHRjdHJsLmNvbnRhY3RMaXN0ID0gW107XG5cdFx0Ly8gbm90IGluIG1vYmlsZSBtb2RlXG5cdFx0aWYoJCh3aW5kb3cpLndpZHRoKCkgPiA3NjgpIHtcblx0XHRcdC8vIHdhdGNoIGZvciBuZXh0IGNvbnRhY3RMaXN0IHVwZGF0ZVxuXHRcdFx0dmFyIHVuYmluZFdhdGNoID0gJHNjb3BlLiR3YXRjaCgnY3RybC5jb250YWN0TGlzdCcsIGZ1bmN0aW9uKCkge1xuXHRcdFx0XHRpZihjdHJsLmNvbnRhY3RMaXN0ICYmIGN0cmwuY29udGFjdExpc3QubGVuZ3RoID4gMCkge1xuXHRcdFx0XHRcdCRyb3V0ZS51cGRhdGVQYXJhbXMoe1xuXHRcdFx0XHRcdFx0Z2lkOiAkcm91dGVQYXJhbXMuZ2lkLFxuXHRcdFx0XHRcdFx0dWlkOiBjdHJsLmNvbnRhY3RMaXN0WzBdLnVpZCgpXG5cdFx0XHRcdFx0fSk7XG5cdFx0XHRcdH1cblx0XHRcdFx0dW5iaW5kV2F0Y2goKTsgLy8gdW5iaW5kIGFzIHdlIG9ubHkgd2FudCBvbmUgdXBkYXRlXG5cdFx0XHR9KTtcblx0XHR9XG5cdH0pO1xuXG5cdC8vIFdhdGNoIGlmIHdlIGhhdmUgYW4gaW52YWxpZCBjb250YWN0XG5cdCRzY29wZS4kd2F0Y2goJ2N0cmwuY29udGFjdExpc3RbMF0uZGlzcGxheU5hbWUoKScsIGZ1bmN0aW9uKGRpc3BsYXlOYW1lKSB7XG5cdFx0Y3RybC5pbnZhbGlkID0gKGRpc3BsYXlOYW1lID09PSAnJyk7XG5cdH0pO1xuXG5cdGN0cmwuY3JlYXRlQ29udGFjdCA9IGZ1bmN0aW9uKCkge1xuXHRcdENvbnRhY3RTZXJ2aWNlLmNyZWF0ZSgpLnRoZW4oZnVuY3Rpb24oY29udGFjdCkge1xuXHRcdFx0Wyd0ZWwnLCAnYWRyJywgJ2VtYWlsJ10uZm9yRWFjaChmdW5jdGlvbihmaWVsZCkge1xuXHRcdFx0XHR2YXIgZGVmYXVsdFZhbHVlID0gdkNhcmRQcm9wZXJ0aWVzU2VydmljZS5nZXRNZXRhKGZpZWxkKS5kZWZhdWx0VmFsdWUgfHwge3ZhbHVlOiAnJ307XG5cdFx0XHRcdGNvbnRhY3QuYWRkUHJvcGVydHkoZmllbGQsIGRlZmF1bHRWYWx1ZSk7XG5cdFx0XHR9ICk7XG5cdFx0XHRpZiAoW3QoJ2NvbnRhY3RzJywgJ0FsbCBjb250YWN0cycpLCB0KCdjb250YWN0cycsICdOb3QgZ3JvdXBlZCcpXS5pbmRleE9mKCRyb3V0ZVBhcmFtcy5naWQpID09PSAtMSkge1xuXHRcdFx0XHRjb250YWN0LmNhdGVnb3JpZXMoJHJvdXRlUGFyYW1zLmdpZCk7XG5cdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRjb250YWN0LmNhdGVnb3JpZXMoJycpO1xuXHRcdFx0fVxuXHRcdFx0JCgnI2RldGFpbHMtZnVsbE5hbWUnKS5mb2N1cygpO1xuXHRcdH0pO1xuXHR9O1xuXG5cdGN0cmwuaGFzQ29udGFjdHMgPSBmdW5jdGlvbiAoKSB7XG5cdFx0aWYgKCFjdHJsLmNvbnRhY3RzKSB7XG5cdFx0XHRyZXR1cm4gZmFsc2U7XG5cdFx0fVxuXHRcdHJldHVybiBjdHJsLmNvbnRhY3RzLmxlbmd0aCA+IDA7XG5cdH07XG5cblx0Y3RybC5zZXRTZWxlY3RlZElkID0gZnVuY3Rpb24gKGNvbnRhY3RJZCkge1xuXHRcdCRyb3V0ZS51cGRhdGVQYXJhbXMoe1xuXHRcdFx0dWlkOiBjb250YWN0SWRcblx0XHR9KTtcblx0fTtcblxuXHRjdHJsLmdldFNlbGVjdGVkSWQgPSBmdW5jdGlvbigpIHtcblx0XHRyZXR1cm4gJHJvdXRlUGFyYW1zLnVpZDtcblx0fTtcblxufSk7XG4iLCJhbmd1bGFyLm1vZHVsZSgnY29udGFjdHNBcHAnKVxuLmRpcmVjdGl2ZSgnY29udGFjdGxpc3QnLCBmdW5jdGlvbigpIHtcblx0cmV0dXJuIHtcblx0XHRwcmlvcml0eTogMSxcblx0XHRzY29wZToge30sXG5cdFx0Y29udHJvbGxlcjogJ2NvbnRhY3RsaXN0Q3RybCcsXG5cdFx0Y29udHJvbGxlckFzOiAnY3RybCcsXG5cdFx0YmluZFRvQ29udHJvbGxlcjoge1xuXHRcdFx0YWRkcmVzc2Jvb2s6ICc9YWRyYm9vaydcblx0XHR9LFxuXHRcdHRlbXBsYXRlVXJsOiBPQy5saW5rVG8oJ2NvbnRhY3RzJywgJ3RlbXBsYXRlcy9jb250YWN0TGlzdC5odG1sJylcblx0fTtcbn0pO1xuIiwiYW5ndWxhci5tb2R1bGUoJ2NvbnRhY3RzQXBwJylcbi5jb250cm9sbGVyKCdkZXRhaWxzSXRlbUN0cmwnLCBmdW5jdGlvbigkdGVtcGxhdGVSZXF1ZXN0LCB2Q2FyZFByb3BlcnRpZXNTZXJ2aWNlLCBDb250YWN0U2VydmljZSkge1xuXHR2YXIgY3RybCA9IHRoaXM7XG5cblx0Y3RybC5tZXRhID0gdkNhcmRQcm9wZXJ0aWVzU2VydmljZS5nZXRNZXRhKGN0cmwubmFtZSk7XG5cdGN0cmwudHlwZSA9IHVuZGVmaW5lZDtcblx0Y3RybC5pc1ByZWZlcnJlZCA9IGZhbHNlO1xuXHRjdHJsLnQgPSB7XG5cdFx0cG9Cb3ggOiB0KCdjb250YWN0cycsICdQb3N0IE9mZmljZSBCb3gnKSxcblx0XHRwb3N0YWxDb2RlIDogdCgnY29udGFjdHMnLCAnUG9zdGFsIENvZGUnKSxcblx0XHRjaXR5IDogdCgnY29udGFjdHMnLCAnQ2l0eScpLFxuXHRcdHN0YXRlIDogdCgnY29udGFjdHMnLCAnU3RhdGUgb3IgcHJvdmluY2UnKSxcblx0XHRjb3VudHJ5IDogdCgnY29udGFjdHMnLCAnQ291bnRyeScpLFxuXHRcdGFkZHJlc3M6IHQoJ2NvbnRhY3RzJywgJ0FkZHJlc3MnKSxcblx0XHRuZXdHcm91cDogdCgnY29udGFjdHMnLCAnKG5ldyBncm91cCknKVxuXHR9O1xuXG5cdGN0cmwuYXZhaWxhYmxlT3B0aW9ucyA9IGN0cmwubWV0YS5vcHRpb25zIHx8IFtdO1xuXHRpZiAoIV8uaXNVbmRlZmluZWQoY3RybC5kYXRhKSAmJiAhXy5pc1VuZGVmaW5lZChjdHJsLmRhdGEubWV0YSkgJiYgIV8uaXNVbmRlZmluZWQoY3RybC5kYXRhLm1ldGEudHlwZSkpIHtcblx0XHQvLyBwYXJzZSB0eXBlIG9mIHRoZSBwcm9wZXJ0eVxuXHRcdHZhciBhcnJheSA9IGN0cmwuZGF0YS5tZXRhLnR5cGVbMF0uc3BsaXQoJywnKTtcblx0XHRhcnJheSA9IGFycmF5Lm1hcChmdW5jdGlvbiAoZWxlbSkge1xuXHRcdFx0cmV0dXJuIGVsZW0udHJpbSgpLnJlcGxhY2UoL1xcLyskLywgJycpLnJlcGxhY2UoL1xcXFwrJC8sICcnKS50cmltKCkudG9VcHBlckNhc2UoKTtcblx0XHR9KTtcblx0XHQvLyB0aGUgcHJlZiB2YWx1ZSBpcyBoYW5kbGVkIG9uIGl0cyBvd24gc28gdGhhdCB3ZSBjYW4gYWRkIHNvbWUgZmF2b3JpdGUgaWNvbiB0byB0aGUgdWkgaWYgd2Ugd2FudFxuXHRcdGlmIChhcnJheS5pbmRleE9mKCdQUkVGJykgPj0gMCkge1xuXHRcdFx0Y3RybC5pc1ByZWZlcnJlZCA9IHRydWU7XG5cdFx0XHRhcnJheS5zcGxpY2UoYXJyYXkuaW5kZXhPZignUFJFRicpLCAxKTtcblx0XHR9XG5cdFx0Ly8gc2ltcGx5IGpvaW4gdGhlIHVwcGVyIGNhc2VkIHR5cGVzIHRvZ2V0aGVyIGFzIGtleVxuXHRcdGN0cmwudHlwZSA9IGFycmF5LmpvaW4oJywnKTtcblx0XHR2YXIgZGlzcGxheU5hbWUgPSBhcnJheS5tYXAoZnVuY3Rpb24gKGVsZW1lbnQpIHtcblx0XHRcdHJldHVybiBlbGVtZW50LmNoYXJBdCgwKS50b1VwcGVyQ2FzZSgpICsgZWxlbWVudC5zbGljZSgxKS50b0xvd2VyQ2FzZSgpO1xuXHRcdH0pLmpvaW4oJyAnKTtcblxuXHRcdC8vIGluIGNhc2UgdGhlIHR5cGUgaXMgbm90IHlldCBpbiB0aGUgZGVmYXVsdCBsaXN0IG9mIGF2YWlsYWJsZSBvcHRpb25zIHdlIGFkZCBpdFxuXHRcdGlmICghY3RybC5hdmFpbGFibGVPcHRpb25zLnNvbWUoZnVuY3Rpb24oZSkgeyByZXR1cm4gZS5pZCA9PT0gY3RybC50eXBlOyB9ICkpIHtcblx0XHRcdGN0cmwuYXZhaWxhYmxlT3B0aW9ucyA9IGN0cmwuYXZhaWxhYmxlT3B0aW9ucy5jb25jYXQoW3tpZDogY3RybC50eXBlLCBuYW1lOiBkaXNwbGF5TmFtZX1dKTtcblx0XHR9XG5cdH1cblx0Y3RybC5hdmFpbGFibGVHcm91cHMgPSBbXTtcblxuXHRDb250YWN0U2VydmljZS5nZXRHcm91cHMoKS50aGVuKGZ1bmN0aW9uKGdyb3Vwcykge1xuXHRcdGN0cmwuYXZhaWxhYmxlR3JvdXBzID0gXy51bmlxdWUoZ3JvdXBzKTtcblx0fSk7XG5cblx0Y3RybC5jaGFuZ2VUeXBlID0gZnVuY3Rpb24gKHZhbCkge1xuXHRcdGlmIChjdHJsLmlzUHJlZmVycmVkKSB7XG5cdFx0XHR2YWwgKz0gJyxQUkVGJztcblx0XHR9XG5cdFx0Y3RybC5kYXRhLm1ldGEgPSBjdHJsLmRhdGEubWV0YSB8fCB7fTtcblx0XHRjdHJsLmRhdGEubWV0YS50eXBlID0gY3RybC5kYXRhLm1ldGEudHlwZSB8fCBbXTtcblx0XHRjdHJsLmRhdGEubWV0YS50eXBlWzBdID0gdmFsO1xuXHRcdGN0cmwubW9kZWwudXBkYXRlQ29udGFjdCgpO1xuXHR9O1xuXG5cdGN0cmwuZ2V0VGVtcGxhdGUgPSBmdW5jdGlvbigpIHtcblx0XHR2YXIgdGVtcGxhdGVVcmwgPSBPQy5saW5rVG8oJ2NvbnRhY3RzJywgJ3RlbXBsYXRlcy9kZXRhaWxJdGVtcy8nICsgY3RybC5tZXRhLnRlbXBsYXRlICsgJy5odG1sJyk7XG5cdFx0cmV0dXJuICR0ZW1wbGF0ZVJlcXVlc3QodGVtcGxhdGVVcmwpO1xuXHR9O1xuXG5cdGN0cmwuZGVsZXRlRmllbGQgPSBmdW5jdGlvbiAoKSB7XG5cdFx0Y3RybC5tb2RlbC5kZWxldGVGaWVsZChjdHJsLm5hbWUsIGN0cmwuZGF0YSk7XG5cdFx0Y3RybC5tb2RlbC51cGRhdGVDb250YWN0KCk7XG5cdH07XG59KTtcbiIsImFuZ3VsYXIubW9kdWxlKCdjb250YWN0c0FwcCcpXG4uZGlyZWN0aXZlKCdkZXRhaWxzaXRlbScsIFsnJGNvbXBpbGUnLCBmdW5jdGlvbigkY29tcGlsZSkge1xuXHRyZXR1cm4ge1xuXHRcdHNjb3BlOiB7fSxcblx0XHRjb250cm9sbGVyOiAnZGV0YWlsc0l0ZW1DdHJsJyxcblx0XHRjb250cm9sbGVyQXM6ICdjdHJsJyxcblx0XHRiaW5kVG9Db250cm9sbGVyOiB7XG5cdFx0XHRuYW1lOiAnPScsXG5cdFx0XHRkYXRhOiAnPScsXG5cdFx0XHRtb2RlbDogJz0nXG5cdFx0fSxcblx0XHRsaW5rOiBmdW5jdGlvbihzY29wZSwgZWxlbWVudCwgYXR0cnMsIGN0cmwpIHtcblx0XHRcdGN0cmwuZ2V0VGVtcGxhdGUoKS50aGVuKGZ1bmN0aW9uKGh0bWwpIHtcblx0XHRcdFx0dmFyIHRlbXBsYXRlID0gYW5ndWxhci5lbGVtZW50KGh0bWwpO1xuXHRcdFx0XHRlbGVtZW50LmFwcGVuZCh0ZW1wbGF0ZSk7XG5cdFx0XHRcdCRjb21waWxlKHRlbXBsYXRlKShzY29wZSk7XG5cdFx0XHR9KTtcblx0XHR9XG5cdH07XG59XSk7XG4iLCJhbmd1bGFyLm1vZHVsZSgnY29udGFjdHNBcHAnKVxuLmNvbnRyb2xsZXIoJ2dyb3VwQ3RybCcsIGZ1bmN0aW9uKCkge1xuXHQvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgbm8tdW51c2VkLXZhcnNcblx0dmFyIGN0cmwgPSB0aGlzO1xufSk7XG4iLCJhbmd1bGFyLm1vZHVsZSgnY29udGFjdHNBcHAnKVxuLmRpcmVjdGl2ZSgnZ3JvdXAnLCBmdW5jdGlvbigpIHtcblx0cmV0dXJuIHtcblx0XHRyZXN0cmljdDogJ0EnLCAvLyBoYXMgdG8gYmUgYW4gYXR0cmlidXRlIHRvIHdvcmsgd2l0aCBjb3JlIGNzc1xuXHRcdHNjb3BlOiB7fSxcblx0XHRjb250cm9sbGVyOiAnZ3JvdXBDdHJsJyxcblx0XHRjb250cm9sbGVyQXM6ICdjdHJsJyxcblx0XHRiaW5kVG9Db250cm9sbGVyOiB7XG5cdFx0XHRncm91cDogJz1kYXRhJ1xuXHRcdH0sXG5cdFx0dGVtcGxhdGVVcmw6IE9DLmxpbmtUbygnY29udGFjdHMnLCAndGVtcGxhdGVzL2dyb3VwLmh0bWwnKVxuXHR9O1xufSk7XG4iLCJhbmd1bGFyLm1vZHVsZSgnY29udGFjdHNBcHAnKVxuLmNvbnRyb2xsZXIoJ2dyb3VwbGlzdEN0cmwnLCBmdW5jdGlvbigkc2NvcGUsIENvbnRhY3RTZXJ2aWNlLCBTZWFyY2hTZXJ2aWNlLCAkcm91dGVQYXJhbXMpIHtcblx0dmFyIGN0cmwgPSB0aGlzO1xuXG5cdHZhciBpbml0aWFsR3JvdXBzID0gW3QoJ2NvbnRhY3RzJywgJ0FsbCBjb250YWN0cycpLCB0KCdjb250YWN0cycsICdOb3QgZ3JvdXBlZCcpXTtcblxuXHRjdHJsLmdyb3VwcyA9IGluaXRpYWxHcm91cHM7XG5cblx0Q29udGFjdFNlcnZpY2UuZ2V0R3JvdXBzKCkudGhlbihmdW5jdGlvbihncm91cHMpIHtcblx0XHRjdHJsLmdyb3VwcyA9IF8udW5pcXVlKGluaXRpYWxHcm91cHMuY29uY2F0KGdyb3VwcykpO1xuXHR9KTtcblxuXHRjdHJsLmdldFNlbGVjdGVkID0gZnVuY3Rpb24oKSB7XG5cdFx0cmV0dXJuICRyb3V0ZVBhcmFtcy5naWQ7XG5cdH07XG5cblx0Ly8gVXBkYXRlIGdyb3VwTGlzdCBvbiBjb250YWN0IGFkZC9kZWxldGUvdXBkYXRlXG5cdENvbnRhY3RTZXJ2aWNlLnJlZ2lzdGVyT2JzZXJ2ZXJDYWxsYmFjayhmdW5jdGlvbigpIHtcblx0XHQkc2NvcGUuJGFwcGx5KGZ1bmN0aW9uKCkge1xuXHRcdFx0Q29udGFjdFNlcnZpY2UuZ2V0R3JvdXBzKCkudGhlbihmdW5jdGlvbihncm91cHMpIHtcblx0XHRcdFx0Y3RybC5ncm91cHMgPSBfLnVuaXF1ZShpbml0aWFsR3JvdXBzLmNvbmNhdChncm91cHMpKTtcblx0XHRcdH0pO1xuXHRcdH0pO1xuXHR9KTtcblxuXHRjdHJsLnNldFNlbGVjdGVkID0gZnVuY3Rpb24gKHNlbGVjdGVkR3JvdXApIHtcblx0XHRTZWFyY2hTZXJ2aWNlLmNsZWFuU2VhcmNoKCk7XG5cdFx0JHJvdXRlUGFyYW1zLmdpZCA9IHNlbGVjdGVkR3JvdXA7XG5cdH07XG59KTtcbiIsImFuZ3VsYXIubW9kdWxlKCdjb250YWN0c0FwcCcpXG4uZGlyZWN0aXZlKCdncm91cGxpc3QnLCBmdW5jdGlvbigpIHtcblx0cmV0dXJuIHtcblx0XHRyZXN0cmljdDogJ0VBJywgLy8gaGFzIHRvIGJlIGFuIGF0dHJpYnV0ZSB0byB3b3JrIHdpdGggY29yZSBjc3Ncblx0XHRzY29wZToge30sXG5cdFx0Y29udHJvbGxlcjogJ2dyb3VwbGlzdEN0cmwnLFxuXHRcdGNvbnRyb2xsZXJBczogJ2N0cmwnLFxuXHRcdGJpbmRUb0NvbnRyb2xsZXI6IHt9LFxuXHRcdHRlbXBsYXRlVXJsOiBPQy5saW5rVG8oJ2NvbnRhY3RzJywgJ3RlbXBsYXRlcy9ncm91cExpc3QuaHRtbCcpXG5cdH07XG59KTtcbiIsImFuZ3VsYXIubW9kdWxlKCdjb250YWN0c0FwcCcpXG4uZGlyZWN0aXZlKCdncm91cE1vZGVsJywgZnVuY3Rpb24oKSB7XG5cdHJldHVybntcblx0XHRyZXN0cmljdDogJ0EnLFxuXHRcdHJlcXVpcmU6ICduZ01vZGVsJyxcblx0XHRsaW5rOiBmdW5jdGlvbihzY29wZSwgZWxlbWVudCwgYXR0ciwgbmdNb2RlbCkge1xuXHRcdFx0bmdNb2RlbC4kZm9ybWF0dGVycy5wdXNoKGZ1bmN0aW9uKHZhbHVlKSB7XG5cdFx0XHRcdGlmICh2YWx1ZS50cmltKCkubGVuZ3RoID09PSAwKSB7XG5cdFx0XHRcdFx0cmV0dXJuIFtdO1xuXHRcdFx0XHR9XG5cdFx0XHRcdHJldHVybiB2YWx1ZS5zcGxpdCgnLCcpO1xuXHRcdFx0fSk7XG5cdFx0XHRuZ01vZGVsLiRwYXJzZXJzLnB1c2goZnVuY3Rpb24odmFsdWUpIHtcblx0XHRcdFx0cmV0dXJuIHZhbHVlLmpvaW4oJywnKTtcblx0XHRcdH0pO1xuXHRcdH1cblx0fTtcbn0pO1xuIiwiYW5ndWxhci5tb2R1bGUoJ2NvbnRhY3RzQXBwJylcbi5kaXJlY3RpdmUoJ3RlbE1vZGVsJywgZnVuY3Rpb24oKSB7XG5cdHJldHVybntcblx0XHRyZXN0cmljdDogJ0EnLFxuXHRcdHJlcXVpcmU6ICduZ01vZGVsJyxcblx0XHRsaW5rOiBmdW5jdGlvbihzY29wZSwgZWxlbWVudCwgYXR0ciwgbmdNb2RlbCkge1xuXHRcdFx0bmdNb2RlbC4kZm9ybWF0dGVycy5wdXNoKGZ1bmN0aW9uKHZhbHVlKSB7XG5cdFx0XHRcdHJldHVybiB2YWx1ZTtcblx0XHRcdH0pO1xuXHRcdFx0bmdNb2RlbC4kcGFyc2Vycy5wdXNoKGZ1bmN0aW9uKHZhbHVlKSB7XG5cdFx0XHRcdHJldHVybiB2YWx1ZTtcblx0XHRcdH0pO1xuXHRcdH1cblx0fTtcbn0pO1xuIiwiYW5ndWxhci5tb2R1bGUoJ2NvbnRhY3RzQXBwJylcbi5mYWN0b3J5KCdBZGRyZXNzQm9vaycsIGZ1bmN0aW9uKClcbntcblx0cmV0dXJuIGZ1bmN0aW9uIEFkZHJlc3NCb29rKGRhdGEpIHtcblx0XHRhbmd1bGFyLmV4dGVuZCh0aGlzLCB7XG5cblx0XHRcdGRpc3BsYXlOYW1lOiAnJyxcblx0XHRcdGNvbnRhY3RzOiBbXSxcblx0XHRcdGdyb3VwczogZGF0YS5kYXRhLnByb3BzLmdyb3VwcyxcblxuXHRcdFx0Z2V0Q29udGFjdDogZnVuY3Rpb24odWlkKSB7XG5cdFx0XHRcdGZvcih2YXIgaSBpbiB0aGlzLmNvbnRhY3RzKSB7XG5cdFx0XHRcdFx0aWYodGhpcy5jb250YWN0c1tpXS51aWQoKSA9PT0gdWlkKSB7XG5cdFx0XHRcdFx0XHRyZXR1cm4gdGhpcy5jb250YWN0c1tpXTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH1cblx0XHRcdFx0cmV0dXJuIHVuZGVmaW5lZDtcblx0XHRcdH0sXG5cblx0XHRcdHNoYXJlZFdpdGg6IHtcblx0XHRcdFx0dXNlcnM6IFtdLFxuXHRcdFx0XHRncm91cHM6IFtdXG5cdFx0XHR9XG5cblx0XHR9KTtcblx0XHRhbmd1bGFyLmV4dGVuZCh0aGlzLCBkYXRhKTtcblx0XHRhbmd1bGFyLmV4dGVuZCh0aGlzLCB7XG5cdFx0XHRvd25lcjogZGF0YS51cmwuc3BsaXQoJy8nKS5zbGljZSgtMywgLTIpWzBdXG5cdFx0fSk7XG5cblx0XHR2YXIgc2hhcmVzID0gdGhpcy5kYXRhLnByb3BzLmludml0ZTtcblx0XHRpZiAodHlwZW9mIHNoYXJlcyAhPT0gJ3VuZGVmaW5lZCcpIHtcblx0XHRcdGZvciAodmFyIGogPSAwOyBqIDwgc2hhcmVzLmxlbmd0aDsgaisrKSB7XG5cdFx0XHRcdHZhciBocmVmID0gc2hhcmVzW2pdLmhyZWY7XG5cdFx0XHRcdGlmIChocmVmLmxlbmd0aCA9PT0gMCkge1xuXHRcdFx0XHRcdGNvbnRpbnVlO1xuXHRcdFx0XHR9XG5cdFx0XHRcdHZhciBhY2Nlc3MgPSBzaGFyZXNbal0uYWNjZXNzO1xuXHRcdFx0XHRpZiAoYWNjZXNzLmxlbmd0aCA9PT0gMCkge1xuXHRcdFx0XHRcdGNvbnRpbnVlO1xuXHRcdFx0XHR9XG5cblx0XHRcdFx0dmFyIHJlYWRXcml0ZSA9ICh0eXBlb2YgYWNjZXNzLnJlYWRXcml0ZSAhPT0gJ3VuZGVmaW5lZCcpO1xuXG5cdFx0XHRcdGlmIChocmVmLnN0YXJ0c1dpdGgoJ3ByaW5jaXBhbDpwcmluY2lwYWxzL3VzZXJzLycpKSB7XG5cdFx0XHRcdFx0dGhpcy5zaGFyZWRXaXRoLnVzZXJzLnB1c2goe1xuXHRcdFx0XHRcdFx0aWQ6IGhyZWYuc3Vic3RyKDI3KSxcblx0XHRcdFx0XHRcdGRpc3BsYXluYW1lOiBocmVmLnN1YnN0cigyNyksXG5cdFx0XHRcdFx0XHR3cml0YWJsZTogcmVhZFdyaXRlXG5cdFx0XHRcdFx0fSk7XG5cdFx0XHRcdH0gZWxzZSBpZiAoaHJlZi5zdGFydHNXaXRoKCdwcmluY2lwYWw6cHJpbmNpcGFscy9ncm91cHMvJykpIHtcblx0XHRcdFx0XHR0aGlzLnNoYXJlZFdpdGguZ3JvdXBzLnB1c2goe1xuXHRcdFx0XHRcdFx0aWQ6IGhyZWYuc3Vic3RyKDI4KSxcblx0XHRcdFx0XHRcdGRpc3BsYXluYW1lOiBocmVmLnN1YnN0cigyOCksXG5cdFx0XHRcdFx0XHR3cml0YWJsZTogcmVhZFdyaXRlXG5cdFx0XHRcdFx0fSk7XG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHR9XG5cblx0XHQvL3ZhciBvd25lciA9IHRoaXMuZGF0YS5wcm9wcy5vd25lcjtcblx0XHQvL2lmICh0eXBlb2Ygb3duZXIgIT09ICd1bmRlZmluZWQnICYmIG93bmVyLmxlbmd0aCAhPT0gMCkge1xuXHRcdC8vXHRvd25lciA9IG93bmVyLnRyaW0oKTtcblx0XHQvL1x0aWYgKG93bmVyLnN0YXJ0c1dpdGgoJy9yZW1vdGUucGhwL2Rhdi9wcmluY2lwYWxzL3VzZXJzLycpKSB7XG5cdFx0Ly9cdFx0dGhpcy5fcHJvcGVydGllcy5vd25lciA9IG93bmVyLnN1YnN0cigzMyk7XG5cdFx0Ly9cdH1cblx0XHQvL31cblxuXHR9O1xufSk7XG4iLCJhbmd1bGFyLm1vZHVsZSgnY29udGFjdHNBcHAnKVxuLmZhY3RvcnkoJ0NvbnRhY3QnLCBmdW5jdGlvbigkZmlsdGVyKSB7XG5cdHJldHVybiBmdW5jdGlvbiBDb250YWN0KGFkZHJlc3NCb29rLCB2Q2FyZCkge1xuXHRcdGFuZ3VsYXIuZXh0ZW5kKHRoaXMsIHtcblxuXHRcdFx0ZGF0YToge30sXG5cdFx0XHRwcm9wczoge30sXG5cblx0XHRcdGFkZHJlc3NCb29rSWQ6IGFkZHJlc3NCb29rLmRpc3BsYXlOYW1lLFxuXG5cdFx0XHR1aWQ6IGZ1bmN0aW9uKHZhbHVlKSB7XG5cdFx0XHRcdHZhciBtb2RlbCA9IHRoaXM7XG5cdFx0XHRcdGlmIChhbmd1bGFyLmlzRGVmaW5lZCh2YWx1ZSkpIHtcblx0XHRcdFx0XHQvLyBzZXR0ZXJcblx0XHRcdFx0XHRyZXR1cm4gbW9kZWwuc2V0UHJvcGVydHkoJ3VpZCcsIHsgdmFsdWU6IHZhbHVlIH0pO1xuXHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdC8vIGdldHRlclxuXHRcdFx0XHRcdHJldHVybiBtb2RlbC5nZXRQcm9wZXJ0eSgndWlkJykudmFsdWU7XG5cdFx0XHRcdH1cblx0XHRcdH0sXG5cblx0XHRcdGRpc3BsYXlOYW1lOiBmdW5jdGlvbigpIHtcblx0XHRcdFx0cmV0dXJuIHRoaXMuZnVsbE5hbWUoKSB8fCB0aGlzLm9yZygpIHx8ICcnO1xuXHRcdFx0fSxcblxuXHRcdFx0ZnVsbE5hbWU6IGZ1bmN0aW9uKHZhbHVlKSB7XG5cdFx0XHRcdHZhciBtb2RlbCA9IHRoaXM7XG5cdFx0XHRcdGlmIChhbmd1bGFyLmlzRGVmaW5lZCh2YWx1ZSkpIHtcblx0XHRcdFx0XHQvLyBzZXR0ZXJcblx0XHRcdFx0XHRyZXR1cm4gdGhpcy5zZXRQcm9wZXJ0eSgnZm4nLCB7IHZhbHVlOiB2YWx1ZSB9KTtcblx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHQvLyBnZXR0ZXJcblx0XHRcdFx0XHR2YXIgcHJvcGVydHkgPSBtb2RlbC5nZXRQcm9wZXJ0eSgnZm4nKTtcblx0XHRcdFx0XHRpZihwcm9wZXJ0eSkge1xuXHRcdFx0XHRcdFx0cmV0dXJuIHByb3BlcnR5LnZhbHVlO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0XHRwcm9wZXJ0eSA9IG1vZGVsLmdldFByb3BlcnR5KCduJyk7XG5cdFx0XHRcdFx0aWYocHJvcGVydHkpIHtcblx0XHRcdFx0XHRcdHJldHVybiBwcm9wZXJ0eS52YWx1ZS5qb2luKCk7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHRcdHJldHVybiB1bmRlZmluZWQ7XG5cdFx0XHRcdH1cblx0XHRcdH0sXG5cblx0XHRcdHRpdGxlOiBmdW5jdGlvbih2YWx1ZSkge1xuXHRcdFx0XHRpZiAoYW5ndWxhci5pc0RlZmluZWQodmFsdWUpKSB7XG5cdFx0XHRcdFx0Ly8gc2V0dGVyXG5cdFx0XHRcdFx0cmV0dXJuIHRoaXMuc2V0UHJvcGVydHkoJ3RpdGxlJywgeyB2YWx1ZTogdmFsdWUgfSk7XG5cdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0Ly8gZ2V0dGVyXG5cdFx0XHRcdFx0dmFyIHByb3BlcnR5ID0gdGhpcy5nZXRQcm9wZXJ0eSgndGl0bGUnKTtcblx0XHRcdFx0XHRpZihwcm9wZXJ0eSkge1xuXHRcdFx0XHRcdFx0cmV0dXJuIHByb3BlcnR5LnZhbHVlO1xuXHRcdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0XHRyZXR1cm4gdW5kZWZpbmVkO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0fVxuXHRcdFx0fSxcblxuXHRcdFx0b3JnOiBmdW5jdGlvbih2YWx1ZSkge1xuXHRcdFx0XHR2YXIgcHJvcGVydHkgPSB0aGlzLmdldFByb3BlcnR5KCdvcmcnKTtcblx0XHRcdFx0aWYgKGFuZ3VsYXIuaXNEZWZpbmVkKHZhbHVlKSkge1xuXHRcdFx0XHRcdHZhciB2YWwgPSB2YWx1ZTtcblx0XHRcdFx0XHQvLyBzZXR0ZXJcblx0XHRcdFx0XHRpZihwcm9wZXJ0eSAmJiBBcnJheS5pc0FycmF5KHByb3BlcnR5LnZhbHVlKSkge1xuXHRcdFx0XHRcdFx0dmFsID0gcHJvcGVydHkudmFsdWU7XG5cdFx0XHRcdFx0XHR2YWxbMF0gPSB2YWx1ZTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0cmV0dXJuIHRoaXMuc2V0UHJvcGVydHkoJ29yZycsIHsgdmFsdWU6IHZhbCB9KTtcblx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHQvLyBnZXR0ZXJcblx0XHRcdFx0XHRpZihwcm9wZXJ0eSkge1xuXHRcdFx0XHRcdFx0aWYgKEFycmF5LmlzQXJyYXkocHJvcGVydHkudmFsdWUpKSB7XG5cdFx0XHRcdFx0XHRcdHJldHVybiBwcm9wZXJ0eS52YWx1ZVswXTtcblx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdHJldHVybiBwcm9wZXJ0eS52YWx1ZTtcblx0XHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdFx0cmV0dXJuIHVuZGVmaW5lZDtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH1cblx0XHRcdH0sXG5cblx0XHRcdGVtYWlsOiBmdW5jdGlvbigpIHtcblx0XHRcdFx0Ly8gZ2V0dGVyXG5cdFx0XHRcdHZhciBwcm9wZXJ0eSA9IHRoaXMuZ2V0UHJvcGVydHkoJ2VtYWlsJyk7XG5cdFx0XHRcdGlmKHByb3BlcnR5KSB7XG5cdFx0XHRcdFx0cmV0dXJuIHByb3BlcnR5LnZhbHVlO1xuXHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdHJldHVybiB1bmRlZmluZWQ7XG5cdFx0XHRcdH1cblx0XHRcdH0sXG5cblx0XHRcdHBob3RvOiBmdW5jdGlvbih2YWx1ZSkge1xuXHRcdFx0XHRpZiAoYW5ndWxhci5pc0RlZmluZWQodmFsdWUpKSB7XG5cdFx0XHRcdFx0Ly8gc2V0dGVyXG5cdFx0XHRcdFx0Ly8gc3BsaXRzIGltYWdlIGRhdGEgaW50byBcImRhdGE6aW1hZ2UvanBlZ1wiIGFuZCBiYXNlIDY0IGVuY29kZWQgaW1hZ2Vcblx0XHRcdFx0XHR2YXIgaW1hZ2VEYXRhID0gdmFsdWUuc3BsaXQoJztiYXNlNjQsJyk7XG5cdFx0XHRcdFx0dmFyIGltYWdlVHlwZSA9IGltYWdlRGF0YVswXS5zbGljZSgnZGF0YTonLmxlbmd0aCk7XG5cblx0XHRcdFx0XHRyZXR1cm4gdGhpcy5zZXRQcm9wZXJ0eSgncGhvdG8nLCB7IHZhbHVlOiBpbWFnZURhdGFbMV0sIG1ldGE6IHt0eXBlOiBbaW1hZ2VUeXBlXX0gfSk7XG5cdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0dmFyIHByb3BlcnR5ID0gdGhpcy5nZXRQcm9wZXJ0eSgncGhvdG8nKTtcblx0XHRcdFx0XHRpZihwcm9wZXJ0eSkge1xuXHRcdFx0XHRcdFx0dmFyIHR5cGUgPSBwcm9wZXJ0eS5tZXRhLnR5cGU7XG5cdFx0XHRcdFx0XHRpZiAoYW5ndWxhci5pc0FycmF5KHR5cGUpKSB7XG5cdFx0XHRcdFx0XHRcdHR5cGUgPSB0eXBlWzBdO1xuXHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0aWYgKCF0eXBlLnN0YXJ0c1dpdGgoJ2ltYWdlLycpKSB7XG5cdFx0XHRcdFx0XHRcdHR5cGUgPSAnaW1hZ2UvJyArIHR5cGUudG9Mb3dlckNhc2UoKTtcblx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdHJldHVybiAnZGF0YTonICsgdHlwZSArICc7YmFzZTY0LCcgKyBwcm9wZXJ0eS52YWx1ZTtcblx0XHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdFx0cmV0dXJuIHVuZGVmaW5lZDtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH1cblx0XHRcdH0sXG5cblx0XHRcdGNhdGVnb3JpZXM6IGZ1bmN0aW9uKHZhbHVlKSB7XG5cdFx0XHRcdGlmIChhbmd1bGFyLmlzRGVmaW5lZCh2YWx1ZSkpIHtcblx0XHRcdFx0XHQvLyBzZXR0ZXJcblx0XHRcdFx0XHRyZXR1cm4gdGhpcy5zZXRQcm9wZXJ0eSgnY2F0ZWdvcmllcycsIHsgdmFsdWU6IHZhbHVlIH0pO1xuXHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdC8vIGdldHRlclxuXHRcdFx0XHRcdHZhciBwcm9wZXJ0eSA9IHRoaXMuZ2V0UHJvcGVydHkoJ2NhdGVnb3JpZXMnKTtcblx0XHRcdFx0XHRpZihwcm9wZXJ0eSAmJiBwcm9wZXJ0eS52YWx1ZS5sZW5ndGggPiAwKSB7XG5cdFx0XHRcdFx0XHRyZXR1cm4gcHJvcGVydHkudmFsdWUuc3BsaXQoJywnKTtcblx0XHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdFx0cmV0dXJuIFtdO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0fVxuXHRcdFx0fSxcblxuXHRcdFx0Z2V0UHJvcGVydHk6IGZ1bmN0aW9uKG5hbWUpIHtcblx0XHRcdFx0aWYgKHRoaXMucHJvcHNbbmFtZV0pIHtcblx0XHRcdFx0XHRyZXR1cm4gdGhpcy5wcm9wc1tuYW1lXVswXTtcblx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHRyZXR1cm4gdW5kZWZpbmVkO1xuXHRcdFx0XHR9XG5cdFx0XHR9LFxuXHRcdFx0YWRkUHJvcGVydHk6IGZ1bmN0aW9uKG5hbWUsIGRhdGEpIHtcblx0XHRcdFx0ZGF0YSA9IGFuZ3VsYXIuY29weShkYXRhKTtcblx0XHRcdFx0aWYoIXRoaXMucHJvcHNbbmFtZV0pIHtcblx0XHRcdFx0XHR0aGlzLnByb3BzW25hbWVdID0gW107XG5cdFx0XHRcdH1cblx0XHRcdFx0dmFyIGlkeCA9IHRoaXMucHJvcHNbbmFtZV0ubGVuZ3RoO1xuXHRcdFx0XHR0aGlzLnByb3BzW25hbWVdW2lkeF0gPSBkYXRhO1xuXG5cdFx0XHRcdC8vIGtlZXAgdkNhcmQgaW4gc3luY1xuXHRcdFx0XHR0aGlzLmRhdGEuYWRkcmVzc0RhdGEgPSAkZmlsdGVyKCdKU09OMnZDYXJkJykodGhpcy5wcm9wcyk7XG5cdFx0XHRcdHJldHVybiBpZHg7XG5cdFx0XHR9LFxuXHRcdFx0c2V0UHJvcGVydHk6IGZ1bmN0aW9uKG5hbWUsIGRhdGEpIHtcblx0XHRcdFx0aWYoIXRoaXMucHJvcHNbbmFtZV0pIHtcblx0XHRcdFx0XHR0aGlzLnByb3BzW25hbWVdID0gW107XG5cdFx0XHRcdH1cblx0XHRcdFx0dGhpcy5wcm9wc1tuYW1lXVswXSA9IGRhdGE7XG5cblx0XHRcdFx0Ly8ga2VlcCB2Q2FyZCBpbiBzeW5jXG5cdFx0XHRcdHRoaXMuZGF0YS5hZGRyZXNzRGF0YSA9ICRmaWx0ZXIoJ0pTT04ydkNhcmQnKSh0aGlzLnByb3BzKTtcblx0XHRcdH0sXG5cdFx0XHRyZW1vdmVQcm9wZXJ0eTogZnVuY3Rpb24gKG5hbWUsIHByb3ApIHtcblx0XHRcdFx0YW5ndWxhci5jb3B5KF8ud2l0aG91dCh0aGlzLnByb3BzW25hbWVdLCBwcm9wKSwgdGhpcy5wcm9wc1tuYW1lXSk7XG5cdFx0XHRcdHRoaXMuZGF0YS5hZGRyZXNzRGF0YSA9ICRmaWx0ZXIoJ0pTT04ydkNhcmQnKSh0aGlzLnByb3BzKTtcblx0XHRcdH0sXG5cdFx0XHRzZXRFVGFnOiBmdW5jdGlvbihldGFnKSB7XG5cdFx0XHRcdHRoaXMuZGF0YS5ldGFnID0gZXRhZztcblx0XHRcdH0sXG5cdFx0XHRzZXRVcmw6IGZ1bmN0aW9uKGFkZHJlc3NCb29rLCB1aWQpIHtcblx0XHRcdFx0dGhpcy5kYXRhLnVybCA9IGFkZHJlc3NCb29rLnVybCArIHVpZCArICcudmNmJztcblx0XHRcdH0sXG5cblx0XHRcdHN5bmNWQ2FyZDogZnVuY3Rpb24oKSB7XG5cdFx0XHRcdC8vIGtlZXAgdkNhcmQgaW4gc3luY1xuXHRcdFx0XHR0aGlzLmRhdGEuYWRkcmVzc0RhdGEgPSAkZmlsdGVyKCdKU09OMnZDYXJkJykodGhpcy5wcm9wcyk7XG5cdFx0XHR9LFxuXG5cdFx0XHRtYXRjaGVzOiBmdW5jdGlvbihwYXR0ZXJuKSB7XG5cdFx0XHRcdGlmIChfLmlzVW5kZWZpbmVkKHBhdHRlcm4pIHx8IHBhdHRlcm4ubGVuZ3RoID09PSAwKSB7XG5cdFx0XHRcdFx0cmV0dXJuIHRydWU7XG5cdFx0XHRcdH1cblx0XHRcdFx0dmFyIG1vZGVsID0gdGhpcztcblx0XHRcdFx0dmFyIG1hdGNoaW5nUHJvcHMgPSBbJ2ZuJywgJ3RpdGxlJywgJ29yZycsICdlbWFpbCcsICduaWNrbmFtZScsICdub3RlJywgJ3VybCcsICdjbG91ZCcsICdhZHInLCAnaW1wcCcsICd0ZWwnXS5maWx0ZXIoZnVuY3Rpb24gKHByb3BOYW1lKSB7XG5cdFx0XHRcdFx0aWYgKG1vZGVsLnByb3BzW3Byb3BOYW1lXSkge1xuXHRcdFx0XHRcdFx0cmV0dXJuIG1vZGVsLnByb3BzW3Byb3BOYW1lXS5maWx0ZXIoZnVuY3Rpb24gKHByb3BlcnR5KSB7XG5cdFx0XHRcdFx0XHRcdGlmICghcHJvcGVydHkudmFsdWUpIHtcblx0XHRcdFx0XHRcdFx0XHRyZXR1cm4gZmFsc2U7XG5cdFx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdFx0aWYgKF8uaXNTdHJpbmcocHJvcGVydHkudmFsdWUpKSB7XG5cdFx0XHRcdFx0XHRcdFx0cmV0dXJuIHByb3BlcnR5LnZhbHVlLnRvTG93ZXJDYXNlKCkuaW5kZXhPZihwYXR0ZXJuLnRvTG93ZXJDYXNlKCkpICE9PSAtMTtcblx0XHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0XHRpZiAoXy5pc0FycmF5KHByb3BlcnR5LnZhbHVlKSkge1xuXHRcdFx0XHRcdFx0XHRcdHJldHVybiBwcm9wZXJ0eS52YWx1ZS5maWx0ZXIoZnVuY3Rpb24odikge1xuXHRcdFx0XHRcdFx0XHRcdFx0cmV0dXJuIHYudG9Mb3dlckNhc2UoKS5pbmRleE9mKHBhdHRlcm4udG9Mb3dlckNhc2UoKSkgIT09IC0xO1xuXHRcdFx0XHRcdFx0XHRcdH0pLmxlbmd0aCA+IDA7XG5cdFx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdFx0cmV0dXJuIGZhbHNlO1xuXHRcdFx0XHRcdFx0fSkubGVuZ3RoID4gMDtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0cmV0dXJuIGZhbHNlO1xuXHRcdFx0XHR9KTtcblx0XHRcdFx0cmV0dXJuIG1hdGNoaW5nUHJvcHMubGVuZ3RoID4gMDtcblx0XHRcdH1cblxuXHRcdH0pO1xuXG5cdFx0aWYoYW5ndWxhci5pc0RlZmluZWQodkNhcmQpKSB7XG5cdFx0XHRhbmd1bGFyLmV4dGVuZCh0aGlzLmRhdGEsIHZDYXJkKTtcblx0XHRcdGFuZ3VsYXIuZXh0ZW5kKHRoaXMucHJvcHMsICRmaWx0ZXIoJ3ZDYXJkMkpTT04nKSh0aGlzLmRhdGEuYWRkcmVzc0RhdGEpKTtcblx0XHR9IGVsc2Uge1xuXHRcdFx0YW5ndWxhci5leHRlbmQodGhpcy5wcm9wcywge1xuXHRcdFx0XHR2ZXJzaW9uOiBbe3ZhbHVlOiAnMy4wJ31dLFxuXHRcdFx0XHRmbjogW3t2YWx1ZTogJyd9XVxuXHRcdFx0fSk7XG5cdFx0XHR0aGlzLmRhdGEuYWRkcmVzc0RhdGEgPSAkZmlsdGVyKCdKU09OMnZDYXJkJykodGhpcy5wcm9wcyk7XG5cdFx0fVxuXG5cdFx0dmFyIHByb3BlcnR5ID0gdGhpcy5nZXRQcm9wZXJ0eSgnY2F0ZWdvcmllcycpO1xuXHRcdGlmKCFwcm9wZXJ0eSkge1xuXHRcdFx0dGhpcy5jYXRlZ29yaWVzKCcnKTtcblx0XHR9XG5cdH07XG59KTtcbiIsImFuZ3VsYXIubW9kdWxlKCdjb250YWN0c0FwcCcpXG4uZmFjdG9yeSgnQWRkcmVzc0Jvb2tTZXJ2aWNlJywgZnVuY3Rpb24oRGF2Q2xpZW50LCBEYXZTZXJ2aWNlLCBTZXR0aW5nc1NlcnZpY2UsIEFkZHJlc3NCb29rLCAkcSkge1xuXG5cdHZhciBhZGRyZXNzQm9va3MgPSBbXTtcblx0dmFyIGxvYWRQcm9taXNlID0gdW5kZWZpbmVkO1xuXG5cdHZhciBsb2FkQWxsID0gZnVuY3Rpb24oKSB7XG5cdFx0aWYgKGFkZHJlc3NCb29rcy5sZW5ndGggPiAwKSB7XG5cdFx0XHRyZXR1cm4gJHEud2hlbihhZGRyZXNzQm9va3MpO1xuXHRcdH1cblx0XHRpZiAoXy5pc1VuZGVmaW5lZChsb2FkUHJvbWlzZSkpIHtcblx0XHRcdGxvYWRQcm9taXNlID0gRGF2U2VydmljZS50aGVuKGZ1bmN0aW9uKGFjY291bnQpIHtcblx0XHRcdFx0bG9hZFByb21pc2UgPSB1bmRlZmluZWQ7XG5cdFx0XHRcdGFkZHJlc3NCb29rcyA9IGFjY291bnQuYWRkcmVzc0Jvb2tzLm1hcChmdW5jdGlvbihhZGRyZXNzQm9vaykge1xuXHRcdFx0XHRcdHJldHVybiBuZXcgQWRkcmVzc0Jvb2soYWRkcmVzc0Jvb2spO1xuXHRcdFx0XHR9KTtcblx0XHRcdH0pO1xuXHRcdH1cblx0XHRyZXR1cm4gbG9hZFByb21pc2U7XG5cdH07XG5cblx0cmV0dXJuIHtcblx0XHRnZXRBbGw6IGZ1bmN0aW9uKCkge1xuXHRcdFx0cmV0dXJuIGxvYWRBbGwoKS50aGVuKGZ1bmN0aW9uKCkge1xuXHRcdFx0XHRyZXR1cm4gYWRkcmVzc0Jvb2tzO1xuXHRcdFx0fSk7XG5cdFx0fSxcblxuXHRcdGdldEdyb3VwczogZnVuY3Rpb24gKCkge1xuXHRcdFx0cmV0dXJuIHRoaXMuZ2V0QWxsKCkudGhlbihmdW5jdGlvbihhZGRyZXNzQm9va3MpIHtcblx0XHRcdFx0cmV0dXJuIGFkZHJlc3NCb29rcy5tYXAoZnVuY3Rpb24gKGVsZW1lbnQpIHtcblx0XHRcdFx0XHRyZXR1cm4gZWxlbWVudC5ncm91cHM7XG5cdFx0XHRcdH0pLnJlZHVjZShmdW5jdGlvbihhLCBiKSB7XG5cdFx0XHRcdFx0cmV0dXJuIGEuY29uY2F0KGIpO1xuXHRcdFx0XHR9KTtcblx0XHRcdH0pO1xuXHRcdH0sXG5cblx0XHRnZXREZWZhdWx0QWRkcmVzc0Jvb2s6IGZ1bmN0aW9uKCkge1xuXHRcdFx0cmV0dXJuIGFkZHJlc3NCb29rc1swXTtcblx0XHR9LFxuXG5cdFx0Z2V0QWRkcmVzc0Jvb2s6IGZ1bmN0aW9uKGRpc3BsYXlOYW1lKSB7XG5cdFx0XHRyZXR1cm4gRGF2U2VydmljZS50aGVuKGZ1bmN0aW9uKGFjY291bnQpIHtcblx0XHRcdFx0cmV0dXJuIERhdkNsaWVudC5nZXRBZGRyZXNzQm9vayh7ZGlzcGxheU5hbWU6ZGlzcGxheU5hbWUsIHVybDphY2NvdW50LmhvbWVVcmx9KS50aGVuKGZ1bmN0aW9uKGFkZHJlc3NCb29rKSB7XG5cdFx0XHRcdFx0YWRkcmVzc0Jvb2sgPSBuZXcgQWRkcmVzc0Jvb2soe1xuXHRcdFx0XHRcdFx0dXJsOiBhZGRyZXNzQm9va1swXS5ocmVmLFxuXHRcdFx0XHRcdFx0ZGF0YTogYWRkcmVzc0Jvb2tbMF1cblx0XHRcdFx0XHR9KTtcblx0XHRcdFx0XHRhZGRyZXNzQm9vay5kaXNwbGF5TmFtZSA9IGRpc3BsYXlOYW1lO1xuXHRcdFx0XHRcdHJldHVybiBhZGRyZXNzQm9vaztcblx0XHRcdFx0fSk7XG5cdFx0XHR9KTtcblx0XHR9LFxuXG5cdFx0Y3JlYXRlOiBmdW5jdGlvbihkaXNwbGF5TmFtZSkge1xuXHRcdFx0cmV0dXJuIERhdlNlcnZpY2UudGhlbihmdW5jdGlvbihhY2NvdW50KSB7XG5cdFx0XHRcdHJldHVybiBEYXZDbGllbnQuY3JlYXRlQWRkcmVzc0Jvb2soe2Rpc3BsYXlOYW1lOmRpc3BsYXlOYW1lLCB1cmw6YWNjb3VudC5ob21lVXJsfSk7XG5cdFx0XHR9KTtcblx0XHR9LFxuXG5cdFx0ZGVsZXRlOiBmdW5jdGlvbihhZGRyZXNzQm9vaykge1xuXHRcdFx0cmV0dXJuIERhdlNlcnZpY2UudGhlbihmdW5jdGlvbigpIHtcblx0XHRcdFx0cmV0dXJuIERhdkNsaWVudC5kZWxldGVBZGRyZXNzQm9vayhhZGRyZXNzQm9vaykudGhlbihmdW5jdGlvbigpIHtcblx0XHRcdFx0XHR2YXIgaW5kZXggPSBhZGRyZXNzQm9va3MuaW5kZXhPZihhZGRyZXNzQm9vayk7XG5cdFx0XHRcdFx0YWRkcmVzc0Jvb2tzLnNwbGljZShpbmRleCwgMSk7XG5cdFx0XHRcdH0pO1xuXHRcdFx0fSk7XG5cdFx0fSxcblxuXHRcdHJlbmFtZTogZnVuY3Rpb24oYWRkcmVzc0Jvb2ssIGRpc3BsYXlOYW1lKSB7XG5cdFx0XHRyZXR1cm4gRGF2U2VydmljZS50aGVuKGZ1bmN0aW9uKGFjY291bnQpIHtcblx0XHRcdFx0cmV0dXJuIERhdkNsaWVudC5yZW5hbWVBZGRyZXNzQm9vayhhZGRyZXNzQm9vaywge2Rpc3BsYXlOYW1lOmRpc3BsYXlOYW1lLCB1cmw6YWNjb3VudC5ob21lVXJsfSk7XG5cdFx0XHR9KTtcblx0XHR9LFxuXG5cdFx0Z2V0OiBmdW5jdGlvbihkaXNwbGF5TmFtZSkge1xuXHRcdFx0cmV0dXJuIHRoaXMuZ2V0QWxsKCkudGhlbihmdW5jdGlvbihhZGRyZXNzQm9va3MpIHtcblx0XHRcdFx0cmV0dXJuIGFkZHJlc3NCb29rcy5maWx0ZXIoZnVuY3Rpb24gKGVsZW1lbnQpIHtcblx0XHRcdFx0XHRyZXR1cm4gZWxlbWVudC5kaXNwbGF5TmFtZSA9PT0gZGlzcGxheU5hbWU7XG5cdFx0XHRcdH0pWzBdO1xuXHRcdFx0fSk7XG5cdFx0fSxcblxuXHRcdHN5bmM6IGZ1bmN0aW9uKGFkZHJlc3NCb29rKSB7XG5cdFx0XHRyZXR1cm4gRGF2Q2xpZW50LnN5bmNBZGRyZXNzQm9vayhhZGRyZXNzQm9vayk7XG5cdFx0fSxcblxuXHRcdHNoYXJlOiBmdW5jdGlvbihhZGRyZXNzQm9vaywgc2hhcmVUeXBlLCBzaGFyZVdpdGgsIHdyaXRhYmxlLCBleGlzdGluZ1NoYXJlKSB7XG5cdFx0XHR2YXIgeG1sRG9jID0gZG9jdW1lbnQuaW1wbGVtZW50YXRpb24uY3JlYXRlRG9jdW1lbnQoJycsICcnLCBudWxsKTtcblx0XHRcdHZhciBvU2hhcmUgPSB4bWxEb2MuY3JlYXRlRWxlbWVudCgnbzpzaGFyZScpO1xuXHRcdFx0b1NoYXJlLnNldEF0dHJpYnV0ZSgneG1sbnM6ZCcsICdEQVY6Jyk7XG5cdFx0XHRvU2hhcmUuc2V0QXR0cmlidXRlKCd4bWxuczpvJywgJ2h0dHA6Ly9vd25jbG91ZC5vcmcvbnMnKTtcblx0XHRcdHhtbERvYy5hcHBlbmRDaGlsZChvU2hhcmUpO1xuXG5cdFx0XHR2YXIgb1NldCA9IHhtbERvYy5jcmVhdGVFbGVtZW50KCdvOnNldCcpO1xuXHRcdFx0b1NoYXJlLmFwcGVuZENoaWxkKG9TZXQpO1xuXG5cdFx0XHR2YXIgZEhyZWYgPSB4bWxEb2MuY3JlYXRlRWxlbWVudCgnZDpocmVmJyk7XG5cdFx0XHRpZiAoc2hhcmVUeXBlID09PSBPQy5TaGFyZS5TSEFSRV9UWVBFX1VTRVIpIHtcblx0XHRcdFx0ZEhyZWYudGV4dENvbnRlbnQgPSAncHJpbmNpcGFsOnByaW5jaXBhbHMvdXNlcnMvJztcblx0XHRcdH0gZWxzZSBpZiAoc2hhcmVUeXBlID09PSBPQy5TaGFyZS5TSEFSRV9UWVBFX0dST1VQKSB7XG5cdFx0XHRcdGRIcmVmLnRleHRDb250ZW50ID0gJ3ByaW5jaXBhbDpwcmluY2lwYWxzL2dyb3Vwcy8nO1xuXHRcdFx0fVxuXHRcdFx0ZEhyZWYudGV4dENvbnRlbnQgKz0gc2hhcmVXaXRoO1xuXHRcdFx0b1NldC5hcHBlbmRDaGlsZChkSHJlZik7XG5cblx0XHRcdHZhciBvU3VtbWFyeSA9IHhtbERvYy5jcmVhdGVFbGVtZW50KCdvOnN1bW1hcnknKTtcblx0XHRcdG9TdW1tYXJ5LnRleHRDb250ZW50ID0gdCgnY29udGFjdHMnLCAne2FkZHJlc3Nib29rfSBzaGFyZWQgYnkge293bmVyfScsIHtcblx0XHRcdFx0YWRkcmVzc2Jvb2s6IGFkZHJlc3NCb29rLmRpc3BsYXlOYW1lLFxuXHRcdFx0XHRvd25lcjogYWRkcmVzc0Jvb2sub3duZXJcblx0XHRcdH0pO1xuXHRcdFx0b1NldC5hcHBlbmRDaGlsZChvU3VtbWFyeSk7XG5cblx0XHRcdGlmICh3cml0YWJsZSkge1xuXHRcdFx0XHR2YXIgb1JXID0geG1sRG9jLmNyZWF0ZUVsZW1lbnQoJ286cmVhZC13cml0ZScpO1xuXHRcdFx0XHRvU2V0LmFwcGVuZENoaWxkKG9SVyk7XG5cdFx0XHR9XG5cblx0XHRcdHZhciBib2R5ID0gb1NoYXJlLm91dGVySFRNTDtcblxuXHRcdFx0cmV0dXJuIERhdkNsaWVudC54aHIuc2VuZChcblx0XHRcdFx0ZGF2LnJlcXVlc3QuYmFzaWMoe21ldGhvZDogJ1BPU1QnLCBkYXRhOiBib2R5fSksXG5cdFx0XHRcdGFkZHJlc3NCb29rLnVybFxuXHRcdFx0KS50aGVuKGZ1bmN0aW9uKHJlc3BvbnNlKSB7XG5cdFx0XHRcdGlmIChyZXNwb25zZS5zdGF0dXMgPT09IDIwMCkge1xuXHRcdFx0XHRcdGlmICghZXhpc3RpbmdTaGFyZSkge1xuXHRcdFx0XHRcdFx0aWYgKHNoYXJlVHlwZSA9PT0gT0MuU2hhcmUuU0hBUkVfVFlQRV9VU0VSKSB7XG5cdFx0XHRcdFx0XHRcdGFkZHJlc3NCb29rLnNoYXJlZFdpdGgudXNlcnMucHVzaCh7XG5cdFx0XHRcdFx0XHRcdFx0aWQ6IHNoYXJlV2l0aCxcblx0XHRcdFx0XHRcdFx0XHRkaXNwbGF5bmFtZTogc2hhcmVXaXRoLFxuXHRcdFx0XHRcdFx0XHRcdHdyaXRhYmxlOiB3cml0YWJsZVxuXHRcdFx0XHRcdFx0XHR9KTtcblx0XHRcdFx0XHRcdH0gZWxzZSBpZiAoc2hhcmVUeXBlID09PSBPQy5TaGFyZS5TSEFSRV9UWVBFX0dST1VQKSB7XG5cdFx0XHRcdFx0XHRcdGFkZHJlc3NCb29rLnNoYXJlZFdpdGguZ3JvdXBzLnB1c2goe1xuXHRcdFx0XHRcdFx0XHRcdGlkOiBzaGFyZVdpdGgsXG5cdFx0XHRcdFx0XHRcdFx0ZGlzcGxheW5hbWU6IHNoYXJlV2l0aCxcblx0XHRcdFx0XHRcdFx0XHR3cml0YWJsZTogd3JpdGFibGVcblx0XHRcdFx0XHRcdFx0fSk7XG5cdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9XG5cdFx0XHR9KTtcblxuXHRcdH0sXG5cblx0XHR1bnNoYXJlOiBmdW5jdGlvbihhZGRyZXNzQm9vaywgc2hhcmVUeXBlLCBzaGFyZVdpdGgpIHtcblx0XHRcdHZhciB4bWxEb2MgPSBkb2N1bWVudC5pbXBsZW1lbnRhdGlvbi5jcmVhdGVEb2N1bWVudCgnJywgJycsIG51bGwpO1xuXHRcdFx0dmFyIG9TaGFyZSA9IHhtbERvYy5jcmVhdGVFbGVtZW50KCdvOnNoYXJlJyk7XG5cdFx0XHRvU2hhcmUuc2V0QXR0cmlidXRlKCd4bWxuczpkJywgJ0RBVjonKTtcblx0XHRcdG9TaGFyZS5zZXRBdHRyaWJ1dGUoJ3htbG5zOm8nLCAnaHR0cDovL293bmNsb3VkLm9yZy9ucycpO1xuXHRcdFx0eG1sRG9jLmFwcGVuZENoaWxkKG9TaGFyZSk7XG5cblx0XHRcdHZhciBvUmVtb3ZlID0geG1sRG9jLmNyZWF0ZUVsZW1lbnQoJ286cmVtb3ZlJyk7XG5cdFx0XHRvU2hhcmUuYXBwZW5kQ2hpbGQob1JlbW92ZSk7XG5cblx0XHRcdHZhciBkSHJlZiA9IHhtbERvYy5jcmVhdGVFbGVtZW50KCdkOmhyZWYnKTtcblx0XHRcdGlmIChzaGFyZVR5cGUgPT09IE9DLlNoYXJlLlNIQVJFX1RZUEVfVVNFUikge1xuXHRcdFx0XHRkSHJlZi50ZXh0Q29udGVudCA9ICdwcmluY2lwYWw6cHJpbmNpcGFscy91c2Vycy8nO1xuXHRcdFx0fSBlbHNlIGlmIChzaGFyZVR5cGUgPT09IE9DLlNoYXJlLlNIQVJFX1RZUEVfR1JPVVApIHtcblx0XHRcdFx0ZEhyZWYudGV4dENvbnRlbnQgPSAncHJpbmNpcGFsOnByaW5jaXBhbHMvZ3JvdXBzLyc7XG5cdFx0XHR9XG5cdFx0XHRkSHJlZi50ZXh0Q29udGVudCArPSBzaGFyZVdpdGg7XG5cdFx0XHRvUmVtb3ZlLmFwcGVuZENoaWxkKGRIcmVmKTtcblx0XHRcdHZhciBib2R5ID0gb1NoYXJlLm91dGVySFRNTDtcblxuXG5cdFx0XHRyZXR1cm4gRGF2Q2xpZW50Lnhoci5zZW5kKFxuXHRcdFx0XHRkYXYucmVxdWVzdC5iYXNpYyh7bWV0aG9kOiAnUE9TVCcsIGRhdGE6IGJvZHl9KSxcblx0XHRcdFx0YWRkcmVzc0Jvb2sudXJsXG5cdFx0XHQpLnRoZW4oZnVuY3Rpb24ocmVzcG9uc2UpIHtcblx0XHRcdFx0aWYgKHJlc3BvbnNlLnN0YXR1cyA9PT0gMjAwKSB7XG5cdFx0XHRcdFx0aWYgKHNoYXJlVHlwZSA9PT0gT0MuU2hhcmUuU0hBUkVfVFlQRV9VU0VSKSB7XG5cdFx0XHRcdFx0XHRhZGRyZXNzQm9vay5zaGFyZWRXaXRoLnVzZXJzID0gYWRkcmVzc0Jvb2suc2hhcmVkV2l0aC51c2Vycy5maWx0ZXIoZnVuY3Rpb24odXNlcikge1xuXHRcdFx0XHRcdFx0XHRyZXR1cm4gdXNlci5pZCAhPT0gc2hhcmVXaXRoO1xuXHRcdFx0XHRcdFx0fSk7XG5cdFx0XHRcdFx0fSBlbHNlIGlmIChzaGFyZVR5cGUgPT09IE9DLlNoYXJlLlNIQVJFX1RZUEVfR1JPVVApIHtcblx0XHRcdFx0XHRcdGFkZHJlc3NCb29rLnNoYXJlZFdpdGguZ3JvdXBzID0gYWRkcmVzc0Jvb2suc2hhcmVkV2l0aC5ncm91cHMuZmlsdGVyKGZ1bmN0aW9uKGdyb3Vwcykge1xuXHRcdFx0XHRcdFx0XHRyZXR1cm4gZ3JvdXBzLmlkICE9PSBzaGFyZVdpdGg7XG5cdFx0XHRcdFx0XHR9KTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0Ly90b2RvIC0gcmVtb3ZlIGVudHJ5IGZyb20gYWRkcmVzc2Jvb2sgb2JqZWN0XG5cdFx0XHRcdFx0cmV0dXJuIHRydWU7XG5cdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0cmV0dXJuIGZhbHNlO1xuXHRcdFx0XHR9XG5cdFx0XHR9KTtcblxuXHRcdH1cblxuXG5cdH07XG5cbn0pO1xuIiwiYW5ndWxhci5tb2R1bGUoJ2NvbnRhY3RzQXBwJylcbi5zZXJ2aWNlKCdDb250YWN0U2VydmljZScsIGZ1bmN0aW9uKERhdkNsaWVudCwgQWRkcmVzc0Jvb2tTZXJ2aWNlLCBDb250YWN0LCAkcSwgQ2FjaGVGYWN0b3J5LCB1dWlkNCkge1xuXG5cdHZhciBjYWNoZUZpbGxlZCA9IGZhbHNlO1xuXG5cdHZhciBjb250YWN0cyA9IENhY2hlRmFjdG9yeSgnY29udGFjdHMnKTtcblxuXHR2YXIgb2JzZXJ2ZXJDYWxsYmFja3MgPSBbXTtcblxuXHR2YXIgbG9hZFByb21pc2UgPSB1bmRlZmluZWQ7XG5cblx0dGhpcy5yZWdpc3Rlck9ic2VydmVyQ2FsbGJhY2sgPSBmdW5jdGlvbihjYWxsYmFjaykge1xuXHRcdG9ic2VydmVyQ2FsbGJhY2tzLnB1c2goY2FsbGJhY2spO1xuXHR9O1xuXG5cdHZhciBub3RpZnlPYnNlcnZlcnMgPSBmdW5jdGlvbihldmVudE5hbWUsIHVpZCkge1xuXHRcdHZhciBldiA9IHtcblx0XHRcdGV2ZW50OiBldmVudE5hbWUsXG5cdFx0XHR1aWQ6IHVpZCxcblx0XHRcdGNvbnRhY3RzOiBjb250YWN0cy52YWx1ZXMoKVxuXHRcdH07XG5cdFx0YW5ndWxhci5mb3JFYWNoKG9ic2VydmVyQ2FsbGJhY2tzLCBmdW5jdGlvbihjYWxsYmFjaykge1xuXHRcdFx0Y2FsbGJhY2soZXYpO1xuXHRcdH0pO1xuXHR9O1xuXG5cdHRoaXMuZmlsbENhY2hlID0gZnVuY3Rpb24oKSB7XG5cdFx0aWYgKF8uaXNVbmRlZmluZWQobG9hZFByb21pc2UpKSB7XG5cdFx0XHRsb2FkUHJvbWlzZSA9IEFkZHJlc3NCb29rU2VydmljZS5nZXRBbGwoKS50aGVuKGZ1bmN0aW9uIChlbmFibGVkQWRkcmVzc0Jvb2tzKSB7XG5cdFx0XHRcdHZhciBwcm9taXNlcyA9IFtdO1xuXHRcdFx0XHRlbmFibGVkQWRkcmVzc0Jvb2tzLmZvckVhY2goZnVuY3Rpb24gKGFkZHJlc3NCb29rKSB7XG5cdFx0XHRcdFx0cHJvbWlzZXMucHVzaChcblx0XHRcdFx0XHRcdEFkZHJlc3NCb29rU2VydmljZS5zeW5jKGFkZHJlc3NCb29rKS50aGVuKGZ1bmN0aW9uIChhZGRyZXNzQm9vaykge1xuXHRcdFx0XHRcdFx0XHRmb3IgKHZhciBpIGluIGFkZHJlc3NCb29rLm9iamVjdHMpIHtcblx0XHRcdFx0XHRcdFx0XHRpZiAoYWRkcmVzc0Jvb2sub2JqZWN0c1tpXS5hZGRyZXNzRGF0YSkge1xuXHRcdFx0XHRcdFx0XHRcdFx0dmFyIGNvbnRhY3QgPSBuZXcgQ29udGFjdChhZGRyZXNzQm9vaywgYWRkcmVzc0Jvb2sub2JqZWN0c1tpXSk7XG5cdFx0XHRcdFx0XHRcdFx0XHRjb250YWN0cy5wdXQoY29udGFjdC51aWQoKSwgY29udGFjdCk7XG5cdFx0XHRcdFx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHRcdFx0XHRcdC8vIGN1c3RvbSBjb25zb2xlXG5cdFx0XHRcdFx0XHRcdFx0XHRjb25zb2xlLmxvZygnSW52YWxpZCBjb250YWN0IHJlY2VpdmVkOiAnICsgYWRkcmVzc0Jvb2sub2JqZWN0c1tpXS51cmwpO1xuXHRcdFx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0fSlcblx0XHRcdFx0XHQpO1xuXHRcdFx0XHR9KTtcblx0XHRcdFx0cmV0dXJuICRxLmFsbChwcm9taXNlcykudGhlbihmdW5jdGlvbiAoKSB7XG5cdFx0XHRcdFx0Y2FjaGVGaWxsZWQgPSB0cnVlO1xuXHRcdFx0XHR9KTtcblx0XHRcdH0pO1xuXHRcdH1cblx0XHRyZXR1cm4gbG9hZFByb21pc2U7XG5cdH07XG5cblx0dGhpcy5nZXRBbGwgPSBmdW5jdGlvbigpIHtcblx0XHRpZihjYWNoZUZpbGxlZCA9PT0gZmFsc2UpIHtcblx0XHRcdHJldHVybiB0aGlzLmZpbGxDYWNoZSgpLnRoZW4oZnVuY3Rpb24oKSB7XG5cdFx0XHRcdHJldHVybiBjb250YWN0cy52YWx1ZXMoKTtcblx0XHRcdH0pO1xuXHRcdH0gZWxzZSB7XG5cdFx0XHRyZXR1cm4gJHEud2hlbihjb250YWN0cy52YWx1ZXMoKSk7XG5cdFx0fVxuXHR9O1xuXG5cdHRoaXMuZ2V0R3JvdXBzID0gZnVuY3Rpb24gKCkge1xuXHRcdHJldHVybiB0aGlzLmdldEFsbCgpLnRoZW4oZnVuY3Rpb24oY29udGFjdHMpIHtcblx0XHRcdHJldHVybiBfLnVuaXEoY29udGFjdHMubWFwKGZ1bmN0aW9uIChlbGVtZW50KSB7XG5cdFx0XHRcdHJldHVybiBlbGVtZW50LmNhdGVnb3JpZXMoKTtcblx0XHRcdH0pLnJlZHVjZShmdW5jdGlvbihhLCBiKSB7XG5cdFx0XHRcdHJldHVybiBhLmNvbmNhdChiKTtcblx0XHRcdH0sIFtdKS5zb3J0KCksIHRydWUpO1xuXHRcdH0pO1xuXHR9O1xuXG5cdHRoaXMuZ2V0QnlJZCA9IGZ1bmN0aW9uKHVpZCkge1xuXHRcdGlmKGNhY2hlRmlsbGVkID09PSBmYWxzZSkge1xuXHRcdFx0cmV0dXJuIHRoaXMuZmlsbENhY2hlKCkudGhlbihmdW5jdGlvbigpIHtcblx0XHRcdFx0cmV0dXJuIGNvbnRhY3RzLmdldCh1aWQpO1xuXHRcdFx0fSk7XG5cdFx0fSBlbHNlIHtcblx0XHRcdHJldHVybiAkcS53aGVuKGNvbnRhY3RzLmdldCh1aWQpKTtcblx0XHR9XG5cdH07XG5cblx0dGhpcy5jcmVhdGUgPSBmdW5jdGlvbihuZXdDb250YWN0LCBhZGRyZXNzQm9vaywgdWlkKSB7XG5cdFx0YWRkcmVzc0Jvb2sgPSBhZGRyZXNzQm9vayB8fCBBZGRyZXNzQm9va1NlcnZpY2UuZ2V0RGVmYXVsdEFkZHJlc3NCb29rKCk7XG5cdFx0bmV3Q29udGFjdCA9IG5ld0NvbnRhY3QgfHwgbmV3IENvbnRhY3QoYWRkcmVzc0Jvb2spO1xuXHRcdHZhciBuZXdVaWQgPSAnJztcblx0XHRpZih1dWlkNC52YWxpZGF0ZSh1aWQpKSB7XG5cdFx0XHRuZXdVaWQgPSB1aWQ7XG5cdFx0fSBlbHNlIHtcblx0XHRcdG5ld1VpZCA9IHV1aWQ0LmdlbmVyYXRlKCk7XG5cdFx0fVxuXHRcdG5ld0NvbnRhY3QudWlkKG5ld1VpZCk7XG5cdFx0bmV3Q29udGFjdC5zZXRVcmwoYWRkcmVzc0Jvb2ssIG5ld1VpZCk7XG5cdFx0bmV3Q29udGFjdC5hZGRyZXNzQm9va0lkID0gYWRkcmVzc0Jvb2suZGlzcGxheU5hbWU7XG5cblx0XHRyZXR1cm4gRGF2Q2xpZW50LmNyZWF0ZUNhcmQoXG5cdFx0XHRhZGRyZXNzQm9vayxcblx0XHRcdHtcblx0XHRcdFx0ZGF0YTogbmV3Q29udGFjdC5kYXRhLmFkZHJlc3NEYXRhLFxuXHRcdFx0XHRmaWxlbmFtZTogbmV3VWlkICsgJy52Y2YnXG5cdFx0XHR9XG5cdFx0KS50aGVuKGZ1bmN0aW9uKHhocikge1xuXHRcdFx0bmV3Q29udGFjdC5zZXRFVGFnKHhoci5nZXRSZXNwb25zZUhlYWRlcignRVRhZycpKTtcblx0XHRcdGNvbnRhY3RzLnB1dChuZXdVaWQsIG5ld0NvbnRhY3QpO1xuXHRcdFx0bm90aWZ5T2JzZXJ2ZXJzKCdjcmVhdGUnLCBuZXdVaWQpO1xuXHRcdFx0cmV0dXJuIG5ld0NvbnRhY3Q7XG5cdFx0fSkuY2F0Y2goZnVuY3Rpb24oZSkge1xuXHRcdFx0Y29uc29sZS5sb2coXCJDb3VsZG4ndCBjcmVhdGVcIiwgZSk7XG5cdFx0fSk7XG5cdH07XG5cblx0dGhpcy5pbXBvcnQgPSBmdW5jdGlvbihkYXRhLCB0eXBlLCBhZGRyZXNzQm9vaywgcHJvZ3Jlc3NDYWxsYmFjaykge1xuXHRcdGFkZHJlc3NCb29rID0gYWRkcmVzc0Jvb2sgfHwgQWRkcmVzc0Jvb2tTZXJ2aWNlLmdldERlZmF1bHRBZGRyZXNzQm9vaygpO1xuXG5cdFx0dmFyIHJlZ2V4cCA9IC9CRUdJTjpWQ0FSRFtcXHNcXFNdKj9FTkQ6VkNBUkQvbWdpO1xuXHRcdHZhciBzaW5nbGVWQ2FyZHMgPSBkYXRhLm1hdGNoKHJlZ2V4cCk7XG5cblx0XHRpZiAoIXNpbmdsZVZDYXJkcykge1xuXHRcdFx0T0MuTm90aWZpY2F0aW9uLnNob3dUZW1wb3JhcnkodCgnY29udGFjdHMnLCAnTm8gY29udGFjdHMgaW4gZmlsZS4gT25seSBWQ2FyZCBmaWxlcyBhcmUgYWxsb3dlZC4nKSk7XG5cdFx0XHRpZiAocHJvZ3Jlc3NDYWxsYmFjaykge1xuXHRcdFx0XHRwcm9ncmVzc0NhbGxiYWNrKDEpO1xuXHRcdFx0fVxuXHRcdFx0cmV0dXJuO1xuXHRcdH1cblx0XHR2YXIgbnVtID0gMTtcblx0XHRmb3IodmFyIGkgaW4gc2luZ2xlVkNhcmRzKSB7XG5cdFx0XHR2YXIgbmV3Q29udGFjdCA9IG5ldyBDb250YWN0KGFkZHJlc3NCb29rLCB7YWRkcmVzc0RhdGE6IHNpbmdsZVZDYXJkc1tpXX0pO1xuXHRcdFx0dGhpcy5jcmVhdGUobmV3Q29udGFjdCwgYWRkcmVzc0Jvb2spLnRoZW4oZnVuY3Rpb24oKSB7XG5cdFx0XHRcdC8vIFVwZGF0ZSB0aGUgcHJvZ3Jlc3MgaW5kaWNhdG9yXG5cdFx0XHRcdGlmIChwcm9ncmVzc0NhbGxiYWNrKSBwcm9ncmVzc0NhbGxiYWNrKG51bS9zaW5nbGVWQ2FyZHMubGVuZ3RoKTtcblx0XHRcdFx0bnVtKys7XG5cdFx0XHR9KTtcblx0XHR9XG5cdH07XG5cblx0dGhpcy5tb3ZlQ29udGFjdCA9IGZ1bmN0aW9uIChjb250YWN0LCBhZGRyZXNzYm9vaykge1xuXHRcdGlmIChjb250YWN0LmFkZHJlc3NCb29rSWQgPT09IGFkZHJlc3Nib29rLmRpc3BsYXlOYW1lKSB7XG5cdFx0XHRyZXR1cm47XG5cdFx0fVxuXHRcdGNvbnRhY3Quc3luY1ZDYXJkKCk7XG5cdFx0dmFyIGNsb25lID0gYW5ndWxhci5jb3B5KGNvbnRhY3QpO1xuXHRcdHZhciB1aWQgPSBjb250YWN0LnVpZCgpO1xuXG5cdFx0Ly8gZGVsZXRlIHRoZSBvbGQgb25lIGJlZm9yZSB0byBhdm9pZCBjb25mbGljdFxuXHRcdHRoaXMuZGVsZXRlKGNvbnRhY3QpO1xuXG5cdFx0Ly8gY3JlYXRlIHRoZSBjb250YWN0IGluIHRoZSBuZXcgdGFyZ2V0IGFkZHJlc3Nib29rXG5cdFx0dGhpcy5jcmVhdGUoY2xvbmUsIGFkZHJlc3Nib29rLCB1aWQpO1xuXHR9O1xuXG5cdHRoaXMudXBkYXRlID0gZnVuY3Rpb24oY29udGFjdCkge1xuXHRcdGNvbnRhY3Quc3luY1ZDYXJkKCk7XG5cblx0XHQvLyB1cGRhdGUgY29udGFjdCBvbiBzZXJ2ZXJcblx0XHRyZXR1cm4gRGF2Q2xpZW50LnVwZGF0ZUNhcmQoY29udGFjdC5kYXRhLCB7anNvbjogdHJ1ZX0pLnRoZW4oZnVuY3Rpb24oeGhyKSB7XG5cdFx0XHR2YXIgbmV3RXRhZyA9IHhoci5nZXRSZXNwb25zZUhlYWRlcignRVRhZycpO1xuXHRcdFx0Y29udGFjdC5zZXRFVGFnKG5ld0V0YWcpO1xuXHRcdFx0bm90aWZ5T2JzZXJ2ZXJzKCd1cGRhdGUnLCBjb250YWN0LnVpZCgpKTtcblx0XHR9KTtcblx0fTtcblxuXHR0aGlzLmRlbGV0ZSA9IGZ1bmN0aW9uKGNvbnRhY3QpIHtcblx0XHQvLyBkZWxldGUgY29udGFjdCBmcm9tIHNlcnZlclxuXHRcdHJldHVybiBEYXZDbGllbnQuZGVsZXRlQ2FyZChjb250YWN0LmRhdGEpLnRoZW4oZnVuY3Rpb24oKSB7XG5cdFx0XHRjb250YWN0cy5yZW1vdmUoY29udGFjdC51aWQoKSk7XG5cdFx0XHRub3RpZnlPYnNlcnZlcnMoJ2RlbGV0ZScsIGNvbnRhY3QudWlkKCkpO1xuXHRcdH0pO1xuXHR9O1xufSk7XG4iLCJhbmd1bGFyLm1vZHVsZSgnY29udGFjdHNBcHAnKVxuLnNlcnZpY2UoJ0RhdkNsaWVudCcsIGZ1bmN0aW9uKCkge1xuXHR2YXIgeGhyID0gbmV3IGRhdi50cmFuc3BvcnQuQmFzaWMoXG5cdFx0bmV3IGRhdi5DcmVkZW50aWFscygpXG5cdCk7XG5cdHJldHVybiBuZXcgZGF2LkNsaWVudCh4aHIpO1xufSk7XG4iLCJhbmd1bGFyLm1vZHVsZSgnY29udGFjdHNBcHAnKVxuLnNlcnZpY2UoJ0RhdlNlcnZpY2UnLCBmdW5jdGlvbihEYXZDbGllbnQpIHtcblx0cmV0dXJuIERhdkNsaWVudC5jcmVhdGVBY2NvdW50KHtcblx0XHRzZXJ2ZXI6IE9DLmxpbmtUb1JlbW90ZSgnZGF2L2FkZHJlc3Nib29rcycpLFxuXHRcdGFjY291bnRUeXBlOiAnY2FyZGRhdicsXG5cdFx0dXNlUHJvdmlkZWRQYXRoOiB0cnVlXG5cdH0pO1xufSk7XG4iLCJhbmd1bGFyLm1vZHVsZSgnY29udGFjdHNBcHAnKVxuLnNlcnZpY2UoJ1NlYXJjaFNlcnZpY2UnLCBmdW5jdGlvbigpIHtcblx0dmFyIHNlYXJjaFRlcm0gPSAnJztcblxuXHR2YXIgb2JzZXJ2ZXJDYWxsYmFja3MgPSBbXTtcblxuXHR0aGlzLnJlZ2lzdGVyT2JzZXJ2ZXJDYWxsYmFjayA9IGZ1bmN0aW9uKGNhbGxiYWNrKSB7XG5cdFx0b2JzZXJ2ZXJDYWxsYmFja3MucHVzaChjYWxsYmFjayk7XG5cdH07XG5cblx0dmFyIG5vdGlmeU9ic2VydmVycyA9IGZ1bmN0aW9uKGV2ZW50TmFtZSkge1xuXHRcdHZhciBldiA9IHtcblx0XHRcdGV2ZW50OmV2ZW50TmFtZSxcblx0XHRcdHNlYXJjaFRlcm06c2VhcmNoVGVybVxuXHRcdH07XG5cdFx0YW5ndWxhci5mb3JFYWNoKG9ic2VydmVyQ2FsbGJhY2tzLCBmdW5jdGlvbihjYWxsYmFjaykge1xuXHRcdFx0Y2FsbGJhY2soZXYpO1xuXHRcdH0pO1xuXHR9O1xuXG5cdHZhciBTZWFyY2hQcm94eSA9IHtcblx0XHRhdHRhY2g6IGZ1bmN0aW9uKHNlYXJjaCkge1xuXHRcdFx0c2VhcmNoLnNldEZpbHRlcignY29udGFjdHMnLCB0aGlzLmZpbHRlclByb3h5KTtcblx0XHR9LFxuXHRcdGZpbHRlclByb3h5OiBmdW5jdGlvbihxdWVyeSkge1xuXHRcdFx0c2VhcmNoVGVybSA9IHF1ZXJ5O1xuXHRcdFx0bm90aWZ5T2JzZXJ2ZXJzKCdjaGFuZ2VTZWFyY2gnKTtcblx0XHR9XG5cdH07XG5cblx0dGhpcy5nZXRTZWFyY2hUZXJtID0gZnVuY3Rpb24oKSB7XG5cdFx0cmV0dXJuIHNlYXJjaFRlcm07XG5cdH07XG5cblx0dGhpcy5jbGVhblNlYXJjaCA9IGZ1bmN0aW9uKCkge1xuXHRcdGlmICghXy5pc1VuZGVmaW5lZCgkKCcuc2VhcmNoYm94JykpKSB7XG5cdFx0XHQkKCcuc2VhcmNoYm94JylbMF0ucmVzZXQoKTtcblx0XHR9XG5cdFx0c2VhcmNoVGVybSA9ICcnO1xuXHR9O1xuXG5cdGlmICghXy5pc1VuZGVmaW5lZChPQy5QbHVnaW5zKSkge1xuXHRcdE9DLlBsdWdpbnMucmVnaXN0ZXIoJ09DQS5TZWFyY2gnLCBTZWFyY2hQcm94eSk7XG5cdFx0aWYgKCFfLmlzVW5kZWZpbmVkKE9DQS5TZWFyY2gpKSB7XG5cdFx0XHRPQy5TZWFyY2ggPSBuZXcgT0NBLlNlYXJjaCgkKCcjc2VhcmNoYm94JyksICQoJyNzZWFyY2hyZXN1bHRzJykpO1xuXHRcdFx0JCgnI3NlYXJjaGJveCcpLnNob3coKTtcblx0XHR9XG5cdH1cblxuXHRpZiAoIV8uaXNVbmRlZmluZWQoJCgnLnNlYXJjaGJveCcpKSkge1xuXHRcdCQoJy5zZWFyY2hib3gnKVswXS5hZGRFdmVudExpc3RlbmVyKCdrZXlwcmVzcycsIGZ1bmN0aW9uKGUpIHtcblx0XHRcdGlmKGUua2V5Q29kZSA9PT0gMTMpIHtcblx0XHRcdFx0bm90aWZ5T2JzZXJ2ZXJzKCdzdWJtaXRTZWFyY2gnKTtcblx0XHRcdH1cblx0XHR9KTtcblx0fVxufSk7XG4iLCJhbmd1bGFyLm1vZHVsZSgnY29udGFjdHNBcHAnKVxuLnNlcnZpY2UoJ1NldHRpbmdzU2VydmljZScsIGZ1bmN0aW9uKCkge1xuXHR2YXIgc2V0dGluZ3MgPSB7XG5cdFx0YWRkcmVzc0Jvb2tzOiBbXG5cdFx0XHQndGVzdEFkZHInXG5cdFx0XVxuXHR9O1xuXG5cdHRoaXMuc2V0ID0gZnVuY3Rpb24oa2V5LCB2YWx1ZSkge1xuXHRcdHNldHRpbmdzW2tleV0gPSB2YWx1ZTtcblx0fTtcblxuXHR0aGlzLmdldCA9IGZ1bmN0aW9uKGtleSkge1xuXHRcdHJldHVybiBzZXR0aW5nc1trZXldO1xuXHR9O1xuXG5cdHRoaXMuZ2V0QWxsID0gZnVuY3Rpb24oKSB7XG5cdFx0cmV0dXJuIHNldHRpbmdzO1xuXHR9O1xufSk7XG4iLCJhbmd1bGFyLm1vZHVsZSgnY29udGFjdHNBcHAnKVxuLnNlcnZpY2UoJ3ZDYXJkUHJvcGVydGllc1NlcnZpY2UnLCBmdW5jdGlvbigpIHtcblx0LyoqXG5cdCAqIG1hcCB2Q2FyZCBhdHRyaWJ1dGVzIHRvIGludGVybmFsIGF0dHJpYnV0ZXNcblx0ICpcblx0ICogcHJvcE5hbWU6IHtcblx0ICogXHRcdG11bHRpcGxlOiBbQm9vbGVhbl0sIC8vIGlzIHRoaXMgcHJvcCBhbGxvd2VkIG1vcmUgdGhhbiBvbmNlPyAoZGVmYXVsdCA9IGZhbHNlKVxuXHQgKiBcdFx0cmVhZGFibGVOYW1lOiBbU3RyaW5nXSwgLy8gaW50ZXJuYXRpb25hbGl6ZWQgcmVhZGFibGUgbmFtZSBvZiBwcm9wXG5cdCAqIFx0XHR0ZW1wbGF0ZTogW1N0cmluZ10sIC8vIHRlbXBsYXRlIG5hbWUgZm91bmQgaW4gL3RlbXBsYXRlcy9kZXRhaWxJdGVtc1xuXHQgKiBcdFx0Wy4uLl0gLy8gb3B0aW9uYWwgYWRkaXRpb25hbCBpbmZvcm1hdGlvbiB3aGljaCBtaWdodCBnZXQgdXNlZCBieSB0aGUgdGVtcGxhdGVcblx0ICogfVxuXHQgKi9cblx0dGhpcy52Q2FyZE1ldGEgPSB7XG5cdFx0bmlja25hbWU6IHtcblx0XHRcdHJlYWRhYmxlTmFtZTogdCgnY29udGFjdHMnLCAnTmlja25hbWUnKSxcblx0XHRcdHRlbXBsYXRlOiAndGV4dCdcblx0XHR9LFxuXHRcdG5vdGU6IHtcblx0XHRcdHJlYWRhYmxlTmFtZTogdCgnY29udGFjdHMnLCAnTm90ZXMnKSxcblx0XHRcdHRlbXBsYXRlOiAndGV4dGFyZWEnXG5cdFx0fSxcblx0XHR1cmw6IHtcblx0XHRcdG11bHRpcGxlOiB0cnVlLFxuXHRcdFx0cmVhZGFibGVOYW1lOiB0KCdjb250YWN0cycsICdXZWJzaXRlJyksXG5cdFx0XHR0ZW1wbGF0ZTogJ3VybCdcblx0XHR9LFxuXHRcdGNsb3VkOiB7XG5cdFx0XHRtdWx0aXBsZTogdHJ1ZSxcblx0XHRcdHJlYWRhYmxlTmFtZTogdCgnY29udGFjdHMnLCAnRmVkZXJhdGVkIENsb3VkIElEJyksXG5cdFx0XHR0ZW1wbGF0ZTogJ3RleHQnLFxuXHRcdFx0ZGVmYXVsdFZhbHVlOiB7XG5cdFx0XHRcdHZhbHVlOlsnJ10sXG5cdFx0XHRcdG1ldGE6e3R5cGU6WydIT01FJ119XG5cdFx0XHR9LFxuXHRcdFx0b3B0aW9uczogW1xuXHRcdFx0XHR7aWQ6ICdIT01FJywgbmFtZTogdCgnY29udGFjdHMnLCAnSG9tZScpfSxcblx0XHRcdFx0e2lkOiAnV09SSycsIG5hbWU6IHQoJ2NvbnRhY3RzJywgJ1dvcmsnKX0sXG5cdFx0XHRcdHtpZDogJ09USEVSJywgbmFtZTogdCgnY29udGFjdHMnLCAnT3RoZXInKX1cblx0XHRcdF1cdFx0fSxcblx0XHRhZHI6IHtcblx0XHRcdG11bHRpcGxlOiB0cnVlLFxuXHRcdFx0cmVhZGFibGVOYW1lOiB0KCdjb250YWN0cycsICdBZGRyZXNzJyksXG5cdFx0XHR0ZW1wbGF0ZTogJ2FkcicsXG5cdFx0XHRkZWZhdWx0VmFsdWU6IHtcblx0XHRcdFx0dmFsdWU6WycnLCAnJywgJycsICcnLCAnJywgJycsICcnXSxcblx0XHRcdFx0bWV0YTp7dHlwZTpbJ0hPTUUnXX1cblx0XHRcdH0sXG5cdFx0XHRvcHRpb25zOiBbXG5cdFx0XHRcdHtpZDogJ0hPTUUnLCBuYW1lOiB0KCdjb250YWN0cycsICdIb21lJyl9LFxuXHRcdFx0XHR7aWQ6ICdXT1JLJywgbmFtZTogdCgnY29udGFjdHMnLCAnV29yaycpfSxcblx0XHRcdFx0e2lkOiAnT1RIRVInLCBuYW1lOiB0KCdjb250YWN0cycsICdPdGhlcicpfVxuXHRcdFx0XVxuXHRcdH0sXG5cdFx0Y2F0ZWdvcmllczoge1xuXHRcdFx0cmVhZGFibGVOYW1lOiB0KCdjb250YWN0cycsICdHcm91cHMnKSxcblx0XHRcdHRlbXBsYXRlOiAnZ3JvdXBzJ1xuXHRcdH0sXG5cdFx0YmRheToge1xuXHRcdFx0cmVhZGFibGVOYW1lOiB0KCdjb250YWN0cycsICdCaXJ0aGRheScpLFxuXHRcdFx0dGVtcGxhdGU6ICdkYXRlJ1xuXHRcdH0sXG5cdFx0ZW1haWw6IHtcblx0XHRcdG11bHRpcGxlOiB0cnVlLFxuXHRcdFx0cmVhZGFibGVOYW1lOiB0KCdjb250YWN0cycsICdFbWFpbCcpLFxuXHRcdFx0dGVtcGxhdGU6ICd0ZXh0Jyxcblx0XHRcdGRlZmF1bHRWYWx1ZToge1xuXHRcdFx0XHR2YWx1ZTonJyxcblx0XHRcdFx0bWV0YTp7dHlwZTpbJ0hPTUUnXX1cblx0XHRcdH0sXG5cdFx0XHRvcHRpb25zOiBbXG5cdFx0XHRcdHtpZDogJ0hPTUUnLCBuYW1lOiB0KCdjb250YWN0cycsICdIb21lJyl9LFxuXHRcdFx0XHR7aWQ6ICdXT1JLJywgbmFtZTogdCgnY29udGFjdHMnLCAnV29yaycpfSxcblx0XHRcdFx0e2lkOiAnT1RIRVInLCBuYW1lOiB0KCdjb250YWN0cycsICdPdGhlcicpfVxuXHRcdFx0XVxuXHRcdH0sXG5cdFx0aW1wcDoge1xuXHRcdFx0bXVsdGlwbGU6IHRydWUsXG5cdFx0XHRyZWFkYWJsZU5hbWU6IHQoJ2NvbnRhY3RzJywgJ0luc3RhbnQgbWVzc2FnaW5nJyksXG5cdFx0XHR0ZW1wbGF0ZTogJ3RleHQnLFxuXHRcdFx0ZGVmYXVsdFZhbHVlOiB7XG5cdFx0XHRcdHZhbHVlOlsnJ10sXG5cdFx0XHRcdG1ldGE6e3R5cGU6WydIT01FJ119XG5cdFx0XHR9LFxuXHRcdFx0b3B0aW9uczogW1xuXHRcdFx0XHR7aWQ6ICdIT01FJywgbmFtZTogdCgnY29udGFjdHMnLCAnSG9tZScpfSxcblx0XHRcdFx0e2lkOiAnV09SSycsIG5hbWU6IHQoJ2NvbnRhY3RzJywgJ1dvcmsnKX0sXG5cdFx0XHRcdHtpZDogJ09USEVSJywgbmFtZTogdCgnY29udGFjdHMnLCAnT3RoZXInKX1cblx0XHRcdF1cblx0XHR9LFxuXHRcdHRlbDoge1xuXHRcdFx0bXVsdGlwbGU6IHRydWUsXG5cdFx0XHRyZWFkYWJsZU5hbWU6IHQoJ2NvbnRhY3RzJywgJ1Bob25lJyksXG5cdFx0XHR0ZW1wbGF0ZTogJ3RlbCcsXG5cdFx0XHRkZWZhdWx0VmFsdWU6IHtcblx0XHRcdFx0dmFsdWU6WycnXSxcblx0XHRcdFx0bWV0YTp7dHlwZTpbJ0hPTUUsVk9JQ0UnXX1cblx0XHRcdH0sXG5cdFx0XHRvcHRpb25zOiBbXG5cdFx0XHRcdHtpZDogJ0hPTUUsVk9JQ0UnLCBuYW1lOiB0KCdjb250YWN0cycsICdIb21lJyl9LFxuXHRcdFx0XHR7aWQ6ICdXT1JLLFZPSUNFJywgbmFtZTogdCgnY29udGFjdHMnLCAnV29yaycpfSxcblx0XHRcdFx0e2lkOiAnQ0VMTCcsIG5hbWU6IHQoJ2NvbnRhY3RzJywgJ01vYmlsZScpfSxcblx0XHRcdFx0e2lkOiAnRkFYJywgbmFtZTogdCgnY29udGFjdHMnLCAnRmF4Jyl9LFxuXHRcdFx0XHR7aWQ6ICdIT01FLEZBWCcsIG5hbWU6IHQoJ2NvbnRhY3RzJywgJ0ZheCBob21lJyl9LFxuXHRcdFx0XHR7aWQ6ICdXT1JLLEZBWCcsIG5hbWU6IHQoJ2NvbnRhY3RzJywgJ0ZheCB3b3JrJyl9LFxuXHRcdFx0XHR7aWQ6ICdQQUdFUicsIG5hbWU6IHQoJ2NvbnRhY3RzJywgJ1BhZ2VyJyl9LFxuXHRcdFx0XHR7aWQ6ICdWT0lDRScsIG5hbWU6IHQoJ2NvbnRhY3RzJywgJ1ZvaWNlJyl9XG5cdFx0XHRdXG5cdFx0fSxcblx0XHQnWC1TT0NJQUxQUk9GSUxFJzoge1xuXHRcdFx0bXVsdGlwbGU6IHRydWUsXG5cdFx0XHRyZWFkYWJsZU5hbWU6IHQoJ2NvbnRhY3RzJywgJ1NvY2lhbCBOZXR3b3JrJyksXG5cdFx0XHR0ZW1wbGF0ZTogJ3RleHQnLFxuXHRcdFx0ZGVmYXVsdFZhbHVlOiB7XG5cdFx0XHRcdHZhbHVlOlsnJ10sXG5cdFx0XHRcdG1ldGE6e3R5cGU6WydmYWNlYm9vayddfVxuXHRcdFx0fSxcblx0XHRcdG9wdGlvbnM6IFtcblx0XHRcdFx0e2lkOiAnRkFDRUJPT0snLCBuYW1lOiAnRmFjZWJvb2snfSxcblx0XHRcdFx0e2lkOiAnVFdJVFRFUicsIG5hbWU6ICdUd2l0dGVyJ31cblx0XHRcdF1cblxuXHRcdH1cblx0fTtcblxuXHR0aGlzLmZpZWxkT3JkZXIgPSBbXG5cdFx0J29yZycsXG5cdFx0J3RpdGxlJyxcblx0XHQndGVsJyxcblx0XHQnZW1haWwnLFxuXHRcdCdhZHInLFxuXHRcdCdpbXBwJyxcblx0XHQnbmljaycsXG5cdFx0J2JkYXknLFxuXHRcdCd1cmwnLFxuXHRcdCdYLVNPQ0lBTFBST0ZJTEUnLFxuXHRcdCdub3RlJyxcblx0XHQnY2F0ZWdvcmllcycsXG5cdFx0J3JvbGUnXG5cdF07XG5cblx0dGhpcy5maWVsZERlZmluaXRpb25zID0gW107XG5cdGZvciAodmFyIHByb3AgaW4gdGhpcy52Q2FyZE1ldGEpIHtcblx0XHR0aGlzLmZpZWxkRGVmaW5pdGlvbnMucHVzaCh7aWQ6IHByb3AsIG5hbWU6IHRoaXMudkNhcmRNZXRhW3Byb3BdLnJlYWRhYmxlTmFtZSwgbXVsdGlwbGU6ICEhdGhpcy52Q2FyZE1ldGFbcHJvcF0ubXVsdGlwbGV9KTtcblx0fVxuXG5cdHRoaXMuZmFsbGJhY2tNZXRhID0gZnVuY3Rpb24ocHJvcGVydHkpIHtcblx0XHRmdW5jdGlvbiBjYXBpdGFsaXplKHN0cmluZykgeyByZXR1cm4gc3RyaW5nLmNoYXJBdCgwKS50b1VwcGVyQ2FzZSgpICsgc3RyaW5nLnNsaWNlKDEpOyB9XG5cdFx0cmV0dXJuIHtcblx0XHRcdG5hbWU6ICd1bmtub3duLScgKyBwcm9wZXJ0eSxcblx0XHRcdHJlYWRhYmxlTmFtZTogY2FwaXRhbGl6ZShwcm9wZXJ0eSksXG5cdFx0XHR0ZW1wbGF0ZTogJ2hpZGRlbicsXG5cdFx0XHRuZWNlc3NpdHk6ICdvcHRpb25hbCdcblx0XHR9O1xuXHR9O1xuXG5cdHRoaXMuZ2V0TWV0YSA9IGZ1bmN0aW9uKHByb3BlcnR5KSB7XG5cdFx0cmV0dXJuIHRoaXMudkNhcmRNZXRhW3Byb3BlcnR5XSB8fCB0aGlzLmZhbGxiYWNrTWV0YShwcm9wZXJ0eSk7XG5cdH07XG5cbn0pO1xuIiwiYW5ndWxhci5tb2R1bGUoJ2NvbnRhY3RzQXBwJylcbi5maWx0ZXIoJ0pTT04ydkNhcmQnLCBmdW5jdGlvbigpIHtcblx0cmV0dXJuIGZ1bmN0aW9uKGlucHV0KSB7XG5cdFx0cmV0dXJuIHZDYXJkLmdlbmVyYXRlKGlucHV0KTtcblx0fTtcbn0pO1xuIiwiYW5ndWxhci5tb2R1bGUoJ2NvbnRhY3RzQXBwJylcbi5maWx0ZXIoJ2NvbnRhY3RDb2xvcicsIGZ1bmN0aW9uKCkge1xuXHRyZXR1cm4gZnVuY3Rpb24oaW5wdXQpIHtcblx0XHQvLyBDaGVjayBpZiBjb3JlIGhhcyB0aGUgbmV3IGNvbG9yIGdlbmVyYXRvclxuXHRcdGlmKHR5cGVvZiBpbnB1dC50b0hzbCA9PT0gJ2Z1bmN0aW9uJykge1xuXHRcdFx0dmFyIGhzbCA9IGlucHV0LnRvSHNsKCk7XG5cdFx0XHRyZXR1cm4gJ2hzbCgnK2hzbFswXSsnLCAnK2hzbFsxXSsnJSwgJytoc2xbMl0rJyUpJztcblx0XHR9IGVsc2Uge1xuXHRcdFx0Ly8gSWYgbm90LCB3ZSB1c2UgdGhlIG9sZCBvbmVcblx0XHRcdC8qIGdsb2JhbCBtZDUgKi9cblx0XHRcdHZhciBoYXNoID0gbWQ1KGlucHV0KS5zdWJzdHJpbmcoMCwgNCksXG5cdFx0XHRcdG1heFJhbmdlID0gcGFyc2VJbnQoJ2ZmZmYnLCAxNiksXG5cdFx0XHRcdGh1ZSA9IHBhcnNlSW50KGhhc2gsIDE2KSAvIG1heFJhbmdlICogMjU2O1xuXHRcdFx0cmV0dXJuICdoc2woJyArIGh1ZSArICcsIDkwJSwgNjUlKSc7XG5cdFx0fVxuXHR9O1xufSk7IiwiYW5ndWxhci5tb2R1bGUoJ2NvbnRhY3RzQXBwJylcbi5maWx0ZXIoJ2NvbnRhY3RHcm91cEZpbHRlcicsIGZ1bmN0aW9uKCkge1xuXHQndXNlIHN0cmljdCc7XG5cdHJldHVybiBmdW5jdGlvbiAoY29udGFjdHMsIGdyb3VwKSB7XG5cdFx0aWYgKHR5cGVvZiBjb250YWN0cyA9PT0gJ3VuZGVmaW5lZCcpIHtcblx0XHRcdHJldHVybiBjb250YWN0cztcblx0XHR9XG5cdFx0aWYgKHR5cGVvZiBncm91cCA9PT0gJ3VuZGVmaW5lZCcgfHwgZ3JvdXAudG9Mb3dlckNhc2UoKSA9PT0gdCgnY29udGFjdHMnLCAnQWxsIGNvbnRhY3RzJykudG9Mb3dlckNhc2UoKSkge1xuXHRcdFx0cmV0dXJuIGNvbnRhY3RzO1xuXHRcdH1cblx0XHR2YXIgZmlsdGVyID0gW107XG5cdFx0aWYgKGNvbnRhY3RzLmxlbmd0aCA+IDApIHtcblx0XHRcdGZvciAodmFyIGkgPSAwOyBpIDwgY29udGFjdHMubGVuZ3RoOyBpKyspIHtcblx0XHRcdFx0aWYgKGdyb3VwLnRvTG93ZXJDYXNlKCkgPT09IHQoJ2NvbnRhY3RzJywgJ05vdCBncm91cGVkJykudG9Mb3dlckNhc2UoKSkge1xuXHRcdFx0XHRcdGlmIChjb250YWN0c1tpXS5jYXRlZ29yaWVzKCkubGVuZ3RoID09PSAwKSB7XG5cdFx0XHRcdFx0XHRmaWx0ZXIucHVzaChjb250YWN0c1tpXSk7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdGlmIChjb250YWN0c1tpXS5jYXRlZ29yaWVzKCkuaW5kZXhPZihncm91cCkgPj0gMCkge1xuXHRcdFx0XHRcdFx0ZmlsdGVyLnB1c2goY29udGFjdHNbaV0pO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0fVxuXHRcdFx0fVxuXHRcdH1cblx0XHRyZXR1cm4gZmlsdGVyLmxlbmd0aCA9PT0gMCA/IGNvbnRhY3RzIDogZmlsdGVyO1xuXHR9O1xufSk7XG4iLCJhbmd1bGFyLm1vZHVsZSgnY29udGFjdHNBcHAnKVxuLmZpbHRlcignZmllbGRGaWx0ZXInLCBmdW5jdGlvbigpIHtcblx0J3VzZSBzdHJpY3QnO1xuXHRyZXR1cm4gZnVuY3Rpb24gKGZpZWxkcywgY29udGFjdCkge1xuXHRcdGlmICh0eXBlb2YgZmllbGRzID09PSAndW5kZWZpbmVkJykge1xuXHRcdFx0cmV0dXJuIGZpZWxkcztcblx0XHR9XG5cdFx0aWYgKHR5cGVvZiBjb250YWN0ID09PSAndW5kZWZpbmVkJykge1xuXHRcdFx0cmV0dXJuIGZpZWxkcztcblx0XHR9XG5cdFx0dmFyIGZpbHRlciA9IFtdO1xuXHRcdGlmIChmaWVsZHMubGVuZ3RoID4gMCkge1xuXHRcdFx0Zm9yICh2YXIgaSA9IDA7IGkgPCBmaWVsZHMubGVuZ3RoOyBpKyspIHtcblx0XHRcdFx0aWYgKGZpZWxkc1tpXS5tdWx0aXBsZSApIHtcblx0XHRcdFx0XHRmaWx0ZXIucHVzaChmaWVsZHNbaV0pO1xuXHRcdFx0XHRcdGNvbnRpbnVlO1xuXHRcdFx0XHR9XG5cdFx0XHRcdGlmIChfLmlzVW5kZWZpbmVkKGNvbnRhY3QuZ2V0UHJvcGVydHkoZmllbGRzW2ldLmlkKSkpIHtcblx0XHRcdFx0XHRmaWx0ZXIucHVzaChmaWVsZHNbaV0pO1xuXHRcdFx0XHR9XG5cdFx0XHR9XG5cdFx0fVxuXHRcdHJldHVybiBmaWx0ZXI7XG5cdH07XG59KTtcbiIsImFuZ3VsYXIubW9kdWxlKCdjb250YWN0c0FwcCcpXG4uZmlsdGVyKCdmaXJzdENoYXJhY3RlcicsIGZ1bmN0aW9uKCkge1xuXHRyZXR1cm4gZnVuY3Rpb24oaW5wdXQpIHtcblx0XHRyZXR1cm4gaW5wdXQuY2hhckF0KDApO1xuXHR9O1xufSk7XG4iLCJhbmd1bGFyLm1vZHVsZSgnY29udGFjdHNBcHAnKVxuLmZpbHRlcignbG9jYWxlT3JkZXJCeScsIFtmdW5jdGlvbiAoKSB7XG5cdHJldHVybiBmdW5jdGlvbiAoYXJyYXksIHNvcnRQcmVkaWNhdGUsIHJldmVyc2VPcmRlcikge1xuXHRcdGlmICghQXJyYXkuaXNBcnJheShhcnJheSkpIHJldHVybiBhcnJheTtcblx0XHRpZiAoIXNvcnRQcmVkaWNhdGUpIHJldHVybiBhcnJheTtcblxuXHRcdHZhciBhcnJheUNvcHkgPSBbXTtcblx0XHRhbmd1bGFyLmZvckVhY2goYXJyYXksIGZ1bmN0aW9uIChpdGVtKSB7XG5cdFx0XHRhcnJheUNvcHkucHVzaChpdGVtKTtcblx0XHR9KTtcblxuXHRcdGFycmF5Q29weS5zb3J0KGZ1bmN0aW9uIChhLCBiKSB7XG5cdFx0XHR2YXIgdmFsdWVBID0gYVtzb3J0UHJlZGljYXRlXTtcblx0XHRcdGlmIChhbmd1bGFyLmlzRnVuY3Rpb24odmFsdWVBKSkge1xuXHRcdFx0XHR2YWx1ZUEgPSBhW3NvcnRQcmVkaWNhdGVdKCk7XG5cdFx0XHR9XG5cdFx0XHR2YXIgdmFsdWVCID0gYltzb3J0UHJlZGljYXRlXTtcblx0XHRcdGlmIChhbmd1bGFyLmlzRnVuY3Rpb24odmFsdWVCKSkge1xuXHRcdFx0XHR2YWx1ZUIgPSBiW3NvcnRQcmVkaWNhdGVdKCk7XG5cdFx0XHR9XG5cblx0XHRcdGlmIChhbmd1bGFyLmlzU3RyaW5nKHZhbHVlQSkpIHtcblx0XHRcdFx0cmV0dXJuICFyZXZlcnNlT3JkZXIgPyB2YWx1ZUEubG9jYWxlQ29tcGFyZSh2YWx1ZUIpIDogdmFsdWVCLmxvY2FsZUNvbXBhcmUodmFsdWVBKTtcblx0XHRcdH1cblxuXHRcdFx0aWYgKGFuZ3VsYXIuaXNOdW1iZXIodmFsdWVBKSB8fCBhbmd1bGFyLmlzQm9vbGVhbih2YWx1ZUEpKSB7XG5cdFx0XHRcdHJldHVybiAhcmV2ZXJzZU9yZGVyID8gdmFsdWVBIC0gdmFsdWVCIDogdmFsdWVCIC0gdmFsdWVBO1xuXHRcdFx0fVxuXG5cdFx0XHRyZXR1cm4gMDtcblx0XHR9KTtcblxuXHRcdHJldHVybiBhcnJheUNvcHk7XG5cdH07XG59XSk7XG5cbiIsImFuZ3VsYXIubW9kdWxlKCdjb250YWN0c0FwcCcpXG4uZmlsdGVyKCduZXdDb250YWN0JywgZnVuY3Rpb24oKSB7XG5cdHJldHVybiBmdW5jdGlvbihpbnB1dCkge1xuXHRcdHJldHVybiBpbnB1dCAhPT0gJycgPyBpbnB1dCA6IHQoJ2NvbnRhY3RzJywgJ05ldyBjb250YWN0Jyk7XG5cdH07XG59KTtcbiIsImFuZ3VsYXIubW9kdWxlKCdjb250YWN0c0FwcCcpXG4uZmlsdGVyKCdvcmRlckRldGFpbEl0ZW1zJywgZnVuY3Rpb24odkNhcmRQcm9wZXJ0aWVzU2VydmljZSkge1xuXHQndXNlIHN0cmljdCc7XG5cdHJldHVybiBmdW5jdGlvbihpdGVtcywgZmllbGQsIHJldmVyc2UpIHtcblxuXHRcdHZhciBmaWx0ZXJlZCA9IFtdO1xuXHRcdGFuZ3VsYXIuZm9yRWFjaChpdGVtcywgZnVuY3Rpb24oaXRlbSkge1xuXHRcdFx0ZmlsdGVyZWQucHVzaChpdGVtKTtcblx0XHR9KTtcblxuXHRcdHZhciBmaWVsZE9yZGVyID0gYW5ndWxhci5jb3B5KHZDYXJkUHJvcGVydGllc1NlcnZpY2UuZmllbGRPcmRlcik7XG5cdFx0Ly8gcmV2ZXJzZSB0byBtb3ZlIGN1c3RvbSBpdGVtcyB0byB0aGUgZW5kIChpbmRleE9mID09IC0xKVxuXHRcdGZpZWxkT3JkZXIucmV2ZXJzZSgpO1xuXG5cdFx0ZmlsdGVyZWQuc29ydChmdW5jdGlvbiAoYSwgYikge1xuXHRcdFx0aWYoZmllbGRPcmRlci5pbmRleE9mKGFbZmllbGRdKSA8IGZpZWxkT3JkZXIuaW5kZXhPZihiW2ZpZWxkXSkpIHtcblx0XHRcdFx0cmV0dXJuIDE7XG5cdFx0XHR9XG5cdFx0XHRpZihmaWVsZE9yZGVyLmluZGV4T2YoYVtmaWVsZF0pID4gZmllbGRPcmRlci5pbmRleE9mKGJbZmllbGRdKSkge1xuXHRcdFx0XHRyZXR1cm4gLTE7XG5cdFx0XHR9XG5cdFx0XHRyZXR1cm4gMDtcblx0XHR9KTtcblxuXHRcdGlmKHJldmVyc2UpIGZpbHRlcmVkLnJldmVyc2UoKTtcblx0XHRyZXR1cm4gZmlsdGVyZWQ7XG5cdH07XG59KTtcbiIsImFuZ3VsYXIubW9kdWxlKCdjb250YWN0c0FwcCcpXG4uZmlsdGVyKCd0b0FycmF5JywgZnVuY3Rpb24oKSB7XG5cdHJldHVybiBmdW5jdGlvbihvYmopIHtcblx0XHRpZiAoIShvYmogaW5zdGFuY2VvZiBPYmplY3QpKSByZXR1cm4gb2JqO1xuXHRcdHJldHVybiBfLm1hcChvYmosIGZ1bmN0aW9uKHZhbCwga2V5KSB7XG5cdFx0XHRyZXR1cm4gT2JqZWN0LmRlZmluZVByb3BlcnR5KHZhbCwgJyRrZXknLCB7dmFsdWU6IGtleX0pO1xuXHRcdH0pO1xuXHR9O1xufSk7XG4iLCJhbmd1bGFyLm1vZHVsZSgnY29udGFjdHNBcHAnKVxuLmZpbHRlcigndkNhcmQySlNPTicsIGZ1bmN0aW9uKCkge1xuXHRyZXR1cm4gZnVuY3Rpb24oaW5wdXQpIHtcblx0XHRyZXR1cm4gdkNhcmQucGFyc2UoaW5wdXQpO1xuXHR9O1xufSk7XG4iXSwic291cmNlUm9vdCI6Ii9zb3VyY2UvIn0=
