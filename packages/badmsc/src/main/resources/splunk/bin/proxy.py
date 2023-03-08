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
            to = args["query"]["to"]
            del args["query"]["to"]
            uri = args["query"]["uri"]
            del args["query"]["uri"]
        except Exception as e:
            return self.json_error(
                "Missing to or uri parameter",
                status=400,
            )

        if to is "crash":
            raise ("Crash requested by user")

        if to not in ["acs", "acs-json", "api", "src", "wan", "app"]:
            return self.json_error(
                "Invalid 'to' parameter",
                status=400,
            )

        self.logger.info(
            json.dumps(
                {
                    "method": args["method"],
                    "to": to,
                    "uri": uri,
                    "query": args["query"],
                    # "form": args["form"],
                }
            )
        )

        # Auth
        if to in ["acs", "acs-json", "api"]:
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
                    f"{self.LOCAL_URI}/{uri}",
                    method=args["method"],
                    sessionKey=self.AUTHTOKEN,
                    getargs={"output_mode": "json", "count": 0, **args["query"]},
                    postargs=args["form"],
                    rawResult=True,
                )
            elif to == "api":
                resp, content = simpleRequest(
                    f"https://{password[to]}/{uri}",
                    method=args["method"],
                    sessionKey=password["token"],
                    getargs={"output_mode": "json", "count": 0, **args["query"]},
                    postargs=args["form"],
                    rawResult=True,
                )
            elif to == "acs":
                resp, content = simpleRequest(
                    f"https://{password[to]}/{uri}",
                    method=args["method"],
                    token=True,
                    sessionKey=password["token"],
                    getargs={"count": 0, **args["query"]},
                    postargs=args["form"],
                    rawResult=True,
                )
            elif to == "acs-json":
                resp, content = simpleRequest(
                    f"https://{password[to]}/{uri}",
                    method=args["method"],
                    token=True,
                    sessionKey=password["token"],
                    getargs={"count": 0, **args["query"]},
                    jsonargs=json.loads(args.get("payload")),
                    rawResult=True,
                )
            elif to == "wan":
                resp, content = simpleRequest(
                    "https://api.ipify.org/",
                    proxyMode=True,
                    rawResult=True,
                )
            elif to == "app":
                resp, content = simpleRequest(
                    f"https://splunkbase.splunk.com/api/{uri}",
                    method=args["method"],
                    getargs=args["query"],
                    postargs=args["form"],
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
