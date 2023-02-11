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
            [method, host] = self.getInput(args, ["method", "host"])
        except Exception as e:
            return self.json_error(
                "Missing one of the required fields: method, host",
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
        if method not in ["GET", "POST", "OPTIONS"]:
            return self.json_error(
                f"Method '{method}' isn't allowed",
                status=403,
            )

        uri = args["query"].get("uri", "")
        url = f"https://{host}/{uri}"
        auth = args["query"].get("auth", False)

        token = None
        if auth:
            try:
                resp, content = simpleRequest(
                    f"{self.LOCAL_URI}/servicesNS/{self.USER}/{self.APP_NAME}/storage/passwords/{self.USER}%3A{auth}%3A?output_mode=json&count=1",
                    sessionKey=self.AUTHTOKEN,
                )
                if resp.status != 200:
                    return self.json_error(
                        f"Getting stored auth token for {self.USER} returned {resp.status}",
                        resp.status,
                        json.loads(content)["messages"][0]["text"],
                    )
                token = json.loads(content)["entry"][0]["content"]["clear_password"]
            except Exception as e:
                return self.json_error(
                    f"GET request to {self.LOCAL_URI}/servicesNS/{self.USER}/{self.APP_NAME}/storage/passwords/{self.USER}:{auth}: failed",
                    e.__class__.__name__,
                    str(e),
                )

        try:
            resp, content = simpleRequest(url, method=method, sessionKey=token)
            return {
                "payload": content.decode(),
                "status": resp.status,
                "headers": {"Content-Type": "application/json"},
            }
        except Exception as e:
            return self.json_error(
                f"Proxying {url} failed", e.__class__.__name__, str(e)
            )
