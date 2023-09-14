#version 300 es
precision mediump float;

in float iTarget;
in vec2 iIndices;

layout(location=0) out vec4 beginIndexColor;
layout(location=1) out vec4 endIndexColor;

void main(){
    if(iTarget == 0.0){
        beginIndexColor = vec4(iIndices, 0.0, 0.0);
    }
    if(iTarget == 1.0){
        endIndexColor = vec4(iIndices, 0.0, 0.0);
    }
}