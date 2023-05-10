from splunk.persistconn.application import PersistentServerConnectionApplication
import json
import aiohttp
import asyncio
import json
import logging
import sys
from typing import Any, Dict, Union

logger = logging.getLogger(f"splunk.appserver.badmsc")

class SplunkHEC:

        RETRY_STATUS_CODES = [500, 503]

        def __init__(
            self,
            splunk_host: str,
            token: str,
            splunk_port: str = "8088",
            max_consumers: int = 20,
            max_qsize: int = 50_000,
            max_content_length: int = 100_000,
            max_retries: int = 2,
            verify_ssl: bool = False,
            timeout: int = 600,
        ) -> None:
            self.splunk_host = f"https://{splunk_host}:{splunk_port}/services/collector"
            self.headers: Dict[str, str] = {"Authorization": f"Splunk {token}"}
            self.max_consumers = max_consumers
            self.max_qsize = max_qsize
            self.max_content_length = max_content_length
            self.max_retries = max_retries
            self.verify_ssl = verify_ssl
            self.timeout = timeout
            self.count = 0
            self.queue = asyncio.Queue(maxsize=self.max_qsize)
            self.consumers = [
                asyncio.create_task(self._batch_post(self.queue))
                for _ in range(self.max_consumers)
            ]

        async def __aenter__(self):
            logger.debug("__aenter__")
            return self

        async def __aexit__(self, *args):
            logger.debug(f"__aexit__({args})")
            await self.queue.join()
            for consumer in self.consumers:
                consumer.cancel()
            logger.debug(f"Processed {self.count} events")


        async def _post_events(self, session, events) -> aiohttp.ClientResponse:
            return await session.post(
                self.splunk_host,
                headers=self.headers,
                data="".join(events),
                ssl=self.verify_ssl,
            )

        async def _batch_post(self, queue: asyncio.Queue):
            logger.debug("_batch_post")
            timeout = aiohttp.ClientTimeout(total=self.timeout)
            async with aiohttp.ClientSession(timeout=timeout) as session:
                while True:
                    retry_count = 0
                    logger.debug(f"Queue Size: {queue.qsize()}")
                    events = [json.dumps(await queue.get())]
                    while (
                        not queue.empty()
                        and sys.getsizeof(events) < self.max_content_length
                    ):
                        events.append(json.dumps(await queue.get()))

                    while retry_count <= self.max_retries:
                        retry: Union[str, bool] = False
                        try:
                            response = await self._post_events(session, events)
                            if response.status in self.RETRY_STATUS_CODES:
                                retry = f"Failed to post {len(events)} to {self.splunk_host}, status: {response.status}, response: {response.content}"
                            else:
                                break
                        except asyncio.exceptions.TimeoutError:
                            retry = f"Timeout when posting {len(events)} events to {self.splunk_host}"
                        except:  # type: ignore
                            logger.warn(
                                f"Failed to post {len(events)} events", exc_info=True
                            )
                            break
                        finally:
                            if retry:
                                retry_count += 1
                                if retry_count <= self.max_retries:
                                    logger.warn(f"retry_count: {retry_count}, msg: {retry}")
                                    await asyncio.sleep(retry_count * 2)
                    self.count += len(events)
                    for _ in events:
                        queue.task_done()


class data(PersistentServerConnectionApplication):
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

        self.logger.info(args["payload"])

        count = 0
        async def loop():
            async with aiohttp.ClientSession() as session:
                async with SplunkHEC(
                    splunk_host=options["dest_hec"],
                    token=options["dest_token"],
                    splunk_port=443,
                    verify_ssl=True,
                ) as hec:
                    async with session.post(
                        f"https://{options['src_api']}/services/search/v2/jobs/export?output_mode=json",
                        headers={"Authorization": f"Splunk {options['src_token']}"},
                        data={
                            "search": f"search index={options['index']}",
                            "earliest_time": options['earliest'],
                            "latest_time": options['latest'],
                            "enable_lookups": False,
                            "exec_mode": "oneshot",
                            "time_format": "%s",
                            "f": [
                                "_time",
                                "host",
                                "source",
                                "sourcetype",
                                "splunk_server",
                                "_raw",
                            ],
                        },
                    ) as search:
                        async for line in search.content:
                            data = json.loads(line)
                            if "result" in data:
                                count += 1
                                await hec.queue.put(
                                    {
                                        "index": data["result"]["index"],
                                        "time": data["result"]["_time"],
                                        "host": data["result"]["host"],
                                        "source": data["result"]["source"],
                                        "sourcetype": data["result"]["sourcetype"],
                                        "event": data["result"]["_raw"],
                                        "fields": {"origin": data["result"]["splunk_server"]},
                                    }
                                )
        asyncio.run(loop())
        return {"payload": str(count), "status": 200}

    