from flask import Flask, request, jsonify, Response
from flask_cors import CORS

from accelerate import Accelerator
from transformers import AutoModelForCausalLM, AutoTokenizer, TextIteratorStreamer
import torch
import threading
import json

# 初始化 Flask
app = Flask(__name__)

# 啟用 CORS，允許所有來源對此伺服器的跨網域請求
CORS(
    app,
    resources={r"/*": {"origins": "*"}},
    expose_headers=["Content-Disposition", "Cache-Control", "X-Accel-Buffering"],
    methods=["GET", "POST", "OPTIONS"],
)

# 載入模型與 Tokenizer
device_map = {"": Accelerator().local_process_index}
model = AutoModelForCausalLM.from_pretrained(
    "fine_tune_model/deepseek",
    torch_dtype=torch.bfloat16,
    device_map=device_map,
)
tokenizer = AutoTokenizer.from_pretrained("fine_tune_model/deepseek")

# 全域變數：儲存對話歷史（示範只支援「單一對話」，若要多用戶可自行改成 dict）
user_conversations = []
conversations_lock = threading.Lock()


def build_messages(prompt: str, restart: bool):
    """處理對話歷史，返回要送入模型的 messages。"""
    with conversations_lock:
        if restart:
            user_conversations.clear()
            return []
        user_conversations.append({"role": "user", "content": prompt})
        return user_conversations[-10:]  # 只取最近 10 則，防止 Context 太長


def prepare_inputs(messages):
    """把多輪對話格式化，轉成模型需要的 input tensors"""
    text = tokenizer.apply_chat_template(messages, tokenize=False)
    inputs = tokenizer([text], return_tensors="pt")

    if torch.cuda.is_available():
        inputs = {k: v.cuda() for k, v in inputs.items()}

    return inputs


def generate_response(model_inputs, streamer):
    """後端背景執行的生成任務。"""
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


def stream_response(streamer):
    """SSE串流回應，並更新對話歷史，同時後台即時顯示。"""
    bot_response = ""
    try:
        print(f"\n[流式輸出]", end='')
        for new_text in streamer:
            if isinstance(new_text, str):
                bot_response += new_text
                print(new_text, flush=True, end='')  # ⭐️ 後台即時顯示
                yield f"data: {json.dumps({'text': new_text})}\n\n"
    except Exception as e:
        print(f"串流輸出錯誤: {e}")
        yield f"data: {json.dumps({'error': '串流發生錯誤'})}\n\n"
    finally:
        if bot_response:
            print(f"\n[完整回應] {bot_response}", flush=True)  # ⭐️ 後台顯示完整回應
            with conversations_lock:
                user_conversations.append({
                    "role": "assistant",
                    "content": bot_response
                })


@app.route("/generate", methods=["POST"])
def generate_api():
    """接收前端的 POST /generate，回傳 SSE。"""
    try:
        data = request.get_json()
        prompt = data.get("prompt", "")
        restart = data.get("restart", False)
        print('Input:', prompt)
        
        if not prompt and not restart:
            return jsonify({"status": 400, "message": "缺少消息內容"}), 400

        messages = build_messages(prompt, restart)

        if restart:
            return Response(
                f"data: {json.dumps({'text': '您好，有什麼能幫您的？'})}\n\n",
                mimetype="text/event-stream",
                headers={
                    "Cache-Control": "no-cache",
                    "X-Accel-Buffering": "no"
                }
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
            stream_response(streamer),
            mimetype="text/event-stream",
            headers={
                "Cache-Control": "no-cache",
                "X-Accel-Buffering": "no"
            }
        )

    except Exception as e:
        print(f"路由處理錯誤: {e}")
        return jsonify({"status": 500, "message": "伺服器錯誤"}), 500


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, threaded=True, debug=True)
