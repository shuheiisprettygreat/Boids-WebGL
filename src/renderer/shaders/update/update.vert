#version 300 es
precision mediump float;

layout(location=0) in vec2 aPos;
layout(location=1) in vec2 aTex;

void main(){
    gl_Position = vec4(aPos, 0, 1.0);    
}