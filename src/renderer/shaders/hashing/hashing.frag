#version 300 es
precision mediump float;

uniform sampler2D positionTexRead;
uniform vec2 texDimensions;
uniform float gridSize;
uniform float hashSize;

layout(location=0) out vec4 FragColor;

#define P1 842167
#define P2 881477
#define P3 742219

vec3 pos2grid(vec3 v){
    vec3 result = floor(v / gridSize);
    result.x = result.x<0.0 ? -result.x*2.0 : result.x*2.0+1.0;
    result.y = result.y<0.0 ? -result.y*2.0 : result.y*2.0+1.0;
    result.z = result.z<0.0 ? -result.z*2.0 : result.z*2.0+1.0;
    return result;
}

float grid2hash(vec3 grid){
    return mod(float((int(grid.x)*P1) ^ (int(grid.y)*P2) ^ (int(grid.z)*P3)), hashSize);
}

float pos2hash(vec3 pos){
    return grid2hash(pos2grid(pos));
}

void main(){

    vec2 texCoord =  gl_FragCoord.xy / texDimensions;
    vec3 position = texture(positionTexRead, texCoord).xyz;

    float hash = pos2hash(position);

    float index = texDimensions.x*gl_FragCoord.y + gl_FragCoord.x;
    FragColor = vec4(index, hash, 0, 1.0);
}