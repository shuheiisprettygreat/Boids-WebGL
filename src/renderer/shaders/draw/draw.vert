#version 300 es
precision mediump float;

layout(location=0) in vec3 aPos;
layout(location=1) in vec3 aNormal;
layout(location=2) in vec2 aTex;
layout(location=3) in vec4 instancePositionAndBanking;
layout(location=4) in vec3 instanceVelocity;

uniform mat4 model;
uniform mat4 view;
uniform mat4 proj;

uniform int vertexReflection;
uniform mat4 reflectionMatrix;

out vec3 iPos;
out vec3 iNormal;
out vec2 iTex;
out vec3 iVel;
out float iReflection; 

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

vec3 rotateZ(vec3 v, float a){
    float ca = cos(a);
    float sa = sin(a);
    return vec3(v.x*ca-v.y*sa, v.x*sa+v.y*ca, v.z);
}

vec3 rotateAroundAxis(vec3 axis, vec3 v, float angle){
    float ca = cos(angle);
    return ca*v + (1.0-ca)*dot(v,axis)*axis + sin(angle)*cross(axis, v);
}

void main() {
    // rotation of heading
    vec3 vel = normalize(instanceVelocity);
    float roll = instancePositionAndBanking.w;
    float yaw = atan(vel.x, vel.z);
    float pitch = -asin(vel.y); 
    mat4 yawPitchRot = euler2rotMat(yaw, pitch);

    mat4 model_ = model * yawPitchRot;

    // scale and rotation are given with model matrix
    vec4 pos = model_ * vec4(rotateZ(aPos, roll)*0.4, 1.0);

    // world position are given as instancePosition;
    pos.xyz += instancePositionAndBanking.xyz * 0.075;
    // pos.xyz += instancePositionAndBanking.xyz * 0.02;
    // vec3 testPosition = rotateAroundAxis(normalize(vec3(1, 0, 1)), instancePositionAndBanking.xyz, t);
    // pos.xyz += testPosition * 0.01;

    pos = vertexReflection==0 ? pos : reflectionMatrix*pos;

    gl_Position = proj * view * pos;
    iPos = pos.xyz;
    iNormal = normalize(mat3(model_) * aNormal);
    iTex = aTex;
    iVel = vel;
    iReflection = float(vertexReflection);
}