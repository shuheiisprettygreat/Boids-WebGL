#version 300 es
precision mediump float;

in vec2 iIndices;
in float iHash;

out vec4 FragColor;

void main(){
    FragColor = vec4(iIndices, iHash, 0.5);
}