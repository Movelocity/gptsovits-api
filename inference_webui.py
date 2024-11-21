'''
按中英混合识别
按日英混合识别
多语种启动切分识别语种
全部按中文识别
全部按英文识别
全部按日文识别
'''
import os, re, logging
import LangSegment
if False:
    logging.getLogger("markdown_it").setLevel(logging.ERROR)
    logging.getLogger("urllib3").setLevel(logging.ERROR)
    logging.getLogger("httpcore").setLevel(logging.ERROR)
    logging.getLogger("httpx").setLevel(logging.ERROR)
    logging.getLogger("asyncio").setLevel(logging.ERROR)
    logging.getLogger("charset_normalizer").setLevel(logging.ERROR)
    logging.getLogger("torchaudio._extension").setLevel(logging.ERROR)
# import pdb

import gradio as gr
from transformers import AutoModelForMaskedLM, AutoTokenizer
import numpy as np
import librosa, torch
import soundfile as sf

from module.models import SynthesizerTrn
from AR.models.t2s_lightning_module import Text2SemanticLightningModule
from text import cleaned_text_to_sequence
from text.cleaner import clean_text
from time import time as ttime
from module.mel_processing import spectrogram_torch
from my_utils import load_audio
from i18n.i18n import I18nAuto
from cuts import splits, cuts, merge_short_text_in_array


import whisper
###################### global variables #######################
i18n = I18nAuto()

gpt_path = "pretrained_models/s1bert25hz-2kh-longer-epoch=68e-step=50232.ckpt"  # gweight.txt
sovits_path = "pretrained_models/s2G488k.pth"  # sweight.txt
bert_path = "pretrained_models/chinese-roberta-wwm-ext-large"

infer_tts_port = int(os.environ.get("infer_tts_port", 9872))

is_share = eval(os.environ.get("is_share", "False"))
is_half = eval(os.environ.get("is_half", "True"))
print(f"is_half: {is_half}")

dtype = torch.float16 if is_half else torch.float32

if "_CUDA_VISIBLE_DEVICES" in os.environ:
    os.environ["CUDA_VISIBLE_DEVICES"] = os.environ["_CUDA_VISIBLE_DEVICES"]

os.environ['PYTORCH_ENABLE_MPS_FALLBACK'] = '1'  # 确保直接启动推理UI时也能够设置。

device = "cuda" if torch.cuda.is_available() else 'cpu'

from feature_extractor import cnhubert
cnhubert_base_path = "pretrained_models/chinese-hubert-base"
# cnhubert.cnhubert_base_path = cnhubert_base_path

dict_language = {
    i18n("中文"): "all_zh",     # 全部按中文识别
    i18n("英文"): "en",         # 全部按英文识别#######不变
    i18n("日文"): "all_ja",     # 全部按日文识别
    i18n("中英混合"): "zh",     # 按中英混合识别####不变
    i18n("日英混合"): "ja",     # 按日英混合识别####不变
    i18n("多语种混合"): "auto", # 多语种启动切分识别语种
}

# langs = [
#     "all_zh",     # 全部按中文识别
#     "en",         # 全部按英文识别#######不变
#     "all_ja",     # 全部按日文识别
#     "zh",     # 按中英混合识别####不变
#     "ja",     # 按日英混合识别####不变
#     "auto", # 多语种启动切分识别语种
# ]


model_dict = {
    "ssl_model": None,
    "tokenizer": None,
    "bert_model": None,
    "whisper_model": None,
    "vq_model": None,
    "hps": None,
    "hz": 50,
    "max_sec": None,
}

def load_ssl_model():
    if model_dict['ssl_model'] is None:
        print("[模型加载] CNHubert")
        t1 = ttime()
        ssl_model = cnhubert.CNHubert(cnhubert_base_path).eval()
        if is_half:
            ssl_model = ssl_model.half()
        model_dict['ssl_model'] = ssl_model.to(device)
        t2 = ttime()
        print(f'time used: {t2-t1}')

load_ssl_model()

def get_tokenizer():
    if model_dict['tokenizer'] is None:
        model_dict['tokenizer'] = AutoTokenizer.from_pretrained(bert_path)
    return model_dict['tokenizer']

