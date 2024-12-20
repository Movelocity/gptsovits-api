import os
import numpy as np
import torch
from torch import nn
from feature_extractor import cnhubert
from transformers import AutoModelForMaskedLM, AutoTokenizer

from common import timer
from common import DictToAttrRecursive
from module.models import SynthesizerTrn
from AR.models.t2s_lightning_module import Text2SemanticLightningModule
from text import cleaned_text_to_sequence
from text.cleaner import clean_text
from my_utils import get_spec

# import soundfile as sf
import LangSegment
import librosa
from i18n.i18n import I18nAuto
i18n = I18nAuto()

from common import shared

ssl_model: nn.Module = None
tokenizer = None
bert_model: nn.Module = None


# 0.3 秒空白语音，用于衔接
# zero_wav: np.ndarray = None

"""
ssl 和 bert 模型可以多个 speaker 公用
"""
def get_ssl_model(hubert_path: str=None, force_reload=False) -> cnhubert.CNHubert:
    global ssl_model
    
    if ssl_model is None:
        if hubert_path is None:
            hubert_path = shared.cnhubert_base_path

        with timer("CNHubert加载"):
            ssl_model = cnhubert.CNHubert(hubert_path).eval()
            if shared.is_half:
                ssl_model = ssl_model.half()
            ssl_model = ssl_model.to(shared.device)
    return ssl_model

def get_bert_model(bert_path: str=None, force_reload=False) -> AutoModelForMaskedLM:
    global bert_model
    
    if bert_model is None:
        if bert_path is None:
            bert_path = shared.bert_path
        with timer("BERT模型加载"):
            bert_model = AutoModelForMaskedLM.from_pretrained(bert_path).eval()
            if shared.is_half:
                bert_model = bert_model.half()
            bert_model = bert_model.to(shared.device)
    return bert_model

############ bert processing ##################

def get_tokenizer(bert_path:str=None) -> AutoTokenizer:
    global tokenizer
    if bert_path is None:
        bert_path = shared.bert_path
    if tokenizer is None:
        tokenizer = AutoTokenizer.from_pretrained(bert_path)
    return tokenizer

def get_bert_feature(text:str, word2ph: list) -> torch.Tensor:
    assert len(word2ph) == len(text)

    tokenizer = get_tokenizer()
    bert_model = get_bert_model()  # chinese-roberta-wwm-ext-large
    with torch.no_grad():
        inputs = tokenizer(text, return_tensors="pt")
        for i in inputs:
            inputs[i] = inputs[i].to(shared.device)
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
    language=language.replace("all_", "")
    if language == "zh":
        bert = get_bert_feature(norm_text, word2ph).to(shared.device, dtype=torch.float16 if shared.is_half else torch.float32)
    else:
        bert = torch.zeros(
            (1024, len(phones)),
            dtype=torch.float16 if shared.is_half == True else torch.float32,
            device=shared.device
        )
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
            bert = get_bert_feature(norm_text, word2ph).to(shared.device, dtype=torch.float16 if shared.is_half else torch.float32)
        else:
            bert = torch.zeros(
                (1024, len(phones)),
                dtype=torch.float16 if shared.is_half == True else torch.float32,
            ).to(shared.device)
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
        bert = torch.cat(bert_list, dim=1)
        phones = sum(phones_list, [])
        norm_text = ''.join(norm_text_list)

    return phones, bert, norm_text

import re
from cuts import splits, cuts, merge_short_text_in_array
def split_text(text, cut_name="none"):
    pattern = "[" + "".join(re.escape(sep) for sep in splits) + "]"
    first_word = re.split(pattern, text.strip())[0].strip()
    
    text_language = "zh"  # TODO: not hard coding
    if text[0] not in splits and len(first_word) < 4: 
        text = ("。" if text_language != "en" else ".") + text

    print("target text: ", text)
    cut_fn = cuts.get(cut_name)
    text = cut_fn(text)

    while "\n\n" in text:
        text = text.replace("\n\n", "\n")
    texts = text.split("\n")
    texts = merge_short_text_in_array(texts, threshold=5)
    print(f"segments: {texts}")
    return texts

from common import support_langs

def validate_lang(lang):
    if lang not in support_langs:
        print(f"lang {lang} not in {support_langs}")
        return False
    return True

