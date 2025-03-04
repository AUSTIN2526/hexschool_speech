from flask import Flask, request, jsonify, Response
from accelerate import Accelerator
from transformers import AutoModelForCausalLM, AutoTokenizer, TextIteratorStreamer
from collections import defaultdict
from datetime import datetime
import torch
import threading
import json
from typing import Dict, List, Generator, Any

# 初始化 Flask
app = Flask(__name__)

# 模型與 tokenizer
device_map = {"": Accelerator().local_process_index}
model = AutoModelForCausalLM.from_pretrained(
    'fine_tune_model/deepseek',
    torch_dtype=torch.bfloat16,
    device_map=device_map,
)
tokenizer = AutoTokenizer.from_pretrained('fine_tune_model/deepseek')

# 全局變數
user_conversations: Dict[str, List[Dict[str, str]]] = defaultdict(list)
user_last_active: Dict[str, datetime] = {}
conversations_lock = threading.Lock()


def build_messages(user_id: str, prompt: str, restart: bool) -> List[Dict[str, str]]:
    """處理對話歷史，返回要送入模型的 messages"""
    with conversations_lock:
        user_last_active[user_id] = datetime.utcnow()

        if restart:
            user_conversations[user_id].clear()
            return []

        user_conversations[user_id].append({"role": "user", "content": prompt})
        return user_conversations[user_id][-10:]  # 取最近 10 則


def prepare_inputs(messages: List[Dict[str, str]]) -> Dict[str, torch.Tensor]:
    """準備模型輸入"""
    text = tokenizer.apply_chat_template(messages, tokenize=False)
    inputs = tokenizer([text], return_tensors="pt")

    if torch.cuda.is_available():
        inputs = {k: v.cuda() for k, v in inputs.items()}

    return inputs


def generate_response(
    model_inputs: Dict[str, torch.Tensor],
    streamer: TextIteratorStreamer
) -> None:
    """背景生成任務"""
    try:
        with torch.no_grad():
            model.generate(
                max_new_tokens=32468,
                temperature=0.3,
                top_p=0.95,
                top_k=50,
                repetition_penalty=1.2,
                do_sample=True,
                streamer=streamer,
                **model_inputs
            )
    except Exception as e:
        print(f"生成文本錯誤: {e}")


def stream_response(
    user_id: str,
    streamer: TextIteratorStreamer
) -> Generator[str, None, None]:
    """串流回應並更新對話歷史"""
    bot_response = ""
    try:
        for new_text in streamer:
            if isinstance(new_text, str):
                bot_response += new_text
                yield f"data: {json.dumps({'text': new_text})}\n\n"
    except Exception as e:
        print(f"串流輸出錯誤: {e}")
        yield f"data: {json.dumps({'error': '串流發生錯誤'})}\n\n"
    finally:
        if bot_response:
            with conversations_lock:
                user_conversations[user_id].append({
                    "role": "assistant",
                    "content": bot_response
                })


@app.route('/generate/<user_id>', methods=['POST'])
def generate(user_id: str) -> Any:
    try:
        data = request.get_json()
        prompt = data.get("prompt")
        restart = data.get("restart", False)

        if not prompt and not restart:
            return jsonify({"status": 400, "message": "缺少消息內容"}), 400

        messages = build_messages(user_id, prompt or "", restart)

        if restart:
            return Response(
                f"data: {json.dumps({'text': '您好有什麼事情能幫助您的?'})}\n\n",
                mimetype='text/event-stream',
                headers={'Cache-Control': 'no-cache', 'X-Accel-Buffering': 'no'}
            )

        try:
            model_inputs = prepare_inputs(messages)
        except Exception as e:
            print(f"輸入準備錯誤: {e}")
            return jsonify({"status": 500, "message": "模型輸入處理錯誤"}), 500

        streamer = TextIteratorStreamer(
            tokenizer,
            skip_prompt=True,
            skip_special_tokens=True,
            timeout=10.0
        )

        threading.Thread(
            target=generate_response,
            args=(model_inputs, streamer),
            daemon=True
        ).start()

        return Response(
            stream_response(user_id, streamer),
            mimetype='text/event-stream',
            headers={'Cache-Control': 'no-cache', 'X-Accel-Buffering': 'no'}
        )

    except Exception as e:
        print(f"路由處理錯誤: {e}")
        return jsonify({"status": 500, "message": "伺服器錯誤"}), 500


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, threaded=True)