def get_bert_model():
    if model_dict['bert_model'] is None:
        print('loading bert model...')
        t1 = ttime()
        bert_model = AutoModelForMaskedLM.from_pretrained(bert_path).eval()
        if is_half:
            bert_model = bert_model.half()
        model_dict['bert_model'] = bert_model.to(device)
        t2 = ttime()
        print(f'time used: {t2-t1}')
    return model_dict['bert_model']

def get_whisper_model():
    if model_dict['whisper_model'] is None:
        print('loading whisper model...')
        t1 = ttime()
        # 下载模型, options: ['tiny', 'base', 'small', 'medium', 'large']
        model_dict['whisper_model'] = whisper.load_model("small")  
        t2 = ttime()
        print(f'time used: {t2-t1}')
    return model_dict['whisper_model']

###################################################################

def speech2text(audio_path):
    if not audio_path:
        return ''
    print(f"reading: {audio_path}")

    whisper_model = get_whisper_model()

    t1 = ttime()
    result = whisper_model.transcribe(audio_path, language='zh', initial_prompt='以下是普通话：')
    t2 = ttime()
    print(f'asr time: {t2 - t1}')
    return result['text']


class DictToAttrRecursive(dict):
    def __init__(self, input_dict):
        super().__init__(input_dict)
        for key, value in input_dict.items():
            if isinstance(value, dict):
                value = DictToAttrRecursive(value)
            self[key] = value
            setattr(self, key, value)

    def __getattr__(self, item):
        try:
            return self[item]
        except KeyError:
            raise AttributeError(f"Attribute {item} not found")

    def __setattr__(self, key, value):
        if isinstance(value, dict):
            value = DictToAttrRecursive(value)
        super(DictToAttrRecursive, self).__setitem__(key, value)
        super().__setattr__(key, value)

    def __delattr__(self, item):
        try:
            del self[item]
        except KeyError:
            raise AttributeError(f"Attribute {item} not found")


def change_sovits_weights(sovits_path):
    dict_s2 = torch.load(sovits_path, map_location="cpu")
    hps = dict_s2["config"]

    hps = DictToAttrRecursive(hps)
    hps.model.semantic_frame_rate = "25hz"
    print("Loading VITS2 module...")
    t1 = ttime()
    vq_model = SynthesizerTrn(
        hps.data.filter_length // 2 + 1,
        hps.train.segment_size // hps.data.hop_length,
        n_speakers=hps.data.n_speakers,
        **hps.model
    ).eval()
    if ("pretrained" not in sovits_path):
        del vq_model.enc_q
    vq_model.load_state_dict(dict_s2["weight"], strict=False)

    if is_half == True:
        vq_model = vq_model.half()
    model_dict['vq_model'] = vq_model.to(device)

    t2 = ttime()
    print(f"time used: {t2 - t1}")

    model_dict['hps'] = hps


def change_gpt_weights(gpt_path):
    print("Loading GPT module...")
    dict_s1 = torch.load(gpt_path, map_location="cpu")
    config = dict_s1["config"]
    model_dict['max_sec'] = config["data"]["max_sec"]

    t1 = ttime()
    t2s_model = Text2SemanticLightningModule(config, "****", is_train=False).eval()
    t2s_model.load_state_dict(dict_s1["weight"])
    if is_half == True:
        t2s_model = t2s_model.half()
    t2s_model = t2s_model.to(device)
    t2 = ttime()
    print(f"time used: {t2 - t1}")

    total = sum([param.nelement() for param in t2s_model.parameters()])
    print("Number of parameter: %.2fM" % (total / 1e6))

    model_dict['t2s_model'] = t2s_model

change_sovits_weights(sovits_path)
change_gpt_weights(gpt_path)


zero_wav = np.zeros(
    int(model_dict['hps'].data.sampling_rate * 0.3),  # 0.3 秒
    dtype=np.float16 if is_half == True else np.float32,
)

def get_prompt(wav_path):
    with torch.no_grad():
        wav16k, sr = librosa.load(wav_path, sr=16000)
        if (wav16k.shape[0] > 160000 or wav16k.shape[0] < 48000):
            raise ValueError(i18n("参考音频在3~10秒范围外，请更换！"))
        
        wav16k = torch.from_numpy(wav16k)
        zero_wav_torch = torch.from_numpy(zero_wav)
        if is_half == True:
            wav16k = wav16k.half()
            zero_wav_torch = zero_wav_torch.half()
        wav16k = wav16k.to(device)
        zero_wav_torch = zero_wav_torch.to(device)

        wav16k = torch.cat([wav16k, zero_wav_torch])
        ssl_content = model_dict['ssl_model'].model(wav16k.unsqueeze(0))["last_hidden_state"].transpose(1, 2)  # .float()
        # print(f"> ssl_content.shape: {ssl_content.shape}") # batch, dim, seq_len # [1, 768, 280]

        codes = model_dict['vq_model'].extract_latent(ssl_content)
        prompt_semantic = codes[0, 0].unsqueeze(0).to(device)
        # print(f"> voice prompt shape: {prompt_semantic.shape}")  # [1, 140]
    return prompt_semantic


