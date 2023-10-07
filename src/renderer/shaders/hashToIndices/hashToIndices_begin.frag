#version 300 es
precision mediump float;

in float iTarget;
in vec2 iIndices;

out vec4 FragColor;

void main(){
    if(iTarget == 0.0){
        FragColor = vec4(iIndices, 0.0, 1.0);
    } else {
        discard;
    }
}