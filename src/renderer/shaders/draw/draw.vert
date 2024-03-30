#version 300 es
precision mediump float;

layout(location=0) in vec3 aPos;
layout(location=1) in vec3 aNormal;
layout(location=2) in vec2 aTex;
layout(location=3) in vec3 instancePosition;
layout(location=4) in vec3 instanceVelocity;
layout(location=5) in vec3 instanceBitangent;

uniform mat4 model;
uniform mat4 view;
uniform mat4 proj;

out vec3 iPos;
out vec3 iNormal;
out vec2 iTex;

#define PI 3.1415926

mat4 euler2rotMat(float y, float p){
    float cy = cos(y), sy = sin(y);
    float cp = cos(p), sp = sin(p);
    mat4 result = mat4(
        cy,    0, -sy, 0,
        sy*sp, cp, cy*sp, 0,
        sy*cp, -sp, cy*cp, 0,
        0, 0, 0, 1
    );
    return result;
}

void main() {

        // rotation of heading
    vec3 vel = normalize(instanceVelocity);
    float yaw = atan(vel.x, vel.z);
    float pitch = -asin(vel.y);
    mat4 rot = euler2rotMat(yaw, pitch);

    mat4 model_ = model * rot;

    // scale and rotation are given with model matrix
    vec4 pos = model_ * vec4(aPos*0.5, 1.0);

    // world position are given as instancePosition;
    pos.xyz += instancePosition * 0.01;

    gl_Position = proj * view * pos;
    iPos = pos.xyz;
    iNormal = normalize(mat3(model_) * aNormal);
    iTex = aTex;
}