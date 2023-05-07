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
APP_NAME = "badmsc"


class request(PersistentServerConnectionApplication):
    def __init__(self, command_line, command_arg, logger=None):
        super(PersistentServerConnectionApplication, self).__init__()
        self.logger = logger
        if self.logger == None:
            self.logger = logging.getLogger(f"splunk.appserver.{APP_NAME}")

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

        PACKAGE_PATH = os.path.join(
            SPLUNK_HOME,
            "etc",
            "apps",
            APP_NAME,
            "temp",
            details["app"] + ".tgz",
        )

        step = details.get("step")
        if step == 1:
            try:
                app_dir = Path(os.path.join(SPLUNK_HOME, "etc", "apps", details["app"]))
                tar_bytes_io = BytesIO()
                # Create the tar file
                with tarfile.open(fileobj=tar_bytes_io, mode="w:gz") as tar:
                    # Add all files and directories in the app directory to the tar file
                    for file_path in app_dir.glob("**/*"):
                        # Exclude the local directory
                        self.logger.info(str(file_path.relative_to(app_dir)))
                        parts = file_path.relative_to(app_dir).parts
                        try:
                            if parts[0].startswith("."):
                                continue
                            if parts[0] == "local":
                                continue
                            if parts[-1].endswith(".pyc") or parts[-1].endswith(".so"):
                                continue
                            if parts[0] == "metadata" and parts[1] == "local.meta":
                                continue
                            if (
                                parts[0] == "lookups"
                                and parts[1] == "lookup_file_backups"
                            ):
                                continue
                            if parts[1] == "__pycache__":
                                continue
                        except IndexError:
                            pass

                        tar.add(
                            str(file_path),
                            arcname=file_path.relative_to(app_dir.parent),
                            recursive=False,
                        )

                # Get the bytes of the tar file
                package = tar_bytes_io.getvalue()

                # Write package to disk so we can upload it to ACS later
                with open(
                    PACKAGE_PATH,
                    "wb",
                ) as f:
                    f.write(package)

                # Upload to AppInspect
                upload = requests.post(
                    "https://appinspect.splunk.com/v1/app/validate",
                    files={
                        "app_package": (f"{details['app']}.tgz", package),
                        "included_tags": (None, "private_victoria"),
                    },
                    headers={"Authorization": f"bearer {details['token']}"},
                )
                return {"payload": upload.text, "status": 200}
            except Exception as e:
                self.logger.error(str(e))
                return {"payload": str(e), "status": 500}

        if step == 2:
            try:
                # Upload via ACS
                upload = requests.post(
                    f"https://{details['dstacs']}/adminconfig/v2/apps/victoria",
                    data=open(PACKAGE_PATH,'rb'),
                    headers={
                        "X-Splunk-Authorization": details["token"],
                        "Authorization": f"Bearer {details['dsttoken']}",
                        "ACS-Legal-Ack": "Y",
                    },
                )
                # Delete the package from disk
                os.remove(PACKAGE_PATH)
                return {"payload": upload.text, "status": 200}
            except Exception as e:
                self.logger.error(str(e))
                return {"payload": str(e), "status": 500}
        return {"payload": "Invalid Request", "status": 400}
