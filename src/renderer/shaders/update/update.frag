#version 300 es
precision mediump float;

uniform sampler2D positionTexRead;
uniform sampler2D velocityTexRead;
uniform vec2 texDimentions;
uniform float deltaTime;

in float iId;

out vec4 FragColor;

vec4 getValueFromTexture(sampler2D tex, vec2 dim, float id){
    float x = mod(id, dim.x);
    float y = floor(id / dim.x);
    vec2 texCoord = (vec2(x,y) + 0.5) / dim;
    return texture(tex, texCoord);
}

void main(){
    vec3 position = getValueFromTexture(positionTexRead, texDimentions, iId).xyz;
    FragColor = vec4(1,1,1,1);
}