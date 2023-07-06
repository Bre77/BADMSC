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

    def handle(self, in_string):
        args = json.loads(in_string)

        if args["method"] == "POST":
            with open("asbuilt.data", "a") as f:
                f.write(args["payload"])
            
        if args["method"] == "GET":
            output = []
            with open("asbuilt.data", "r") as f:
                for line in f:
                    try:
                        output.append(JSON.parse(line))
                    except:
                        pass
            return {"payload": output, "status": 200}

        return {
            "payload": "Method Not Allowed",
            "status": 405,
            "headers": {"Allow": "POST"},
        }
