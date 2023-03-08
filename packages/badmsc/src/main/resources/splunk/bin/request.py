from splunk.persistconn.application import PersistentServerConnectionApplication
import json
import requests
import logging

class request(PersistentServerConnectionApplication):

    def __init__(self, command_line, command_arg, logger=None):
        super(PersistentServerConnectionApplication, self).__init__()
        self.logger = logger
        if self.logger == None:
            self.logger = logging.getLogger(f"splunk.appserver.badmsc")

        PersistentServerConnectionApplication.__init__(self)

    def handle(self, in_string):
        args = json.loads(in_string)

        if args["method"] != "POST":
            self.logger.info(f"Method {args['method']} not allowed")
            return {
                "payload": "Method Not Allowed",
                "status": 405,
                "headers": {"Allow": "POST"}
            }
        
        try:
            options = json.loads(args["payload"])
        except Exception as e:
            self.logger.info(f"Invalid payload. {e}")
            return {
                    "payload": "Invalid JSON payload",
                    "status": 400
                }

        self.logger.info(args["payload"])

        try:
            r = requests.request(**options)
            self.logger.info(f"{r.status_code} {r.text}")
            return {'payload': r.text, 'status': r.status_code}
            #return {'payload': {'text': r.text, 'status': r.status_code, 'headers': r.headers}, 'status': 200}
        except Exception as e:
            self.logger.info(f"Request failed. {e}")
            return {
                "payload": str(e),
                "status": 500
            }
        return {
                "payload": "Impossible",
                "status": 200
            }