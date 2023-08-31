#version 300 es
precision mediump float;

layout(location=0) in vec3 aPos;
layout(location=1) in vec3 aNormal;
layout(location=2) in vec2 aTex;

uniform mat4 view;
uniform mat4 proj;

out vec3 iTex;

void main() {
    vec4 pos = proj * view * vec4(aPos, 1.0);
    gl_Position = pos.xyww;
    iTex = aPos;
}