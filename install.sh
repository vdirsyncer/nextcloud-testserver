#!/bin/sh
set -e
NEXTCLOUD_VERSION="12.0.3"
NC_DOWNLOAD_URL="https://download.nextcloud.com/server/releases/nextcloud-${NEXTCLOUD_VERSION}.tar.bz2"
DIR="$( cd "$( dirname "$0" )" && pwd )"

echo "install.sh: Own directory is $DIR"

if [ "$CI" = "true" ]; then
    # https://docs.nextcloud.org/server/9/admin_manual/installation/source_installation.html#prerequisites
    sudo add-apt-repository -y ppa:ondrej/php
    # who cares if one or two repos are down. As long as i'm able to install
    # these packages...
    sudo apt-get update || true

    sudo apt-get install \
        php php-cgi php-cli \
        php-gd php-json php-sqlite3 php-curl \
        php-intl php-mcrypt php-imagick \
        php-xml php-zip php-mbstring
fi

cd "$DIR"

if [ ! -d nextcloud ]; then
    if [ ! -f nextcloud.tar.bz2 ]; then
        echo "Downloading owncloud version: $NEXTCLOUD_VERSION"
        wget "$NC_DOWNLOAD_URL" -O nextcloud.tar.bz2
    fi
    echo "Extracting ownCloud"
    tar xjf nextcloud.tar.bz2
fi

pip install pytest-xprocess lxml

sh $DIR/reset.sh
