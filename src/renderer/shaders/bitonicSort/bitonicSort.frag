#version 300 es
precision mediump float;

uniform sampler2D positionTexRead;
uniform vec2 texDimentions;
uniform float gridSize;
uniform float hashSize;

layout(location=0) out vec4 FragColor;

#define P1 842167.0
#define P2 881477.0
#define P3 742219.0

vec3 pos2grid(vec3 v){
    vec3 result = floor(v / gridSize);
    return result;
}

float grid2hash(vec3 grid){
    return abs(mod(float(int(grid.x*P1) ^ int(grid.y*P2) ^ int(grid.z*P3)), hashSize));
}

float pos2hash(vec3 pos){
    return grid2hash(pos2grid(pos));
}

void main(){

    vec2 texCoord =  gl_FragCoord.xy / texDimentions;
    vec3 position = texture(positionTexRead, texCoord).xyz;

    float hash = pos2hash(position);

    float index = texDimentions.x*gl_FragCoord.y + gl_FragCoord.x;
    FragColor = vec4(index, hash, 0, 1.0);
}