def get_spec(cfg, filename):
    audio = load_audio(filename, int(cfg.sampling_rate))
    audio_norm = torch.FloatTensor(audio)
    audio_norm = audio_norm.unsqueeze(0)
    spec = spectrogram_torch(
        audio_norm,
        cfg.filter_length,
        cfg.sampling_rate,
        cfg.hop_length,
        cfg.win_length,
        center=False,
    )
    return spec

############ bert processing ##################

def get_bert_feature(text, word2ph):
    assert len(word2ph) == len(text)

    tokenizer = get_tokenizer()
    bert_model = get_bert_model()  # chinese-roberta-wwm-ext-large

    with torch.no_grad():
        inputs = tokenizer(text, return_tensors="pt")
        for i in inputs:
            inputs[i] = inputs[i].to(device)
        res = bert_model(**inputs, output_hidden_states=True)
        res = torch.cat(res["hidden_states"][-3:-2], -1)[0].cpu()[1:-1]
    
    """
    >>> a
    tensor([1, 2, 3])
    >>> a.repeat(3)
    tensor([1, 2, 3, 1, 2, 3, 1, 2, 3])
    >>> a.repeat(3, 1)
    tensor([[1, 2, 3],
            [1, 2, 3],
            [1, 2, 3]])
    """
    phone_level_feature = []
    for i, repeats in enumerate(word2ph):
        repeat_feature = res[i].repeat(repeats, 1)
        phone_level_feature.append(repeat_feature)
    phone_level_feature = torch.cat(phone_level_feature, dim=0)
    # print(f"bert_feature shape: {phone_level_feature.shape}")
    return phone_level_feature.T

def clean_text_inf(text, language):
    phones, word2ph, norm_text = clean_text(text, language)
    phones = cleaned_text_to_sequence(phones)
    return phones, word2ph, norm_text

def get_bert_inf(phones, word2ph, norm_text, language):
    language=language.replace("all_","")
    if language == "zh":
        bert = get_bert_feature(norm_text, word2ph).to(device)#.to(dtype)
    else:
        bert = torch.zeros(
            (1024, len(phones)),
            dtype=torch.float16 if is_half == True else torch.float32,
        ).to(device)
    return bert

def get_phones_and_bert(text, language):
    if language in {"en", "all_zh", "all_ja"}:
        language = language.replace("all_","")

        if language == "en":
            LangSegment.setfilters(["en"])
            formattext = " ".join(tmp["text"] for tmp in LangSegment.getTexts(text))
        else:
            # 无法区别中日文汉字,以用户输入为准
            formattext = text

        while "  " in formattext:
            formattext = formattext.replace("  ", " ")

        phones, word2ph, norm_text = clean_text_inf(formattext, language)

        if language == "zh":
            bert = get_bert_feature(norm_text, word2ph).to(device)
        else:
            bert = torch.zeros(
                (1024, len(phones)),
                dtype=torch.float16 if is_half == True else torch.float32,
            ).to(device)
    elif language in {"zh", "ja", "auto"}:
        LangSegment.setfilters(["zh", "ja", "en"])
        textlist, langlist = [], []
        if language == "auto":
            for tmp in LangSegment.getTexts(text):
                langlist.append(tmp["lang"])
                textlist.append(tmp["text"])
        else:
            for tmp in LangSegment.getTexts(text):
                if tmp["lang"] == "en":
                    langlist.append(tmp["lang"])
                else:
                    # 因无法区别中日文汉字,以用户输入为准
                    langlist.append(language)
                textlist.append(tmp["text"])

        print(f"{textlist} {langlist}")

        phones_list, bert_list, norm_text_list = [], [], []
        for i in range(len(textlist)):
            lang = langlist[i]
            phones, word2ph, norm_text = clean_text_inf(textlist[i], lang)
            bert = get_bert_inf(phones, word2ph, norm_text, lang)
            phones_list.append(phones)
            norm_text_list.append(norm_text)
            bert_list.append(bert)
        bert = torch.cat(bert_list, dim=1).to(dtype)
        phones = sum(phones_list, [])
        norm_text = ''.join(norm_text_list)

    return phones, bert, norm_text

