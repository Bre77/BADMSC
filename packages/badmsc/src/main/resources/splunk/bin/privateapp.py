from splunk.persistconn.application import PersistentServerConnectionApplication
import json
import requests
import logging
import tarfile
from io import BytesIO
import os
from pathlib import Path

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
            options = json.loads(args["payload"])
        except Exception as e:
            self.logger.info(f"Invalid payload. {e}")
            return {"payload": "Invalid JSON payload", "status": 400}

        app_dir = Path(os.path.join(SPLUNK_HOME, "etc", "apps", options["app"]))
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

        # Write tar_bytes_io to disk
        with open(
            os.path.join(SPLUNK_HOME, "dev", "BADMSC", options["app"] + ".tar.gz"), "wb"
        ) as f:
            f.write(package)

        return {"payload": str(app_dir), "status": 200}
        raise Exception("end")