def process_prompt_text(prompt_text, prompt_language, ref_free):
    if not ref_free:
        prompt_text = prompt_text.strip("\n")
        if prompt_text[-1] not in splits:
            prompt_text += "。" if prompt_language != "en" else "."
        # print("prompt_text: ", prompt_text)
        prompt_phonemes, bert1, norm_text1 = get_phones_and_bert(prompt_text, prompt_language)
        return prompt_phonemes, bert1
    return None, None

def process_runtime_text(text, text_language, ref_free, bert1, prompt_phonemes):
    if (text[-1] not in splits):
        text += "。" if text_language != "en" else "."
    # print(i18n("实际输入的目标文本(每句):"), text)

    phonemes, bert2, norm_text2 = get_phones_and_bert(text, text_language)
    # print(i18n("前端处理后的文本(每句):"), norm_text2)
    if not ref_free:
        bert_feat = torch.cat([bert1, bert2], 1)
        all_phoneme_ids = torch.LongTensor(prompt_phonemes + phonemes).to(shared.device).unsqueeze(0)
    else:
        bert_feat = bert2
        all_phoneme_ids = torch.LongTensor(phonemes).to(shared.device).unsqueeze(0)

    bert_feat = bert_feat.to(shared.device).unsqueeze(0)
    phonemes_torch = torch.LongTensor(phonemes).to(shared.device).unsqueeze(0)

    return bert_feat, all_phoneme_ids, phonemes_torch


import logging

logger = logging.getLogger(__name__)

