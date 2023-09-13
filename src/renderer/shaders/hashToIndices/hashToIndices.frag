#version 300 es
precision mediump float;

in vec2 iIndices;

out vec4 FragColor;

void main(){
    FragColor = vec4(iIndices, 0.0, 0.0);
}