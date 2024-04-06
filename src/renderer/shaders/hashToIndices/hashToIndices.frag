#version 300 es
precision mediump float;

flat in ivec2 iIndices;

out vec4 FragColor;

void main(){

    uint u1 = uint(iIndices.x);
    uint u2 = uint(iIndices.y);
    
    vec2 f1v = unpackHalf2x16(u1);
    vec2 f2v = unpackHalf2x16(u2);

    f1v *= int(u1)==0 ? 0.0 : 1.0;
    f2v *= int(u2)==0 ? 0.0 : 1.0;

    FragColor = vec4(f1v, f2v);
}