############ text splitter ###################


cuts_map = {
    i18n("凑四句一切"): "every_four_sentences",
    i18n("凑50字一切"): "every_50_chars",
    i18n("按中文句号。切"): "。",
    i18n("按英文句号.切"): ".",
    i18n("按标点符号切"): "sign",
    i18n("不切"): "none"
}


def split_text(text, how_to_cut=i18n("不切")):
    pattern = "[" + "".join(re.escape(sep) for sep in splits) + "]"
    first_word = re.split(pattern, text.strip())[0].strip()
    
    if text[0] not in splits and len(first_word) < 4: 
        text = ("。" if text_language != "en" else ".") + text

    # print("target text: ", text)
    cut_name = cuts_map.get(how_to_cut)
    cut_fn = cuts.get(cut_name)
    text = cut_fn(text)

    while "\n\n" in text:
        text = text.replace("\n\n", "\n")
    texts = text.split("\n")
    texts = merge_short_text_in_array(texts, threshold=5)
    print(f"segments: {texts}")
    return texts

##################### main tts ###########################

def get_tts_wav(ref_wav_path, prompt_text, prompt_language, text, text_language, how_to_cut=i18n("不切"), top_k=20, top_p=0.6, temperature=0.6, ref_free = False):
    if prompt_text is None or len(prompt_text) == 0:
        ref_free = True

    prompt_language = dict_language[prompt_language]
    text_language = dict_language[text_language]
    if not ref_free:
        prompt_text = prompt_text.strip("\n")
        if (prompt_text[-1] not in splits): prompt_text += "。" if prompt_language != "en" else "."
        # print("prompt_text: ", prompt_text)

        prompt_phonemes, bert1, norm_text1 = get_phones_and_bert(prompt_text, prompt_language)

    texts = split_text(text, how_to_cut)

    voice_prompt = get_prompt(ref_wav_path)
    refer_spec = get_spec(model_dict['hps'].data, ref_wav_path)  # .to(device)
    if is_half == True:
        refer_spec = refer_spec.half()
    refer_spec = refer_spec.to(device)

    audio_opt = []
    for text in texts:
        # 解决输入目标文本的空行导致报错的问题
        if (len(text.strip()) == 0):
            continue
        if (text[-1] not in splits): 
            text += "。" if text_language != "en" else "."
        # print(i18n("实际输入的目标文本(每句):"), text)

        phonemes, bert2, norm_text2 = get_phones_and_bert(text, text_language)
        # print(i18n("前端处理后的文本(每句):"), norm_text2)
        if not ref_free:
            bert_feat = torch.cat([bert1, bert2], 1)
            all_phoneme_ids = torch.LongTensor(prompt_phonemes + phonemes).to(device).unsqueeze(0)
        else:
            bert_feat = bert2
            all_phoneme_ids = torch.LongTensor(phonemes).to(device).unsqueeze(0)

        bert_feat = bert_feat.to(device).unsqueeze(0)
        all_phoneme_len = torch.tensor([all_phoneme_ids.shape[-1]]).to(device)

        with torch.no_grad():
            pred_semantic, idx = model_dict['t2s_model'].model.infer_panel(
                all_phoneme_ids,
                all_phoneme_len,
                None if ref_free else voice_prompt,
                bert_feat,
                # prompt_phone_len=ph_offset,
                top_k=top_k,
                top_p=top_p,
                temperature=temperature,
                early_stop_num=model_dict['hz'] * model_dict['max_sec'],
            )
        # print(pred_semantic.shape,idx)
        pred_semantic = pred_semantic[:, -idx:].unsqueeze(0)  # .unsqueeze(0)  # mq 要多 unsqueeze 一次
        
        # audio = vq_model.decode(pred_semantic, all_phoneme_ids, refer).detach().cpu().numpy()[0, 0]
        audio = (
            model_dict['vq_model'].decode(
                pred_semantic, 
                torch.LongTensor(phonemes).to(device).unsqueeze(0), 
                refer_spec
            ).detach().cpu().numpy()[0, 0]
        )  ### 试试重建不带上 prompt 的部分
        
        max_audio=np.abs(audio).max()  # 简单防止16bit爆音
        if max_audio > 1: audio /= max_audio
        audio_opt.append(audio)
        audio_opt.append(zero_wav)

    # 采样率, 16bit 音频
    # return hps.data.sampling_rate, (np.concatenate(audio_opt, 0) * 32768).astype(np.int16)
    audio_16bit = (np.concatenate(audio_opt, 0) * 32768).astype(np.int16)
    sf.write('TEMP/tmp.mp3', audio_16bit, model_dict['hps'].data.sampling_rate)
    return os.path.join(os.getcwd(), 'TEMP', 'tmp.mp3')





