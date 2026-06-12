import logging
logging.basicConfig(level=logging.DEBUG)
from app import app
from smartw.worker import _get_site_label

def test():
    app.app_context().push()
    print("Label for DNIXTC06:")
    print(_get_site_label('DNIXTC06'))

test()
