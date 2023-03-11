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
                "headers": {"Allow": "POST"},
            }

        try:
            options = json.loads(args["payload"])
        except Exception as e:
            self.logger.info(f"Invalid payload. {e}")
            return {"payload": "Invalid JSON payload", "status": 400}

        self.logger.info(args["payload"])

        # Handle local requests by adding FQDN and auth token
        if options["url"].startswith("/services"):
            options["verify"] = False
            options["url"] = f"{args['server']['rest_uri']}{options['url']}"
            options["headers"][
                "Authorization"
            ] = f"Splunk {args['session']['authtoken']}"
        elif not options["url"].startswith("http"):
            options["url"] = f"https://{options['url']}"

        try:
            r = requests.request(**options)
            self.logger.info(f"{r.status_code} {r.text}")
            return {"payload": r.text, "status": r.status_code}
        except Exception as e:
            self.logger.info(f"Request failed. {e}")
            return {"payload": str(e), "status": 500}
