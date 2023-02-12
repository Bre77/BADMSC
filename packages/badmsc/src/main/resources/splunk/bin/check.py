from splunk.rest import simpleRequest
import sys
import os
import re
import json

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import common


class proxy(common.RestHandler):
    # MAIN HANDLE
    def handle(self, in_string):
        args = self.getArgs(in_string)

        if args["method"] not in ["GET", "POST"]:
            return self.json_error("Method Not Allowed", 405)

        try:  # Check for required input
            [host] = self.getInput(args, ["host"])
        except Exception as e:
            return self.json_error(
                "Missing the required field host",
                status=400,
            )

        if not re.search(
            "^[^.]+\.splunkcloud\.com:8089$|^http-inputs-[^.]+\.splunkcloud\.com(?::443)?$|^admin\.splunk\.com(?::443)?$|^splunkbase\.splunk\.com(?::443)?$",
            host,
        ):
            return self.json_error(
                f"Host '{host}' isn't allowed",
                status=403,
            )

        try:
            simpleRequest(f"https://{host}", method="OPTIONS", raiseAllErrors=True)
            return {"payload": "OK", "status": 200}
        except Exception as e:
            return {"payload": str(e), "status": 200}
