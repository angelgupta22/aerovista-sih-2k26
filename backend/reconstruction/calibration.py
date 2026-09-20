"""
Module 3 — Camera Calibration & Intrinsics Management
Manages camera intrinsics (fx, fy, cx, cy, distortion coefficients) with automatic defaults,
OpenCV/ROS YAML parser, and format conversion utilities.
"""

import os
import json
import re
from typing import Dict, Any, Optional, Tuple, List
import numpy as np
import yaml

class CameraCalibration:
    """Manages pinhole camera intrinsics, distortion parameters, and YAML/JSON calibration parsers."""
    
    def __init__(
        self,
        fx: float,
        fy: float,
        cx: float,
        cy: float,
        width: int,
        height: int,
        k1: float = 0.0,
        k2: float = 0.0,
        p1: float = 0.0,
        p2: float = 0.0,
        k3: float = 0.0,
        camera_name: str = "Generic Camera",
        distortion_model: str = "plumb_bob",
        estimated: bool = True
    ):
        self.fx = float(fx)
        self.fy = float(fy)
        self.cx = float(cx)
        self.cy = float(cy)
        self.width = int(width)
        self.height = int(height)
        self.k1 = float(k1)
        self.k2 = float(k2)
        self.p1 = float(p1)
        self.p2 = float(p2)
        self.k3 = float(k3)
        self.camera_name = str(camera_name)
        self.distortion_model = str(distortion_model)
        self.estimated = bool(estimated)

    @classmethod
    def estimate_defaults(cls, width: int, height: int) -> 'CameraCalibration':
        """
        Estimates default camera intrinsics based on image resolution.
        Assumes standard ~60-70 degree field of view (focal length approx 1.2 * max(W, H)).
        """
        focal = 1.2 * max(width, height)
        cx = width / 2.0
        cy = height / 2.0
        return cls(
            fx=focal,
            fy=focal,
            cx=cx,
            cy=cy,
            width=width,
            height=height,
            estimated=True
        )

    @classmethod
    def from_yaml_string(cls, yaml_content: str, width_fallback: Optional[int] = None, height_fallback: Optional[int] = None) -> 'CameraCalibration':
        """
        Parses OpenCV / ROS style YAML camera calibration file content.
        Extracts camera_name, image_width, image_height, distortion_model, 3x3 camera matrix, and distortion coefficients.
        Validates matrix validity and image dimensions.
        """
        if not yaml_content or not yaml_content.strip():
            raise ValueError("Camera calibration YAML content is empty.")

        # Sanitize OpenCV YAML directive header (%YAML:1.0 -> comment out)
        lines = []
        for line in yaml_content.splitlines():
            if line.strip().startswith("%YAML"):
                continue
            lines.append(line)
        sanitized_yaml = "\n".join(lines)

        try:
            parsed = yaml.safe_load(sanitized_yaml)
        except Exception as e:
            raise ValueError(f"Malformed YAML format: {e}")

        if not isinstance(parsed, dict):
            raise ValueError("YAML content must be a dictionary object.")

        camera_name = parsed.get("camera_name", "Unknown Camera")
        distortion_model = parsed.get("distortion_model", "plumb_bob")

        # 1. Image Dimensions
        width = parsed.get("image_width") or parsed.get("width") or width_fallback
        height = parsed.get("image_height") or parsed.get("height") or height_fallback

        if width is None or height is None or int(width) <= 0 or int(height) <= 0:
            raise ValueError("Missing or invalid image dimensions (image_width and image_height must be positive integers).")

        width = int(width)
        height = int(height)

        # 2. Extract Camera Matrix (fx, fy, cx, cy)
        fx, fy, cx, cy = None, None, None, None

        if "camera_matrix" in parsed:
            cam_mat = parsed["camera_matrix"]
            data = cam_mat.get("data") if isinstance(cam_mat, dict) else cam_mat
            if isinstance(data, list) and len(data) >= 9:
                fx = float(data[0])
                cx = float(data[2])
                fy = float(data[4])
                cy = float(data[5])

        if fx is None or fy is None or cx is None or cy is None:
            # Fallback to top-level key search
            fx = float(parsed.get("fx", 0.0))
            fy = float(parsed.get("fy", 0.0))
            cx = float(parsed.get("cx", 0.0))
            cy = float(parsed.get("cy", 0.0))

        if fx <= 0 or fy <= 0 or cx <= 0 or cy <= 0:
            raise ValueError(f"Invalid camera matrix intrinsics (fx={fx}, fy={fy}, cx={cx}, cy={cy}). Focal length and principal point must be positive numbers.")

        # 3. Extract Distortion Coefficients (k1, k2, p1, p2, k3)
        k1, k2, p1, p2, k3 = 0.0, 0.0, 0.0, 0.0, 0.0
        if "distortion_coefficients" in parsed:
            dist_mat = parsed["distortion_coefficients"]
            ddata = dist_mat.get("data") if isinstance(dist_mat, dict) else dist_mat
            if isinstance(ddata, list) and len(ddata) >= 4:
                k1 = float(ddata[0])
                k2 = float(ddata[1])
                p1 = float(ddata[2])
                p2 = float(ddata[3])
                if len(ddata) >= 5:
                    k3 = float(ddata[4])
        else:
            k1 = float(parsed.get("k1", 0.0))
            k2 = float(parsed.get("k2", 0.0))
            p1 = float(parsed.get("p1", 0.0))
            p2 = float(parsed.get("p2", 0.0))
            k3 = float(parsed.get("k3", 0.0))

        return cls(
            fx=fx,
            fy=fy,
            cx=cx,
            cy=cy,
            width=width,
            height=height,
            k1=k1,
            k2=k2,
            p1=p1,
            p2=p2,
            k3=k3,
            camera_name=camera_name,
            distortion_model=distortion_model,
            estimated=False
        )

    @classmethod
    def from_yaml_file(cls, yaml_path: str, width_fallback: Optional[int] = None, height_fallback: Optional[int] = None) -> 'CameraCalibration':
        """Loads camera calibration from a YAML file."""
        if not os.path.exists(yaml_path):
            raise FileNotFoundError(f"Camera calibration file not found: {yaml_path}")
        with open(yaml_path, "r", encoding="utf-8") as f:
            content = f.read()
        return cls.from_yaml_string(content, width_fallback=width_fallback, height_fallback=height_fallback)

    @classmethod
    def from_file_or_estimate(cls, camera_path: Optional[str], width: int, height: int) -> 'CameraCalibration':
        """Loads calibration from YAML or JSON file if valid, otherwise estimates defaults."""
        if camera_path and os.path.exists(camera_path):
            ext = os.path.splitext(camera_path)[1].lower()
            try:
                if ext in ['.yaml', '.yml']:
                    return cls.from_yaml_file(camera_path, width_fallback=width, height_fallback=height)
                else:
                    with open(camera_path, "r", encoding="utf-8") as f:
                        data = json.load(f)
                    return cls(
                        fx=float(data.get("fx", width * 1.2)),
                        fy=float(data.get("fy", width * 1.2)),
                        cx=float(data.get("cx", width / 2.0)),
                        cy=float(data.get("cy", height / 2.0)),
                        width=int(data.get("width", width)),
                        height=int(data.get("height", height)),
                        k1=float(data.get("k1", 0.0)),
                        k2=float(data.get("k2", 0.0)),
                        p1=float(data.get("p1", 0.0)),
                        p2=float(data.get("p2", 0.0)),
                        k3=float(data.get("k3", 0.0)),
                        camera_name=str(data.get("camera_name", "Generic Camera")),
                        distortion_model=str(data.get("distortion_model", "plumb_bob")),
                        estimated=bool(data.get("estimated", False))
                    )
            except Exception as e:
                print(f"[Calibration] Warning: Failed to parse {camera_path} ({e}). Falling back to estimation.")
                
        return cls.estimate_defaults(width, height)

    def get_intrinsic_matrix(self) -> np.ndarray:
        """Returns 3x3 camera matrix K."""
        return np.array([
            [self.fx, 0.0, self.cx],
            [0.0, self.fy, self.cy],
            [0.0, 0.0, 1.0]
        ], dtype=np.float64)

    def get_distortion_coeffs(self) -> np.ndarray:
        """Returns 1x5 distortion coefficients vector [k1, k2, p1, p2, k3]."""
        return np.array([self.k1, self.k2, self.p1, self.p2, self.k3], dtype=np.float64)

    def to_dict(self) -> Dict[str, Any]:
        """Converts to standard camera.json structure expected by pipeline."""
        return {
            "fx": self.fx,
            "fy": self.fy,
            "cx": self.cx,
            "cy": self.cy,
            "width": self.width,
            "height": self.height,
            "estimated": self.estimated
        }

    def to_summary_dict(self) -> Dict[str, Any]:
        """Returns detailed calibration summary dictionary for UI display."""
        return {
            "camera_name": self.camera_name,
            "image_width": self.width,
            "image_height": self.height,
            "distortion_model": self.distortion_model,
            "fx": self.fx,
            "fy": self.fy,
            "cx": self.cx,
            "cy": self.cy,
            "distortion": {
                "k1": self.k1,
                "k2": self.k2,
                "p1": self.p1,
                "p2": self.p2,
                "k3": self.k3
            },
            "converted_json_structure": self.to_dict()
        }
