#!/bin/sh
DIR="$( cd "$( dirname "$0" )" && pwd )"
echo "$DIR is the own directory."
cd $DIR/nextcloud/

tail -F -n0 data/nextcloud.log &
php -c $DIR/config/php.ini -S 127.0.0.1:8080
kill $(jobs -p) &> /dev/null