def custom_sort_key(s):
    # 使用正则表达式提取字符串中的数字部分和非数字部分
    parts = re.split('(\d+)', s)
    # 将数字部分转换为整数，非数字部分保持不变
    parts = [int(part) if part.isdigit() else part for part in parts]
    return parts


def change_choices():
    SoVITS_names, GPT_names = get_weights_names()
    return {
        "choices": sorted(SoVITS_names, key=custom_sort_key),
        "__type__": "update"
    }, {
        "choices": sorted(GPT_names, key=custom_sort_key), 
        "__type__": "update"
    }


def get_weights_names():
    pretrained_sovits_name = "pretrained_models/s2G488k.pth"
    pretrained_gpt_name = "pretrained_models/s1bert25hz-2kh-longer-epoch=68e-step=50232.ckpt"
    SoVITS_weight_root = "pretrained_models/SoVITS_weights"
    GPT_weight_root = "pretrained_models/GPT_weights"
    os.makedirs(SoVITS_weight_root, exist_ok=True)
    os.makedirs(GPT_weight_root, exist_ok=True)

    SoVITS_names = [pretrained_sovits_name]
    for name in os.listdir(SoVITS_weight_root):
        if name.endswith(".pth"): 
            SoVITS_names.append("%s/%s" % (SoVITS_weight_root, name))
    GPT_names = [pretrained_gpt_name]
    for name in os.listdir(GPT_weight_root):
        if name.endswith(".ckpt"): 
            GPT_names.append("%s/%s" % (GPT_weight_root, name))
    return SoVITS_names, GPT_names

# SoVITS模型列表, GPT模型列表
SoVITS_names, GPT_names = get_weights_names()

refresh_symbol = '\U0001f504'  # 🔄

class FormComponent:
    def get_expected_parent(self):
        return gr.components.Form
class FormRow(FormComponent, gr.Row):
    """Same as gr.Row but fits inside gradio forms"""
    def get_block_name(self):
        return "row"

# theme spacing_size='md', radius_size='md'

from cuts import cut1, cut2, cut3, cut4, cut5

test_text = """我对Japanese culture有着独特的热爱，尤其是song和animation. 我是原神的忠实粉丝，如果你也是，我们一定可以成为好朋友。原神！启动！
In a summary, 我是一位热爱生活、工作和学习的人。期待在这里与大家共同进步，共创辉煌！"""

