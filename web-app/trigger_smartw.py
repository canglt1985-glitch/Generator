from app import app
from smartw.worker import run_alarm_poll, run_vhkt_poll
import threading

def run_both():
    with app.app_context():
        print("Triggering alarm poll...")
        run_alarm_poll()
        print("Triggering VHKT poll...")
        run_vhkt_poll()
        print("Done!")

if __name__ == '__main__':
    run_both()
