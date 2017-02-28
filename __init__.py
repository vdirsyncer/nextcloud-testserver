# -*- coding: utf-8 -*-

import os
import subprocess
import time

import lxml.html

import pytest

import requests

from vdirsyncer.http import request


owncloud_repo = os.path.dirname(__file__)
php_sh = os.path.abspath(os.path.join(owncloud_repo, 'php.sh'))
base = 'http://127.0.0.1:8080'
username, password = ('asdf', 'asdf')


def wait():
    for i in range(5):
        try:
            requests.get(base + '/')
        except Exception as e:
            # Don't know exact exception class, don't care.
            # Also, https://github.com/kennethreitz/requests/issues/2192
            if 'connection refused' not in str(e).lower():
                raise
            time.sleep(2 ** i)
        else:
            return True
    return False


def get_request_token(session):
    r = request('GET', base + '/', session=session)
    tree = lxml.html.fromstring(r.content)
    return tree.find('head').attrib['data-requesttoken']


def create_address_book(name):
    session = requests.session()
    session.auth = (username, password)
    token = get_request_token(session)

    r = request(
        'POST',
        base + '/index.php/apps/contacts/addressbook/local/add',
        data=dict(displayname=name, uri=name, description=''),
        headers=dict(requesttoken=token),
        session=session
    ).json()
    return r['uri']


class ServerMixin(object):
    storage_class = None
    wsgi_teardown = None

    @pytest.fixture(autouse=True)
    def setup(self, monkeypatch, xprocess):
        def preparefunc(cwd):
            return wait, ['sh', php_sh]

        xprocess.ensure('nextcloud_server', preparefunc)
        subprocess.check_call([os.path.join(owncloud_repo, 'reset.sh')])

    @pytest.fixture
    def get_storage_args(self):
        def inner(collection='test'):
            fileext = self.storage_class.fileext
            dav_path = '/remote.php/dav/'

            rv = {'url': base + dav_path, 'collection': collection,
                  'username': username, 'password': password}

            if collection is not None:
                return self.storage_class.create_collection(**rv)

            return rv

        return inner
