from splunk.persistconn.application import PersistentServerConnectionApplication
import json
import requests
import logging
import tarfile
from io import BytesIO
import os
from pathlib import Path
import time

SPLUNK_HOME = os.environ["SPLUNK_HOME"]


class request(PersistentServerConnectionApplication):
    def __init__(self, command_line, command_arg, logger=None):
        super(PersistentServerConnectionApplication, self).__init__()
        self.logger = logger
        if self.logger == None:
            self.logger = logging.getLogger(f"splunk.appserver.badmsc")

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
            details = json.loads(args["payload"])
        except Exception as e:
            self.logger.info(f"Invalid payload. {e}")
            return {"payload": "Invalid JSON payload", "status": 400}

        try:
            app_dir = Path(os.path.join(SPLUNK_HOME, "etc", "apps", details["app"]))
            tar_bytes_io = BytesIO()
            # Create the tar file
            with tarfile.open(fileobj=tar_bytes_io, mode="w:gz") as tar:
                # Add all files and directories in the app directory to the tar file
                for file_path in app_dir.glob("**"):
                    # Exclude the local directory
                    self.logger.info(file_path)
                    if file_path.relative_to(app_dir).parts[0] != "local":

                        tar.add(str(file_path), arcname=file_path.relative_to(app_dir))

            # Get the bytes of the tar file
            package = tar_bytes_io.getvalue()
        except Exception as e:
            return {"payload": str(e), "status": 500}

        # Write tar_bytes_io to disk for debugging
        with open(
            os.path.join(SPLUNK_HOME, "dev", "BADMSC", details["app"] + ".tar.gz"), "wb"
        ) as f:
            f.write(package)

        # Upload to AppInspect
        upload = requests.post(
            "https://appinspect.splunk.com/v1/app/validate",
            files={
                "app_package": package,
                "included_tags": (None, "private_app"),
            },
            headers={"Authorization": f"Bearer {details['token']}"},
        )
        rid = upload.json()["request_id"]

        ready = False
        while not ready:
            # Check if its done every 2 seconds
            time.sleep(2)
            check = requests.get(
                f"https://appinspect.splunk.com/v1/app/validate/status/{rid}",
                headers={"Authorization": f"Bearer {details['token']}"},
            )
            status = check.json()["status"]
            ready = status == "SUCCESS"

        result = requests.get(
            f"https://appinspect.splunk.com/v1/app/report/{rid}",
            headers={"Authorization": f"Bearer {details['token']}"},
        )

        # Write result to disk for debugging
        with open(
            os.path.join(SPLUNK_HOME, "dev", "BADMSC", details["app"] + ".json"), "wb"
        ) as f:
            f.write(result.text)

        data = result.json()

        if not (
            data["summary"]["failure"] == 0
            and data["summary"]["error"] == 0
            and data["summary"]["manual_check"] == 0
        ):
            return {"payload": data, "status": 200}

        # Upload via ACS
        upload = requests.post(
            f"https://{details['dstacs']}/adminconfig/v2/apps/victoria",
            data=package,
            headers={
                "X-Splunk-Authorization": details["token"],
                "Authorization": f"Bearer {details['dsttoken']}",
                "ACS-Legal-Ack": "Y",
            },
        )
        return {"payload": upload.json(), "status": 201}
