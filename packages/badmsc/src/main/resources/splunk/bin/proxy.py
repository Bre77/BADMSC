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
            [to, uri] = self.getInput(args, ["to", "uri"])
        except Exception as e:
            return self.json_error(
                str(e),
                status=400,
            )

        if to not in ["acs", "api", "src", "wan"]:
            return self.json_error(
                "Invalid 'to' parameter",
                status=400,
            )

        # Auth
        if to in ["acs", "api"]:
            try:
                resp, content = simpleRequest(
                    f"{self.LOCAL_URI}/servicesNS/{self.USER}/{self.APP_NAME}/storage/passwords/badmsc%3Aauth%3A?output_mode=json&count=1",
                    sessionKey=self.AUTHTOKEN,
                )
                if resp.status != 200:
                    return self.json_error(
                        f"Getting stored password returned {resp.status}",
                        resp.status,
                        json.loads(content)["messages"][0]["text"],
                    )
                password = json.loads(
                    json.loads(content)["entry"][0]["content"]["clear_password"]
                )
            except Exception as e:
                return self.json_error(
                    f"GET request to {self.LOCAL_URI}/servicesNS/{self.USER}/{self.APP_NAME}/storage/passwords/badmsc:auth: failed",
                    e.__class__.__name__,
                    str(e),
                )

        try:
            if to == "src":
                resp, content = simpleRequest(
                    f"{self.LOCAL_URI}/{uri}?output_mode=json&count=0",
                    method=args["method"],
                    sessionKey=self.AUTHTOKEN,
                    postargs=args["form"],
                    rawResult=True,
                )
            elif to == "api":
                resp, content = simpleRequest(
                    f"https://{password[to]}/{uri}?output_mode=json&count=0",
                    method=args["method"],
                    sessionKey=password["token"],
                    postargs=args["form"],
                    rawResult=True,
                )
            elif to == "acs":
                resp, content = simpleRequest(
                    f"https://{password[to]}/{uri}?count=0",
                    method=args["method"],
                    token=True,
                    sessionKey=password["token"],
                    jsonargs=args.get("payload"),
                    rawResult=True,
                )
            elif to == "wan":
                resp, content = simpleRequest(
                    "https://api.ipify.org/",
                    proxyMode=True,
                    rawResult=True,
                )
            return {
                "payload": content.decode(),
                "status": resp.status,
                "headers": {"Content-Type": "application/json"},
            }
        except Exception as e:
            return self.json_error(
                f"Proxying https://{password[to]}/{uri} failed",
                e.__class__.__name__,
                str(e),
                400,
            )
