import { mat4 } from "gl-matrix";
import { vec3 } from "gl-matrix";

class Camera{

    constructor (x, y, z, ux, uy, uz, yaw, pitch, fov){
        this.pos = vec3.fromValues(x,y,z);
        this.worldUp = vec3.fromValues(ux,uy,uz);
        this.yaw = yaw;
        this.pitch = pitch;
        this.fov = fov;

        this.updateCameraVector();

        this.sensitivity = 0.1;
        this.zoomSensitivity = 0.05;
    }

    getViewMatrix(){
        this.updateCameraVector();

        const target = vec3.create();
        vec3.add(target, this.pos, this.front);

        const result = mat4.create();
        mat4.lookAt(result, this.pos, target, this.worldUp);

        return result;
    }

    updateCameraVector() {
        this.front = vec3.create();
        const y = this.yaw * Math.PI / 180.0;
        const p = this.pitch * Math.PI / 180.0;
        
        this.front[0] = Math.cos(y) * Math.cos(p);
        this.front[1] = Math.sin(p);
        this.front[2] = Math.sin(y) * Math.cos(p);

        this.right = vec3.create();
        vec3.cross(this.right, this.front, this.worldUp)
        vec3.normalize(this.right, this.right);

        this.up = vec3.create();
        vec3.cross(this.up, this.right, this.front)
        vec3.normalize(this.up, this.up);
    }

    // Update yaw and pitch to look given point.
    lookAt(x, y, z){

        let dir = vec3.create();
        vec3.sub(dir, vec3.fromValues(x, y, z), this.pos);
        vec3.normalize(dir, dir);

        this.yaw = Math.atan2(dir[2], dir[0]) * 180 / Math.PI;
        this.pitch = Math.asin(dir[1]) * 180 / Math.PI;
    }

    processMovement(direction, deltatime){
        const d = 10 * deltatime/1000.0;
        if(direction == 0){
            vec3.scaleAndAdd(this.pos, this.pos, this.right, -d);
        }
        if(direction == 1){
            vec3.scaleAndAdd(this.pos, this.pos, this.right, d);
        }
        if(direction == 2){
            vec3.scaleAndAdd(this.pos, this.pos, this.front, d);
        }
        if(direction == 3){
            vec3.scaleAndAdd(this.pos, this.pos, this.front, -d);
        }
    }

    processRotation(dx, dy){
        this.yaw += dx * this.sensitivity;
        this.pitch -= dy * this.sensitivity;

        this.yaw = ((this.yaw % 360) + 360.0) % 360.0;
        const e = 0.1;
        this.pitch = Math.min(90-e, Math.max(-90+e, this.pitch));
    }

    processZoom(amt){
        this.fov += amt * this.zoomSensitivity;
    }
}

export {Camera}