#!/bin/sh
set -e
NEXTCLOUD_VERSION="9.0.53"
NC_DOWNLOAD_URL="https://download.nextcloud.com/server/releases/nextcloud-${NEXTCLOUD_VERSION}.tar.bz2"
DIR="$( cd "$( dirname "$0" )" && pwd )"

echo "install.sh: Own directory is $DIR"

if [ "$CI" = "true" ]; then
    # https://docs.nextcloud.org/server/9/admin_manual/installation/source_installation.html#prerequisites
    sudo add-apt-repository -y ppa:ondrej/php5-5.6
    # who cares if one or two repos are down. As long as i'm able to install
    # these packages...
    sudo apt-get update || true

    sudo apt-get install \
        php5-cgi \
        php5 php5-cli \
        php5-gd php5-json php5-sqlite php5-curl \
        php5-intl php5-mcrypt php5-imagick
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
