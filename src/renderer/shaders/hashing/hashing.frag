#version 300 es
precision mediump float;

uniform sampler2D positionTexRead;
uniform ivec2 texDimensions;
uniform float gridSize;
uniform int hashSize;

layout(location=0) out vec4 FragColor;

#define P1 842167
#define P2 881477
#define P3 742219

ivec3 pos2grid(vec3 v){
    ivec3 result = ivec3(floor(v / gridSize));
    result.x = result.x<0 ? -result.x*2 : result.x*2+1;
    result.y = result.y<0 ? -result.y*2 : result.y*2+1;
    result.z = result.z<0 ? -result.z*2 : result.z*2+1;
    return result;
}

int grid2hash(ivec3 grid){
    return (grid.x*P1) ^ (grid.y*P2) ^ (grid.z*P3) % hashSize;
}

int pos2hash(vec3 pos){
    return grid2hash(pos2grid(pos));
}

void main(){

    ivec2 ifrag = ivec2(gl_FragCoord.xy);
    vec3 position = texelFetch(positionTexRead, ifrag, 0).xyz;

    int hash = pos2hash(position);

    int index = texDimensions.x*ifrag.y + ifrag.x;
    FragColor = vec4(index, hash, 0, 1.0);
}