"""Load verified, offline model artifacts once in each Celery child process."""
import hashlib
import json
import sys
from functools import lru_cache

from ..config import get_settings


def verify_manifest():
    root = get_settings().models_dir.resolve()
    manifest_path = root / "manifest.json"
    if not manifest_path.is_file():
        raise RuntimeError("Models are not installed; run the model download script")
    raw = manifest_path.read_bytes()
    manifest = json.loads(raw)
    for name, digest in manifest["files"].items():
        path = (root / name).resolve()
        if root not in path.parents or not path.is_file():
            raise RuntimeError("Model manifest contains a missing or invalid file")
        with path.open("rb") as stream:
            if hashlib.file_digest(stream, "sha256").hexdigest() != digest:
                raise RuntimeError("Model integrity verification failed")
    return hashlib.sha256(raw).hexdigest()


class Models:
    def __init__(self):
        import torch
        import torchvision.transforms.functional as functional
        # BasicSR 1.4.2 imports the torchvision module removed in torchvision 0.17.
        sys.modules.setdefault("torchvision.transforms.functional_tensor", functional)
        from basicsr.archs.rrdbnet_arch import RRDBNet
        from gfpgan.archs.gfpganv1_clean_arch import GFPGANv1Clean
        from facexlib.utils.face_restoration_helper import FaceRestoreHelper
        from transformers import AutoModelForImageSegmentation
        s = get_settings()
        self.fingerprint = verify_manifest()
        self.device = torch.device(s.device)
        if self.device.type == "cuda" and not torch.cuda.is_available():
            raise RuntimeError("CUDA GPU is required by MEDIA_DEVICE")
        self.half = self.device.type == "cuda"
        self.sr = {}
        for name, blocks, filename in (("natural", 23, "RealESRGAN_x4plus.pth"),
                                       ("art", 6, "RealESRGAN_x4plus_anime_6B.pth")):
            net = RRDBNet(num_in_ch=3, num_out_ch=3, num_feat=64, num_block=blocks, num_grow_ch=32, scale=4)
            weights = torch.load(s.models_dir / filename, map_location="cpu", weights_only=True)
            net.load_state_dict(weights.get("params_ema", weights.get("params", weights)), strict=True)
            net.eval().to(self.device)
            if self.half:
                net.half()
            self.sr[name] = net
        self.segmentation = {}
        for quality, folder in (("fast", "birefnet-lite"), ("balanced", "birefnet"), ("ultra_hd", "birefnet-hr")):
            net = AutoModelForImageSegmentation.from_pretrained(str(s.models_dir / folder),
                trust_remote_code=True, local_files_only=True, use_safetensors=True)
            net.eval().to(self.device)
            if self.half:
                net.half()
            self.segmentation[quality] = net
        self.face = GFPGANv1Clean(out_size=512, num_style_feat=512, channel_multiplier=2,
            decoder_load_path=None, fix_decoder=False, num_mlp=8, input_is_latent=True,
            different_w=True, narrow=1, sft_half=True)
        weights = torch.load(s.models_dir / "GFPGANv1.4.pth", map_location="cpu", weights_only=True)
        self.face.load_state_dict(weights.get("params_ema", weights.get("params", weights)), strict=True)
        self.face.eval().to(self.device)
        self.face_helper = FaceRestoreHelper(1, face_size=512, crop_ratio=(1, 1),
            det_model="retinaface_resnet50", save_ext="png", use_parse=True,
            device=self.device, model_rootpath=str(s.models_dir / "faces"))

    def warmup(self):
        import numpy as np
        from PIL import Image
        from .upscale import infer_tile
        from .background import predict_mask
        for name in self.sr:
            infer_tile(self, name, np.zeros((32, 32, 3), np.uint8))
        for quality in self.segmentation:
            predict_mask(self, Image.new("RGB", (32, 32)), quality, working_size=256)
        import torch
        with torch.inference_mode():
            self.face(torch.zeros((1, 3, 512, 512), device=self.device), return_rgb=False, weight=.5)


@lru_cache(maxsize=1)
def get_models():
    return Models()
