"""
Module 1 — Video Ingestion & Adaptive Keyframe Extraction
Streams UAV drone video, extracts metadata, and performs quality-adaptive keyframe sampling.
"""

import os
from typing import Dict, Any, List, Generator, Tuple
import numpy as np
import cv2
from backend.pipeline.quality import FrameQualityAnalyzer

class VideoIngestor:
    """Handles video streaming, metadata extraction, and adaptive keyframe selection."""
    
    def __init__(self, quality_analyzer: FrameQualityAnalyzer = None):
        self.quality_analyzer = quality_analyzer or FrameQualityAnalyzer()

    def get_video_metadata(self, video_path: str) -> Dict[str, Any]:
        """Extracts FPS, resolution, frame count, duration, and file size without loading video to RAM."""
        if not os.path.exists(video_path):
            raise FileNotFoundError(f"Video file not found at: {video_path}")
            
        cap = cv2.VideoCapture(video_path)
        if not cap.isOpened():
            raise ValueError(f"Failed to open video file: {video_path}")
            
        fps = float(cap.get(cv2.CAP_PROP_FPS)) or 30.0
        width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
        height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
        total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
        duration = total_frames / fps if fps > 0 else 0.0
        file_size_mb = os.path.getsize(video_path) / (1024 * 1024)
        cap.release()
        
        return {
            "video_path": video_path,
            "fps": fps,
            "width": width,
            "height": height,
            "total_frames": total_frames,
            "duration_sec": float(np.round(duration, 2)),
            "file_size_mb": float(np.round(file_size_mb, 2))
        }

    def generate_thumbnails(self, video_path: str, num_thumbnails: int = 5, thumb_width: int = 320) -> List[np.ndarray]:
        """Generates representative thumbnail images across the video timeline."""
        meta = self.get_video_metadata(video_path)
        total = meta["total_frames"]
        indices = np.linspace(0, max(0, total - 1), num_thumbnails, dtype=int)
        
        cap = cv2.VideoCapture(video_path)
        thumbnails = []
        for idx in indices:
            cap.set(cv2.CAP_PROP_POS_FRAMES, idx)
            ret, frame = cap.read()
            if ret and frame is not None:
                h, w = frame.shape[:2]
                aspect = h / w
                thumb_h = int(thumb_width * aspect)
                thumb = cv2.resize(frame, (thumb_width, thumb_h))
                thumbnails.append(thumb)
        cap.release()
        return thumbnails

    def extract_keyframes(
        self, 
        video_path: str, 
        target_fps: float = 5.0,
        max_keyframes: int = 200
    ) -> Tuple[List[Dict[str, Any]], List[np.ndarray]]:
        """
        Adaptively samples keyframes from drone video.
        Filters out blurred/poor quality frames and returns keyframe metadata list + keyframe image list.
        """
        meta = self.get_video_metadata(video_path)
        src_fps = meta["fps"]
        
        # Step interval based on target keyframe rate
        frame_interval = max(1, int(round(src_fps / target_fps)))
        
        cap = cv2.VideoCapture(video_path)
        keyframe_meta = []
        keyframe_images = []
        
        frame_idx = 0
        keyframe_count = 0
        
        while cap.isOpened() and keyframe_count < max_keyframes:
            ret, frame = cap.read()
            if not ret or frame is None:
                break
                
            if frame_idx % frame_interval == 0:
                timestamp = frame_idx / src_fps
                quality_res = self.quality_analyzer.analyze_frame(frame, frame_id=frame_idx, timestamp=timestamp)
                
                if quality_res["accepted"]:
                    quality_res["keyframe_index"] = keyframe_count
                    keyframe_meta.append(quality_res)
                    keyframe_images.append(frame.copy())
                    keyframe_count += 1
                    
            frame_idx += 1
            
        cap.release()
        
        print(f"[Ingestion] Extracted {len(keyframe_images)} high-quality keyframes from {meta['total_frames']} total frames.")
        return keyframe_meta, keyframe_images
