This is a simple repackaging of [ownCloud](https://owncloud.org/) to run
locally. It requires PHP and the PHP modules needed by ownCloud.

`reset.sh` resets ownCloud's database to the original state.

`install.sh` implies `reset.sh` and also downloads ownCloud if the folder is
missing.

`php.sh` is a standalone ownCloud server.
