"""
AEROVISTA Demo Data Generator
Generates a realistic synthetic single-pass UAV flight video, synchronized GPS CSV, 
camera intrinsics JSON, and IMU metadata for instant out-of-the-box demo execution and testing.
"""

import os
import math
import json
import numpy as np
import cv2

def generate_uav_mission_data(
    output_dir: str = "data/input",
    duration_sec: float = 10.0,
    fps: int = 30,
    width: int = 1280,
    height: int = 720,
    start_lat: float = 37.7749,
    start_lon: float = -122.4194,
    start_alt: float = 50.0,
    flight_speed: float = 5.0 # meters per second
):
    os.makedirs(output_dir, exist_ok=True)
    
    total_frames = int(duration_sec * fps)
    video_path = os.path.join(output_dir, "sample_mission.mp4")
    gps_path = os.path.join(output_dir, "gps.csv")
    camera_path = os.path.join(output_dir, "camera.json")
    imu_path = os.path.join(output_dir, "imu.csv")
    
    # 1. Camera Intrinsics
    fx = width * 0.95
    fy = width * 0.95
    cx = width / 2.0
    cy = height / 2.0
    
    intrinsics = {
        "fx": fx,
        "fy": fy,
        "cx": cx,
        "cy": cy,
        "k1": 0.0,
        "k2": 0.0,
        "p1": 0.0,
        "p2": 0.0,
        "width": width,
        "height": height,
        "estimated": False
    }
    with open(camera_path, "w") as f:
        json.dump(intrinsics, f, indent=2)
        
    print(f"[Demo Data] Saved camera intrinsics: {camera_path}")
    
    # 2. Synthetic 3D World Features
    # Create 3D points representing buildings, roads, vegetation, and terrain
    np.random.seed(42)
    num_points = 600
    
    # Grid of terrain points
    grid_x = np.linspace(-40, 40, 30)
    grid_y = np.linspace(0, 100, 30)
    gx, gy = np.meshgrid(grid_x, grid_y)
    gz = np.sin(gx * 0.1) * np.cos(gy * 0.1) * 1.5 # terrain undulation
    
    terrain_pts = np.vstack([gx.ravel(), gy.ravel(), gz.ravel()]).T
    
    # Building 1: Box at (x=-10..-2, y=30..42, z=0..12)
    b1_x = np.random.uniform(-10, -2, 100)
    b1_y = np.random.uniform(30, 42, 100)
    b1_z = np.random.uniform(0, 12, 100)
    b1_pts = np.vstack([b1_x, b1_y, b1_z]).T
    
    # Building 2: Box at (x=5..15, y=50..65, z=0..18)
    b2_x = np.random.uniform(5, 15, 100)
    b2_y = np.random.uniform(50, 65, 100)
    b2_z = np.random.uniform(0, 18, 100)
    b2_pts = np.vstack([b2_x, b2_y, b2_z]).T
    
    world_points = np.vstack([terrain_pts, b1_pts, b2_pts])
    
    # Colors for points (BGR)
    colors = []
    for p in world_points:
        z = p[2]
        if z > 10:
            colors.append((200, 80, 80)) # Building top (Blueish)
        elif z > 2:
            colors.append((120, 120, 120)) # Building wall
        else:
            colors.append((50, 160, 50)) # Green terrain
    colors = np.array(colors, dtype=np.uint8)

    # 3. Video Writer & Metadata Loggers
    fourcc = cv2.VideoWriter_fourcc(*'mp4v')
    out = cv2.VideoWriter(video_path, fourcc, fps, (width, height))
    
    gps_lines = ["timestamp,latitude,longitude,altitude,accuracy,roll,pitch,yaw\n"]
    imu_lines = ["timestamp,ax,ay,az,gx,gy,gz\n"]
    
    # Flight path: Drone moves forward along Y axis (+Y), constant Z height=25m, slight downward tilt (pitch=-35 deg)
    dt = 1.0 / fps
    
    for i in range(total_frames):
        t = i * dt
        # Drone position in world space
        cam_x = 0.5 * math.sin(t * 0.5) # slight horizontal sway
        cam_y = t * flight_speed # forward motion
        cam_z = start_alt / 2.0 # 25 meters altitude
        
        # Orientations in degrees
        roll = 1.0 * math.sin(t * 1.5)
        pitch = -35.0 + 0.5 * math.cos(t * 1.0)
        yaw = 0.0 + 0.5 * math.sin(t * 0.8)
        
        # GPS conversion (approx 1 deg lat = 111,000m, 1 deg lon = 111,000 * cos(lat) m)
        meters_per_deg_lat = 111000.0
        meters_per_deg_lon = 111000.0 * math.cos(math.radians(start_lat))
        
        curr_lat = start_lat + (cam_y / meters_per_deg_lat)
        curr_lon = start_lon + (cam_x / meters_per_deg_lon)
        curr_alt = start_alt + (cam_z - 25.0) + (np.random.normal(0, 0.15)) # slight noise
        
        gps_lines.append(f"{t:.3f},{curr_lat:.8f},{curr_lon:.8f},{curr_alt:.3f},0.8,{roll:.2f},{pitch:.2f},{yaw:.2f}\n")
        imu_lines.append(f"{t:.3f},0.01,0.02,9.81,0.001,0.002,0.000\n")
        
        # Render Frame via Pinhole Camera Projection
        frame = np.full((height, width, 3), (40, 40, 40), dtype=np.uint8) # Dark neutral background
        
        # Draw ground grid lines / horizon texture
        cv2.line(frame, (0, int(height*0.3)), (width, int(height*0.3)), (70, 70, 70), 2)
        
        # Camera rotation matrix R (Yaw -> Pitch -> Roll)
        r_rad = math.radians(roll)
        p_rad = math.radians(pitch)
        y_rad = math.radians(yaw)
        
        Rx = np.array([[1, 0, 0], [0, math.cos(p_rad), -math.sin(p_rad)], [0, math.sin(p_rad), math.cos(p_rad)]])
        Ry = np.array([[math.cos(r_rad), 0, math.sin(r_rad)], [0, 1, 0], [-math.sin(r_rad), 0, math.cos(r_rad)]])
        Rz = np.array([[math.cos(y_rad), -math.sin(y_rad), 0], [math.sin(y_rad), math.cos(y_rad), 0], [0, 0, 1]])
        
        # World to Camera transformation
        # Standard OpenCV cam: +Z forward, +X right, +Y down
        # World frame: +Y forward, +X right, +Z up
        R_world_to_cam = np.array([[1, 0, 0], [0, 0, -1], [0, 1, 0]]) @ Rz @ Ry @ Rx
        
        C = np.array([cam_x, cam_y, cam_z])
        
        # Project world points
        pts_cam = (world_points - C) @ R_world_to_cam.T
        
        # Perspective projection
        valid_mask = pts_cam[:, 2] > 0.5
        pts_valid = pts_cam[valid_mask]
        colors_valid = colors[valid_mask]
        
        u = (fx * pts_valid[:, 0] / pts_valid[:, 2] + cx).astype(int)
        v = (fy * pts_valid[:, 1] / pts_valid[:, 2] + cy).astype(int)
        
        for px, py, col, p_cam in zip(u, v, colors_valid, pts_valid):
            if 0 <= px < width and 0 <= py < height:
                radius = max(2, int(15.0 / p_cam[2]))
                cv2.circle(frame, (px, py), radius, (int(col[0]), int(col[1]), int(col[2])), -1)
                
        # Draw frame telemetry overlay for realism
        cv2.putText(frame, f"AEROVISTA synthetic uav mission - frame {i:04d} - t={t:.2f}s", (20, 30), 
                    cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 255, 200), 2)
        cv2.putText(frame, f"LAT: {curr_lat:.6f} LON: {curr_lon:.6f} ALT: {curr_alt:.1f}m", (20, 60), 
                    cv2.FONT_HERSHEY_SIMPLEX, 0.5, (255, 255, 255), 1)
        
        out.write(frame)
        
    out.release()
    
    with open(gps_path, "w") as f:
        f.writelines(gps_lines)
        
    with open(imu_path, "w") as f:
        f.writelines(imu_lines)
        
    print(f"[Demo Data] Successfully generated sample mission:")
    print(f"  Video: {video_path} ({total_frames} frames, {width}x{height} @ {fps}fps)")
    print(f"  GPS:   {gps_path} ({len(gps_lines)-1} rows)")
    print(f"  IMU:   {imu_path}")

if __name__ == "__main__":
    generate_uav_mission_data()
