#!/usr/bin/env python
# -*- coding: utf-8; -*-
#
# This file is part of Superdesk.
#
# Copyright 2013, 2014, 2015 Sourcefabric z.u. and contributors.
#
# For the full copyright and license information, please see the
# AUTHORS and LICENSE files distributed with this source code, or
# at https://www.sourcefabric.org/superdesk/license


import logging
from newsroom.web import NewsroomWebApp
import newsroom.commands  # noqa


logger = logging.getLogger(__name__)
app = NewsroomWebApp("newsroom_celery")
celery = app.celery
