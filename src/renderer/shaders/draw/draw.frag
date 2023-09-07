#version 300 es
precision mediump float;

in vec3 iNormal;
in vec2 iTex;

out vec4 FragColor;

void main() {
    FragColor = vec4(0.8, 0.4, 0.4, 1);
}