with gr.Blocks(title="GPT-SoVITS WebUI", theme=gr.themes.Default()) as app:
    with gr.Tab(label=i18n("*参考语音")):
        with gr.Row():
            with gr.Column():
                inp_ref = gr.Audio(label=i18n("请上传3~10秒内参考音频，超过会报错！"), type="filepath")
                with gr.Row():
                    prompt_language = gr.Dropdown(
                        label="*"+i18n("参考音频的语种"),
                        choices=[i18n("中文"), i18n("英文"), i18n("日文"), i18n("中英混合"), i18n("日英混合"), i18n("多语种混合")], 
                        value=i18n("中文")
                    )
                    with gr.Column():
                        ref_text_free = gr.Checkbox(
                            label=i18n("开启无参考文本模式。不填参考文本亦相当于开启。"), 
                            info=i18n("使用无参考文本模式时建议使用微调的GPT，听不清参考音频说的啥(不晓得写啥)可以开，开启后无视填写的参考文本。"),
                            value=False, interactive=True, show_label=True)
                
            with gr.Column():
                prompt_text = gr.Textbox(label=i18n("参考音频的文本"), value="", lines=2)
                asr_btn = gr.Button(value='auto sound recognition')
                asr_btn.click(speech2text, inputs=[inp_ref], outputs=[prompt_text])
                # inp_ref.change(fn=asr, inputs=inp_ref, outputs=prompt_text)
                
        with gr.Tab("TTS"):
            with gr.Row():
                with gr.Column():
                    with gr.Row():
                        text_language = gr.Dropdown(
                            label=i18n("需要合成的语种"), 
                            choices=[i18n("中文"), i18n("英文"), i18n("日文"), i18n("中英混合"), i18n("日英混合"), i18n("多语种混合")], 
                            value=i18n("中英混合")
                        )
                        how_to_cut = gr.Dropdown(
                            label=i18n("怎么切"),
                            choices=[i18n("不切"), i18n("凑四句一切"), i18n("凑50字一切"), i18n("按中文句号。切"), i18n("按英文句号.切"), i18n("按标点符号切"), ],
                            value=i18n("按中文句号。切"),
                        )
                    gr.Markdown("gpt采样参数(无参考文本时不要太低)：")
                    top_k = gr.Slider(minimum=1,maximum=100,step=1,label=i18n("top_k"),value=5,interactive=True)
                    top_p = gr.Slider(minimum=0,maximum=1,step=0.05,label=i18n("top_p"),value=0.95,interactive=True)
                    temperature = gr.Slider(minimum=0,maximum=1,step=0.05,label=i18n("temperature"),value=0.95,interactive=True)
                        
                with gr.Column():
                    text = gr.Textbox(label=i18n("需要合成的文本"), value="", lines=3, placeholder="Text for audio synthesis")
                    inference_button = gr.Button(i18n("合成语音"), variant="primary")
                    output = gr.Audio(label=i18n("输出的语音"))
                    with gr.Accordion(label='examples', open=False):
                        gr.Examples([test_text], text)
        inference_button.click(
            get_tts_wav,
            [inp_ref, prompt_text, prompt_language, text, text_language, how_to_cut, top_k, top_p, temperature, ref_text_free],
            [output],
        )

    with gr.Tab(label=i18n("模型切换")):
        with gr.Row():
            GPT_dropdown = gr.Dropdown(label=i18n("GPT模型列表"), choices=sorted(GPT_names, key=custom_sort_key), value=gpt_path, interactive=True)
            SoVITS_dropdown = gr.Dropdown(label=i18n("SoVITS模型列表"), choices=sorted(SoVITS_names, key=custom_sort_key), value=sovits_path, interactive=True)
            refresh_button = gr.Button(value=refresh_symbol)
            refresh_button.click(fn=change_choices, inputs=[], outputs=[SoVITS_dropdown, GPT_dropdown])

            SoVITS_dropdown.change(change_sovits_weights, [SoVITS_dropdown], [])
            GPT_dropdown.change(change_gpt_weights, [GPT_dropdown], [])


    with gr.Accordion(label="Tool", open=False):
        gr.Markdown(value=i18n("文本切分工具。太长的文本合成出来效果不一定好，所以太长建议先切。合成会根据文本的换行分开合成再拼起来。"))
        with gr.Row():
            with gr.Column():
                text_inp = gr.Textbox(label=i18n("需要合成的切分前文本"), value="")
                with gr.Row():
                    button1 = gr.Button(i18n("凑四句一切"), variant="secondary")
                    button2 = gr.Button(i18n("凑50字一切"), variant="secondary")
                    button3 = gr.Button(i18n("按中文句号。切"), variant="secondary")
                    button4 = gr.Button(i18n("按英文句号.切"), variant="secondary")
                    button5 = gr.Button(i18n("按标点符号切"), variant="secondary")
            text_opt = gr.Textbox(label=i18n("切分后文本"), value="", lines=4)
            button1.click(cut1, [text_inp], [text_opt])
            button2.click(cut2, [text_inp], [text_opt])
            button3.click(cut3, [text_inp], [text_opt])
            button4.click(cut4, [text_inp], [text_opt])
            button5.click(cut5, [text_inp], [text_opt])
        gr.Markdown(value=i18n("后续将支持转音素、手工修改音素、语音合成分步执行。"))

# queue 表示可以给多个user使用，让他们排队
app.queue(concurrency_count=511, max_size=1022).launch(
    server_name="0.0.0.0",
    inbrowser=True,  # 打开浏览器
    share=is_share,
    server_port=infer_tts_port,
    quiet=True,
)
