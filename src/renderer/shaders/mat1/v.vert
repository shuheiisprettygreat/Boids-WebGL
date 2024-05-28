#version 300 es
precision mediump float;

layout(location=0) in vec3 aPos;
layout(location=1) in vec3 aNormal;
layout(location=2) in vec2 aTex;

uniform mat4 model;
uniform mat4 view;
uniform mat4 proj;

out vec3 iNormal;
out vec2 iTex;

void main() {
    gl_Position = proj * view * model * vec4(aPos, 1.0);
    iNormal = aNormal;
    iTex = aTex;
}