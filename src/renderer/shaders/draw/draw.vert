#version 300 es
precision mediump float;

layout(location=0) in vec3 aPos;
layout(location=1) in vec3 aNormal;
layout(location=2) in vec2 aTex;
layout(location=3) in vec3 instancePosition;

uniform mat4 model;
uniform mat4 view;
uniform mat4 proj;

out vec3 iNormal;
out vec2 iTex;

void main() {
    // scale and rotation are given with model matrix
    vec4 pos = model * vec4(aPos, 1.0);
    // world position are given as instancePosition;
    pos.xyz += instancePosition;

    gl_Position = proj * view * pos;
    iNormal = aNormal;
    iTex = aTex;
}