from common import load_yaml
class Speaker:
    def __init__(self, model_version):
        self.name = model_version

        self.hps: DictToAttrRecursive = None
        self.vq_model: SynthesizerTrn = None
        self.t2s_model: Text2SemanticLightningModule = None

        self.validated = False
        self.validate()

        self.zero_wave: np.ndarray = None
        self.device = shared.device
        self.is_half = shared.is_half

    def validate(self):
        speaker_path = os.path.join(shared.model_root, shared.model_config['speakers'], self.name)
        if os.path.exists(speaker_path):
            logger.info("validate: "+speaker_path)
            
            speaker_config = load_yaml(os.path.join(speaker_path, "config.yaml"))

            self.gpt_path = os.path.join(speaker_path, speaker_config['gpt'])
            self.sovits_path = os.path.join(speaker_path, speaker_config['sovits'])

            self.validated = True
            logger.info(self.gpt_path)
            logger.info(self.sovits_path)
        
    def load_sovits_model(self, force_reload=False) -> SynthesizerTrn:
        # global vq_model, hps

        if self.hps is None or force_reload:
            dict_s2 = torch.load(self.sovits_path, map_location="cpu")
            self.hps = DictToAttrRecursive(dict_s2["config"])
            self.hps.model.semantic_frame_rate = "25hz"
    
        if self.vq_model is None or force_reload:
            with timer("VITS2 加载"):
                self.vq_model = SynthesizerTrn(
                    self.hps.data.filter_length // 2 + 1,
                    self.hps.train.segment_size // self.hps.data.hop_length,
                    n_speakers=self.hps.data.n_speakers,
                    **self.hps.model
                ).eval()
                # if ("pretrained" not in self.sovits_path):
                #     del vq_model.enc_q
                dict_s2 = torch.load(self.sovits_path, map_location="cpu")
                self.vq_model.load_state_dict(dict_s2["weight"], strict=False)

                if shared.is_half == True:
                    self.vq_model = self.vq_model.half()
                self.vq_model.to(shared.device)

    def load_t2s_model(self, force_reload=False):
        if self.t2s_model is None or force_reload:
            dict_s1 = torch.load(self.gpt_path, map_location="cpu")
            config = dict_s1["config"]
            shared.max_sec = config["data"]["max_sec"]
            logger.info(f"max_sec: {shared.max_sec}")
            with timer("GPT 加载"):
                self.t2s_model = Text2SemanticLightningModule(config, "****", is_train=False).eval()
                self.t2s_model.load_state_dict(dict_s1["weight"])
                if shared.is_half == True:
                    self.t2s_model = self.t2s_model.half()
                self.t2s_model = self.t2s_model.to(shared.device)
            total = sum([param.nelement() for param in self.t2s_model.parameters()])
            logger.info("GPT 模块参数量: %.2fM" % (total / 1e6))


    def get_prompt(self, wav_path:str) -> torch.Tensor:
        """获取参考语音的语义信息 return Tensor dtype=torch.int64"""

        with torch.no_grad(): 
            fps = 16000
            wav16k, sr = librosa.load(wav_path, sr=fps)
            if (wav16k.shape[0] > fps*10 or wav16k.shape[0] < fps*3):
                raise ValueError(i18n("参考音频在3~10秒范围外，请更换！"))
            use_dtype = torch.float16 if self.is_half == True else torch.float32
            wav16k = torch.from_numpy(wav16k).to(device=self.device, dtype=use_dtype)

            self.zero_wav = np.zeros(
                int(self.hps.data.sampling_rate * 0.3),  # 0.3 秒
                dtype=np.float16 if self.is_half == True else np.float32,
            )
            zero_wav_torch = torch.from_numpy(self.zero_wav).to(device=self.device, dtype=use_dtype)
            wav16k = torch.cat([wav16k, zero_wav_torch])
            ssl_content = get_ssl_model().model(wav16k.unsqueeze(0))["last_hidden_state"].transpose(1, 2)  # .float()
            # print(f"> ssl_content.shape: {ssl_content.shape}") # batch, dim, seq_len # [1, 768, 280]

            codes = self.vq_model.extract_latent(ssl_content)
            prompt_semantic = codes[0, 0].unsqueeze(0).to(self.device)
            # print(f"> voice prompt shape: {prompt_semantic.shape}")  # [1, 140]
        return prompt_semantic

    def get_ref_spec(self, ref_wav_path) -> torch.Tensor:
        refer_spec = get_spec(self.hps.data, ref_wav_path)  # .to(device)
        if self.is_half == True:
            refer_spec = refer_spec.half()
        return refer_spec.to(self.device)
    
    def get_tts_wav(
        self,
        ref_wav_path:str, 
        prompt_text:str, 
        prompt_language:str, 
        text:str, 
        text_language:str, 
        cut_name="none", 
        top_k=20, 
        top_p=0.6, 
        temperature=0.6, 
        ref_free=False,
    ):
        self.load_sovits_model()
        self.load_t2s_model()
        if prompt_text is None or len(prompt_text) == 0:
            ref_free = True

        if not validate_lang(prompt_language): return
        if not validate_lang(text_language): return

        prompt_phonemes, bert1 = process_prompt_text(prompt_text, prompt_language, ref_free)

        voice_prompt = self.get_prompt(ref_wav_path)
        refer_spec = self.get_ref_spec(ref_wav_path)

        texts = split_text(text, cut_name)
        audio_opt = []
        for text in texts:
            # 解决输入目标文本的空行导致报错的问题
            if (len(text.strip()) == 0): continue

            bert_feat, all_phoneme_ids, phonemes_torch = process_runtime_text(
                text, text_language, ref_free, bert1, prompt_phonemes
            )

            all_phoneme_len = torch.tensor([all_phoneme_ids.shape[-1]]).to(shared.device)

            with torch.no_grad():
                pred_semantic, idx = self.t2s_model.model.infer_panel(
                    x=all_phoneme_ids,
                    x_lens=all_phoneme_len,
                    prompts=None if ref_free else voice_prompt,
                    bert_feature=bert_feat,
                    top_k=top_k,
                    top_p=top_p,
                    temperature=temperature,
                    early_stop_num=shared.hz * shared.max_sec
                )
            # print(pred_semantic.shape,idx)
            pred_semantic = pred_semantic[:, -idx:].unsqueeze(0)  # .unsqueeze(0)  # mq 要多 unsqueeze 一次
            
            # audio = vq_model.decode(pred_semantic, all_phoneme_ids, refer).detach().cpu().numpy()[0, 0]
            audio = (
                self.vq_model.decode(
                    codes=pred_semantic, 
                    text=phonemes_torch, 
                    refer_spec=refer_spec
                ).detach().cpu().numpy()[0, 0]
            )  ### 试试重建不带上 prompt 的部分
            
            max_audio=np.abs(audio).max()  # 简单防止16bit爆音
            if max_audio > 1: audio /= max_audio
            audio_opt.append(audio)
            audio_opt.append(self.zero_wav)

        # 采样率, 16bit 音频
        # return hps.data.sampling_rate, (np.concatenate(audio_opt, 0) * 32768).astype(np.int16)
        audio_16bit = (np.concatenate(audio_opt, 0) * 32768).astype(np.int16)
        return audio_16bit, self.hps.data.sampling_rate
        # sf.write('TEMP/tmp.mp3', audio_16bit, hps.data.sampling_rate)
        # return os.path.join(os.getcwd(), 'TEMP', 'tmp.mp3')