import os
import sys
import csv
import time
import requests
import json

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "lib"))
from splunklib.modularinput import *


class Input(Script):
    MASK = "<encrypted>"
    APP = "badmsc"

    def get_scheme(self):
        scheme = Scheme("Data Pull")
        scheme.description = "Index data from a Splunk Search Head. Put the target index name as the input name"
        scheme.use_external_validation = False
        scheme.streaming_mode_xml = True
        scheme.use_single_instance = False

        scheme.add_argument(
            Argument(
                name="earliest",
                title="Backfill Days",
                data_type=Argument.data_type_number,
                required_on_create=True,
                required_on_edit=False,
            )
        )

        return scheme

    def stream_events(self, inputs, ew):
        self.service.namespace["app"] = self.APP
        # Get Variables
        input_name, input_items = inputs.inputs.popitem()
        kind, name = input_name.split("://")
        checkpointfile = os.path.join(
            self._input_definition.metadata["checkpoint_dir"], name
        )
        
        input = self.service.inputs.__getitem__((name, kind))
        
        # Set start to earliest days ago
        start = int(time.time()) - (int(input_items["earliest"]) * 86400)
        end = int(time.time()) - 60

        stored_password = [
            x
            for x in self.service.storage_passwords
            if x.username == "auth" and x.realm == "badmsc"
        ]
        config = json.loads(stored_password[0].content.clear_password)

        url = f"https://{config['src']['api']}/services/search/v2/jobs/export"
        auth = f"Splunk {config['src']['token']}"
        MOD = 1000

        ew.log(
            EventWriter.INFO,
            f"status=startup name={name} url={url}",
        )

        # Checkpoint
        try:
            earliest = max(int(open(checkpointfile, "r").read()), start)
        except:
            earliest = start

        with requests.Session() as s:
            s.headers.update({"Authorization": auth})

            # Do the logic
            while earliest < end:
                latest = min(earliest + 86400, end)
                ew.log(
                    EventWriter.INFO,
                    f"status=search name={name} earliest={earliest} latest={latest} start={start} end={end}",
                )
                with s.post(
                    url,
                    stream=True,
                    data={
                        "search": f"search index={name}",
                        "index_earliest": earliest,
                        "index_latest": latest,
                        "enable_lookups": False,
                        "output_mode": "csv",
                        "exec_mode": "oneshot",
                        "time_format": "%s",
                        "adhoc_search_level": "fast",
                        "f": [
                            "_time",
                            "host",
                            "source",
                            "sourcetype",
                            "_raw",
                        ],
                    },
                ) as r:
                    if r.status_code != requests.codes.ok:
                        ew.log(
                            EventWriter.ERROR,
                            f"status=error name={name} response={r.status_code}",
                        )
                        time.sleep(1)
                        input.disable()
                        sys.exit()
                    count = 0
                    rows = r.iter_lines(decode_unicode=True)
                    for row in rows:
                        if row != '"_time",host,source,sourcetype,"_raw"':
                            ew.log(
                                EventWriter.ERROR,
                                f"status=error headers={row}",
                            )
                            time.sleep(1)
                            input.disable()
                            sys.exit()
                        break
                    for row in csv.reader(
                        rows,
                        delimiter=",",
                        quotechar='"',
                    ):
                        ew.write_event(
                            Event(
                                index=name,
                                time=row[0],
                                host=row[1],
                                source=row[2],
                                sourcetype=row[3],
                                data=row[4],
                            )
                        )
                        count += 1
                        if count % MOD == 0:
                            ew.log(
                                EventWriter.INFO,
                                f"status=progress progress={MOD} name={name} current={row[0]} earliest={earliest} latest={latest} start={start} end={end}",
                            )
                    ew.log(
                        EventWriter.INFO,
                        f"status=done total={count} progress={count % MOD} name={name} earliest={earliest} latest={latest} start={start} end={end}",
                    )

                # Save Progress
                open(checkpointfile, "w").write(str(latest))
                earliest = latest


if __name__ == "__main__":
    exitcode = Input().run(sys.argv)
    sys.exit(exitcode)
