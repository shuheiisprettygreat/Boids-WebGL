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

ivec3 grid2positiveGrid(ivec3 grid){
    grid.x = grid.x<0 ? -grid.x*2-1 : grid.x*2;
    grid.y = grid.y<0 ? -grid.y*2-1 : grid.y*2;
    grid.z = grid.z<0 ? -grid.z*2-1 : grid.z*2;
    return grid;
}

ivec3 pos2grid(vec3 v){
    return ivec3(floor(v / gridSize));
}

ivec3 pos2positiveGrid(vec3 v){
    return grid2positiveGrid(pos2grid(v));
}

int grid2hash(ivec3 grid){
    return ((grid.x*P1) ^ (grid.y*P2) ^ (grid.z*P3)) % hashSize;
}

int pos2hash(vec3 pos){
    return grid2hash(pos2positiveGrid(pos));
}

void main(){

    ivec2 ifrag = ivec2(gl_FragCoord.xy);
    vec3 position = texelFetch(positionTexRead, ifrag, 0).xyz;

    int hash = pos2hash(position);

    int index = texDimensions.x*ifrag.y + ifrag.x;
    FragColor = vec4(index, hash, 0, 1.0);
}