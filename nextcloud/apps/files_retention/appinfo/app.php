<?php

$application = new \OCA\Files_Retention\AppInfo\Application();
$application->registerEventListener();

\OCP\App::registerAdmin('files_retention', 'settings/admin');
