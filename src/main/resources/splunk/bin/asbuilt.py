from splunk.persistconn.application import PersistentServerConnectionApplication
import json
import os

DATA_PATH = os.path.join(
    os.environ["SPLUNK_HOME"],
    "etc",
    "apps",
    "badmsc",
    "local",
    "asbuilt.json",
)


class asbuilt(PersistentServerConnectionApplication):
    def __init__(self, command_line, command_arg, logger=None):
        super(PersistentServerConnectionApplication, self).__init__()

    def handle(self, in_string):
        args = json.loads(in_string)

        if args["method"] == "POST":
            with open(DATA_PATH, "a") as f:
                f.write(args["payload"] + "\n")
            return {"payload": "", "status": 201}

        if args["method"] == "GET":
            output = []
            try:
                with open(DATA_PATH, "r") as f:
                    for line in f:
                        try:
                            output.append(json.loads(line))
                        except:
                            output.append({"action": "exception", "line": line})
            except:
                return {"payload": [], "status": 204}
            return {"payload": output, "status": 200}

        return {
            "payload": "Method Not Allowed",
            "status": 405,
            "headers": {"Allow": "GET,POST"},
        }
