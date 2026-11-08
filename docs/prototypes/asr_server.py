"""本地原型服务：页面和语音识别转发。

密钥只从项目根目录的 .env 读取，不放进页面，也不随静态文件提供。
"""
import asyncio
import json
import os
import uuid
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer

import websockets

ROOT = os.path.dirname(os.path.abspath(__file__))
PROJECT = os.path.dirname(os.path.dirname(ROOT))
ENV_PATH = os.path.join(PROJECT, ".env")
ASR_URL = "wss://dashscope.aliyuncs.com/api-ws/v1/inference"
MODEL = "paraformer-realtime-v2"


def load_key():
    if os.environ.get("DASHSCOPE_API_KEY"):
        return os.environ["DASHSCOPE_API_KEY"].strip()
    if not os.path.exists(ENV_PATH):
        raise RuntimeError("缺少项目根目录的 .env，其中需要 DASHSCOPE_API_KEY")
    with open(ENV_PATH, "r", encoding="utf-8") as handle:
        for line in handle:
            line = line.strip()
            if line.startswith("DASHSCOPE_API_KEY="):
                value = line.split("=", 1)[1].strip().strip('"').strip("'")
                if value:
                    return value
    raise RuntimeError(".env 里没有 DASHSCOPE_API_KEY")


async def recognize(pcm):
    key = load_key()
    task_id = str(uuid.uuid4())
    texts = []
    async with websockets.connect(
        ASR_URL,
        additional_headers={"Authorization": "Bearer " + key},
        open_timeout=20,
        max_size=8 * 1024 * 1024,
    ) as socket:
        await socket.send(json.dumps({
            "header": {"action": "run-task", "task_id": task_id, "streaming": "duplex"},
            "payload": {
                "task_group": "audio",
                "task": "asr",
                "function": "recognition",
                "model": MODEL,
                "parameters": {"format": "pcm", "sample_rate": 16000, "language_hints": ["zh", "en"]},
                "input": {},
            },
        }))
        started = False
        while not started:
            message = json.loads(await asyncio.wait_for(socket.recv(), 20))
            event = message.get("header", {}).get("event")
            if event == "task-started":
                started = True
            elif event == "task-failed":
                raise RuntimeError(message.get("header", {}).get("error_message") or "语音服务拒绝了这次请求")
        for index in range(0, len(pcm), 3200):
            await socket.send(pcm[index:index + 3200])
        await socket.send(json.dumps({
            "header": {"action": "finish-task", "task_id": task_id, "streaming": "duplex"},
            "payload": {"input": {}},
        }))
        while True:
            incoming = await asyncio.wait_for(socket.recv(), 30)
            if isinstance(incoming, bytes):
                continue
            message = json.loads(incoming)
            header = message.get("header", {})
            event = header.get("event")
            if event == "result-generated":
                sentence = ((message.get("payload") or {}).get("output") or {}).get("sentence") or {}
                if sentence.get("sentence_end") and sentence.get("text") and not sentence.get("heartbeat"):
                    texts.append(sentence["text"])
            elif event == "task-finished":
                break
            elif event == "task-failed":
                raise RuntimeError(header.get("error_message") or "语音识别失败")
    return "".join(texts)


class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=ROOT, **kwargs)

    def end_headers(self):
        self.send_header("Cache-Control", "no-store")
        super().end_headers()

    def do_GET(self):
        path = self.path.split("?", 1)[0]
        if path.startswith("/.") or "/." in path or path.endswith(".env"):
            self.send_error(404)
            return
        super().do_GET()

    def do_POST(self):
        if self.path.split("?", 1)[0] != "/api/asr":
            self.send_error(404)
            return
        length = int(self.headers.get("Content-Length") or 0)
        if length <= 0 or length > 8 * 1024 * 1024:
            self._json(400, {"error": "录音为空或过长"})
            return
        pcm = self.rfile.read(length)
        try:
            text = asyncio.run(recognize(pcm))
        except Exception as error:
            self._json(502, {"error": str(error)[:300]})
            return
        self._json(200, {"text": text})

    def _json(self, status, payload):
        body = json.dumps(payload, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def log_message(self, fmt, *args):
        print("[asr] " + (fmt % args))


if __name__ == "__main__":
    server = ThreadingHTTPServer(("127.0.0.1", 8765), Handler)
    print("原型与语音服务： http://127.0.0.1:8765/index.html")
    server.serve_forever()
