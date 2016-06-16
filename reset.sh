#!/bin/sh
set -e
DIR="$( cd "$( dirname "$0" )" && pwd )"

cd "$DIR"


mkdir -p nextcloud/data/
touch nextcloud/data/.ocdata
mkdir -p nextcloud/config/
cp config/nextcloud.config.php nextcloud/config/config.php
cp config/nextcloud.db nextcloud/data/owncloud.db
