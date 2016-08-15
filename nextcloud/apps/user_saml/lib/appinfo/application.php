<?php
/**
 * @copyright Copyright (c) 2016 Lukas Reschke <lukas@statuscode.ch>
 *
 * @license GNU AGPL version 3 or any later version
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as
 * published by the Free Software Foundation, either version 3 of the
 * License, or (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 *
 */

namespace OCA\User_SAML\AppInfo;

use OCA\User_SAML\Controller\AuthSettingsController;
use OCA\User_SAML\Controller\SAMLController;
use OCA\User_SAML\Controller\SettingsController;
use OCA\User_SAML\MiddleWare\OnlyLoggedInMiddleware;
use OCA\User_SAML\SAMLSettings;
use OCA\User_SAML\UserBackend;
use OCP\AppFramework\App;
use OCP\AppFramework\IAppContainer;

class Application extends App {
	public function __construct(array $urlParams = array()) {
		parent::__construct('user_saml', $urlParams);
		$container = $this->getContainer();

		/**
		 * Controller
		 */
		$container->registerService('AuthSettingsController', function(IAppContainer $c) {
			/** @var \OC\Server $server */
			$server = $c->query('ServerContainer');
			return new AuthSettingsController(
				$c->getAppName(),
				$server->getRequest(),
				$server->getUserManager(),
				$server->getSession(),
				$server->getSecureRandom(),
				$server->getDb(),
				$server->getUserSession()->getUser()->getUID()
			);
		});
		$container->registerService('SettingsController', function(IAppContainer $c) {
			/** @var \OC\Server $server */
			$server = $c->query('ServerContainer');
			return new SettingsController(
				$c->getAppName(),
				$server->getRequest(),
				$server->getL10N('user_saml')
			);
		});
		$container->registerService('SAMLController', function(IAppContainer $c) {
			/** @var \OC\Server $server */
			$server = $c->query('ServerContainer');
			return new SAMLController(
				$c->getAppName(),
				$server->getRequest(),
				$server->getSession(),
				$server->getUserSession(),
				new SAMLSettings($server->getURLGenerator(), $server->getConfig()),
				new UserBackend(
					$server->getConfig(),
					$server->getURLGenerator(),
					$server->getSession(),
					$server->getDb()
				)
			);
		});

		/**
		 * Middleware
		 */
		$container->registerService('OnlyLoggedInMiddleware', function(IAppContainer $c){
			return new OnlyLoggedInMiddleware(
				$c->query('ControllerMethodReflector'),
				$c->query('ServerContainer')->getUserSession()
			);
		});
		$container->registerMiddleware('OnlyLoggedInMiddleware');
	}
}
