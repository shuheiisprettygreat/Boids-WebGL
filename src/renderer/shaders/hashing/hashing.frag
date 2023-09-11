#version 300 es
precision mediump float;

uniform sampler2D positionTexRead;
uniform vec2 texDimentions;
uniform float gridSize;
uniform float hashSize;

layout(location=0) out vec4 FragColor;

#define P1 269923
#define P2 959779
#define P3 261601

vec3 pos2grid(vec3 v){
    vec3 result = floor(v) / gridSize;
    v.x = v.x<0.0 ? -v.x*2.0+1.0 : v.x*2.0+0.0;
    v.y = v.y<0.0 ? -v.y*2.0+1.0 : v.y*2.0+0.0;
    v.z = v.z<0.0 ? -v.z*2.0+1.0 : v.z*2.0+0.0;
    return result;
}

float grid2hash(vec3 grid){
    return mod(float((int(grid.x)*P1) ^ (int(grid.y)*P2) ^ (int(grid.z)*P3)), hashSize);
}

float pos2hash(vec3 pos){
    return grid2hash(pos2grid(pos));
}

void main(){

    vec2 texCoord =  gl_FragCoord.xy / texDimentions;
    vec3 position = texture(positionTexRead, texCoord).xyz;

    float hash = pos2hash(position);

    FragColor = vec4(vec3(hash/hashSize), 1.0f);
}