# Copyright (C) 2013 Google Inc., authors, and contributors <see AUTHORS file>
# Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
# Created By: mouli@meics.org
# Maintained By: dan@reciprocitylabs.com


from collections import defaultdict
from .email import *
from ggrc.extensions import get_extension_modules
from ggrc.models import Notification, NotificationType, NotificationConfig

class NotificationServices():

  def __init__(self):
    self.services = self.all_notifications()

  def all_notifications(self):
    services = {}
    for extension_module in get_extension_modules():
      contributions = getattr(
          extension_module, 'contributed_notifications', None)
      if contributions:
        if callable(contributions):
          contributions = contributions()
        services.update(contributions)
    return services

  def get_service_function(self, name):
    if name not in self.services:
      raise ValueError("unknown service name: %s" % name)

    return self.services[name]


  def call_service(self, name, pn):
    service = self.get_service_function(name)
    return service(pn)

services = NotificationServices()

def get_pending_notifications():

  pending_notifications = db.session.query(Notification).filter(
      Notification.sent_at == None).all()

  aggregate_data = {
    "cycle_starts_in": defaultdict(list),
    "task_reassigned": defaultdict(list),
    "task_declined": defaultdict(list),
    "task_due_in": defaultdict(list),
    "task_due_today": defaultdict(list),
  }

  for pn in pending_notifications:
    data = services.call_service(pn.object_type.name, pn)

    for data_type in data.keys():
      for email, person_tasks in data[data_type].items():
        aggregate_data[data_type][email] += person_tasks

  return aggregate_data

def generate_notification_email(data):
  return "hello world"

def dispatch_notifications():
  pass


